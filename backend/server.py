from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from pydantic import BaseModel, Field

# ---------- Setup ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Sens IT Inventory")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("sens")


# ---------- Helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, username: str) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_date(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s).date()
    except Exception:
        return None


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------- Models ----------
class LoginIn(BaseModel):
    username: str
    password: str


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


class CategoryIn(BaseModel):
    name: str
    prefix: str


class CategoryOut(CategoryIn):
    id: str


class EmployeeIn(BaseModel):
    name: str
    department: Optional[str] = ""
    manager: Optional[str] = ""


class EmployeeOut(EmployeeIn):
    id: str


class LocationIn(BaseModel):
    name: str


class LocationOut(LocationIn):
    id: str


class AssetIn(BaseModel):
    # Identification
    asset_id: Optional[str] = None  # auto-generate if empty
    serial_number: Optional[str] = ""
    category_id: str
    manufacturer: Optional[str] = ""
    model: Optional[str] = ""
    # Assignment
    assigned_to_id: Optional[str] = None
    department: Optional[str] = ""
    location_id: Optional[str] = None
    status: Literal["In Use", "In Storage", "Loaned", "Under Repair", "Retired"] = "In Storage"
    assigned_date: Optional[str] = None
    # Technical (laptop/desktop only)
    operating_system: Optional[str] = ""
    cpu: Optional[str] = ""
    ram: Optional[str] = ""
    storage: Optional[str] = ""
    mac_address: Optional[str] = ""
    # Financial
    supplier: Optional[str] = ""
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    invoice_number: Optional[str] = ""
    warranty_expiration_date: Optional[str] = None
    # Lifecycle
    condition: Optional[Literal["New", "Good", "Fair", "Poor", "Damaged"]] = "Good"
    last_audit_date: Optional[str] = None
    expected_replacement_date: Optional[str] = None
    # Other
    notes: Optional[str] = ""


class MaintenanceIn(BaseModel):
    asset_id: str
    date: str
    type: Literal["Repair", "Service", "Inspection"]
    notes: Optional[str] = ""


# ---------- Auth Endpoints ----------
@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    user = await db.users.find_one({"username": body.username})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token(user["id"], user["username"])
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=12 * 3600,
        path="/",
    )
    return {"id": user["id"], "username": user["username"], "name": user.get("name", user["username"])}


@api.post("/auth/logout")
async def logout(response: Response, _=Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {"id": user["id"], "username": user["username"], "name": user.get("name", user["username"])}


@api.post("/auth/change-password")
async def change_password(body: ChangePasswordIn, user=Depends(get_current_user)):
    full = await db.users.find_one({"id": user["id"]})
    if not full or not verify_password(body.current_password, full["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(body.new_password) < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters")
    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"password_hash": hash_password(body.new_password)}}
    )
    return {"ok": True}


# ---------- Categories ----------
@api.get("/categories", response_model=List[CategoryOut])
async def list_categories(_=Depends(get_current_user)):
    docs = await db.categories.find({}, {"_id": 0}).sort("name", 1).to_list(200)
    return docs


@api.post("/categories", response_model=CategoryOut)
async def create_category(body: CategoryIn, _=Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), "name": body.name, "prefix": body.prefix.upper()}
    await db.categories.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api.put("/categories/{cid}", response_model=CategoryOut)
async def update_category(cid: str, body: CategoryIn, _=Depends(get_current_user)):
    await db.categories.update_one(
        {"id": cid}, {"$set": {"name": body.name, "prefix": body.prefix.upper()}}
    )
    doc = await db.categories.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


@api.delete("/categories/{cid}")
async def delete_category(cid: str, _=Depends(get_current_user)):
    in_use = await db.assets.count_documents({"category_id": cid})
    if in_use:
        raise HTTPException(400, f"Category in use by {in_use} assets")
    await db.categories.delete_one({"id": cid})
    return {"ok": True}


# ---------- Employees ----------
@api.get("/employees", response_model=List[EmployeeOut])
async def list_employees(_=Depends(get_current_user)):
    return await db.employees.find({}, {"_id": 0}).sort("name", 1).to_list(500)


@api.post("/employees", response_model=EmployeeOut)
async def create_employee(body: EmployeeIn, _=Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), **body.model_dump()}
    await db.employees.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api.put("/employees/{eid}", response_model=EmployeeOut)
async def update_employee(eid: str, body: EmployeeIn, _=Depends(get_current_user)):
    await db.employees.update_one({"id": eid}, {"$set": body.model_dump()})
    doc = await db.employees.find_one({"id": eid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


@api.delete("/employees/{eid}")
async def delete_employee(eid: str, _=Depends(get_current_user)):
    await db.assets.update_many({"assigned_to_id": eid}, {"$set": {"assigned_to_id": None}})
    await db.employees.delete_one({"id": eid})
    return {"ok": True}


@api.post("/employees/import")
async def import_employees(file: UploadFile = File(...), _=Depends(get_current_user)):
    import csv, io
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "File must be a .csv")
    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    # normalise headers to lowercase
    if not reader.fieldnames:
        raise HTTPException(400, "CSV has no header row")
    header_map = {h: (h or "").strip().lower() for h in reader.fieldnames}
    if "name" not in header_map.values():
        raise HTTPException(400, "CSV must contain a 'name' column")

    existing_names = {
        e["name"].strip().lower()
        for e in await db.employees.find({}, {"_id": 0, "name": 1}).to_list(10000)
    }
    created = 0
    skipped_duplicates = 0
    skipped_blank = 0
    errors: List[str] = []
    to_insert = []
    seen_in_file = set()
    for i, row in enumerate(reader, start=2):
        normalised = {header_map.get(k, k.lower()): (v or "").strip() for k, v in row.items()}
        name = normalised.get("name", "")
        if not name:
            skipped_blank += 1
            continue
        key = name.lower()
        if key in existing_names or key in seen_in_file:
            skipped_duplicates += 1
            continue
        seen_in_file.add(key)
        to_insert.append(
            {
                "id": str(uuid.uuid4()),
                "name": name,
                "department": normalised.get("department", ""),
                "manager": normalised.get("manager", ""),
            }
        )
        if len(to_insert) > 5000:
            errors.append(f"File too large (row {i}); import limited to 5000 new rows per file")
            break

    if to_insert:
        await db.employees.insert_many(to_insert)
        created = len(to_insert)

    return {
        "created": created,
        "skipped_duplicates": skipped_duplicates,
        "skipped_blank": skipped_blank,
        "errors": errors,
    }


# ---------- Locations ----------
@api.get("/locations", response_model=List[LocationOut])
async def list_locations(_=Depends(get_current_user)):
    return await db.locations.find({}, {"_id": 0}).sort("name", 1).to_list(500)


@api.post("/locations", response_model=LocationOut)
async def create_location(body: LocationIn, _=Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), **body.model_dump()}
    await db.locations.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api.put("/locations/{lid}", response_model=LocationOut)
async def update_location(lid: str, body: LocationIn, _=Depends(get_current_user)):
    await db.locations.update_one({"id": lid}, {"$set": body.model_dump()})
    doc = await db.locations.find_one({"id": lid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


@api.delete("/locations/{lid}")
async def delete_location(lid: str, _=Depends(get_current_user)):
    await db.assets.update_many({"location_id": lid}, {"$set": {"location_id": None}})
    await db.locations.delete_one({"id": lid})
    return {"ok": True}


# ---------- Assets ----------
async def next_asset_id(prefix: str) -> str:
    doc = await db.counters.find_one_and_update(
        {"prefix": prefix},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return f"{prefix}-{doc['seq']:04d}"


@api.get("/assets")
async def list_assets(
    status: Optional[str] = None,
    category_id: Optional[str] = None,
    department: Optional[str] = None,
    warranty_expiring: Optional[bool] = None,
    q: Optional[str] = None,
    _=Depends(get_current_user),
):
    query = {}
    if status:
        query["status"] = status
    if category_id:
        query["category_id"] = category_id
    if department:
        query["department"] = department
    if warranty_expiring:
        today = datetime.now(timezone.utc).date().isoformat()
        in_30 = (datetime.now(timezone.utc).date() + timedelta(days=30)).isoformat()
        query["warranty_expiration_date"] = {"$gte": today, "$lte": in_30}
    if q:
        query["$or"] = [
            {"asset_id": {"$regex": q, "$options": "i"}},
            {"serial_number": {"$regex": q, "$options": "i"}},
            {"manufacturer": {"$regex": q, "$options": "i"}},
            {"model": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.assets.find(query, {"_id": 0}).sort("asset_id", 1).to_list(2000)
    return docs


@api.get("/assets/{aid}")
async def get_asset(aid: str, _=Depends(get_current_user)):
    doc = await db.assets.find_one({"id": aid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Asset not found")
    return doc


@api.post("/assets")
async def create_asset(body: AssetIn, _=Depends(get_current_user)):
    cat = await db.categories.find_one({"id": body.category_id}, {"_id": 0})
    if not cat:
        raise HTTPException(400, "Invalid category")

    data = body.model_dump()
    asset_id = (data.get("asset_id") or "").strip()
    if not asset_id:
        asset_id = await next_asset_id(cat["prefix"])
    else:
        existing = await db.assets.find_one({"asset_id": asset_id})
        if existing:
            raise HTTPException(400, f"Asset ID '{asset_id}' already exists")

    doc = {
        "id": str(uuid.uuid4()),
        **data,
        "asset_id": asset_id,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.assets.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api.put("/assets/{aid}")
async def update_asset(aid: str, body: AssetIn, _=Depends(get_current_user)):
    existing = await db.assets.find_one({"id": aid})
    if not existing:
        raise HTTPException(404, "Asset not found")
    data = body.model_dump()
    new_asset_id = (data.get("asset_id") or "").strip()
    if new_asset_id and new_asset_id != existing.get("asset_id"):
        dup = await db.assets.find_one({"asset_id": new_asset_id, "id": {"$ne": aid}})
        if dup:
            raise HTTPException(400, f"Asset ID '{new_asset_id}' already exists")
    else:
        data["asset_id"] = existing["asset_id"]
    data["updated_at"] = now_iso()
    await db.assets.update_one({"id": aid}, {"$set": data})
    doc = await db.assets.find_one({"id": aid}, {"_id": 0})
    return doc


@api.delete("/assets/{aid}")
async def delete_asset(aid: str, _=Depends(get_current_user)):
    await db.maintenance.delete_many({"asset_id": aid})
    await db.assets.delete_one({"id": aid})
    return {"ok": True}


# ---------- Maintenance ----------
@api.get("/maintenance")
async def list_maintenance(asset_id: Optional[str] = None, _=Depends(get_current_user)):
    q = {}
    if asset_id:
        q["asset_id"] = asset_id
    return await db.maintenance.find(q, {"_id": 0}).sort("date", -1).to_list(1000)


@api.post("/maintenance")
async def create_maintenance(body: MaintenanceIn, _=Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": now_iso()}
    await db.maintenance.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api.put("/maintenance/{mid}")
async def update_maintenance(mid: str, body: MaintenanceIn, _=Depends(get_current_user)):
    await db.maintenance.update_one({"id": mid}, {"$set": body.model_dump()})
    doc = await db.maintenance.find_one({"id": mid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


@api.delete("/maintenance/{mid}")
async def delete_maintenance(mid: str, _=Depends(get_current_user)):
    await db.maintenance.delete_one({"id": mid})
    return {"ok": True}


# ---------- Dashboard ----------
@api.get("/dashboard/stats")
async def dashboard_stats(_=Depends(get_current_user)):
    total = await db.assets.count_documents({})
    in_use = await db.assets.count_documents({"status": "In Use"})
    in_storage = await db.assets.count_documents({"status": "In Storage"})
    under_repair = await db.assets.count_documents({"status": "Under Repair"})
    loaned = await db.assets.count_documents({"status": "Loaned"})
    retired = await db.assets.count_documents({"status": "Retired"})
    today = datetime.now(timezone.utc).date().isoformat()
    in_30 = (datetime.now(timezone.utc).date() + timedelta(days=30)).isoformat()
    warranty_expiring = await db.assets.count_documents(
        {"warranty_expiration_date": {"$gte": today, "$lte": in_30}}
    )
    # assets by department
    pipeline = [
        {"$match": {"department": {"$ne": ""}}},
        {"$group": {"_id": "$department", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    by_dept = []
    async for row in db.assets.aggregate(pipeline):
        by_dept.append({"department": row["_id"] or "Unassigned", "count": row["count"]})
    # assets by category
    pipeline2 = [
        {"$group": {"_id": "$category_id", "count": {"$sum": 1}}},
    ]
    cat_map = {c["id"]: c["name"] async for c in db.categories.find({}, {"_id": 0})}
    by_cat = []
    async for row in db.assets.aggregate(pipeline2):
        by_cat.append({"category": cat_map.get(row["_id"], "Unknown"), "count": row["count"]})
    return {
        "total": total,
        "in_use": in_use,
        "in_storage": in_storage,
        "under_repair": under_repair,
        "loaned": loaned,
        "retired": retired,
        "warranty_expiring": warranty_expiring,
        "by_department": by_dept,
        "by_category": by_cat,
    }


# ---------- Startup ----------
DEFAULT_CATEGORIES = [
    ("Laptop", "LAP"),
    ("Desktop", "DES"),
    ("Monitor", "MON"),
    ("Printer", "PRN"),
    ("Mobile", "MOB"),
    ("Headphones", "HDP"),
    ("Keyboard/Mouse", "KBM"),
    ("Docking", "DCK"),
]


async def seed_categories():
    for name, prefix in DEFAULT_CATEGORIES:
        existing = await db.categories.find_one({"name": name})
        if not existing:
            await db.categories.insert_one(
                {"id": str(uuid.uuid4()), "name": name, "prefix": prefix}
            )


async def seed_admins():
    admins = [
        (os.environ.get("ADMIN1_USERNAME", "Admin"), os.environ.get("ADMIN1_PASSWORD", "nothing")),
        (os.environ.get("ADMIN2_USERNAME", "Admin2"), os.environ.get("ADMIN2_PASSWORD", "nothing2")),
    ]
    for username, pw in admins:
        existing = await db.users.find_one({"username": username})
        if not existing:
            await db.users.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "username": username,
                    "name": username,
                    "password_hash": hash_password(pw),
                    "created_at": now_iso(),
                }
            )


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("username", unique=True)
    await db.assets.create_index("asset_id", unique=True)
    await db.categories.create_index("name", unique=True)
    await seed_categories()
    await seed_admins()
    logger.info("Sens IT Inventory ready.")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ---------- Wire up ----------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
