"""Backend tests for Sens IT Inventory.

Covers: auth (login/me/logout/change-password), categories seed, CRUD for
employees, locations, assets (auto-id + duplicate rejection + update preservation),
asset filters, maintenance CRUD, dashboard stats.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hardware-inventory-22.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USER = "Admin"
ADMIN_PASS = "nothing"
ADMIN2_USER = "Admin2"
ADMIN2_PASS = "nothing2"


# ------------- Fixtures -------------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=20)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def categories(session):
    r = session.get(f"{API}/categories", timeout=20)
    assert r.status_code == 200
    return r.json()


# ------------- Auth -------------
class TestAuth:
    def test_login_admin1(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["username"] == ADMIN_USER
        assert "access_token" in s.cookies.get_dict() or any(
            c.name == "access_token" for c in s.cookies
        )

    def test_login_admin2(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"username": ADMIN2_USER, "password": ADMIN2_PASS}, timeout=20)
        assert r.status_code == 200
        assert r.json()["username"] == ADMIN2_USER

    def test_login_wrong_password(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"username": ADMIN_USER, "password": "wrong"}, timeout=20)
        assert r.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 401

    def test_me_with_cookie(self, session):
        r = session.get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 200
        assert r.json()["username"] == ADMIN_USER

    def test_change_password_wrong_current(self, session):
        r = session.post(
            f"{API}/auth/change-password",
            json={"current_password": "wrongpw", "new_password": "whatever"},
            timeout=20,
        )
        assert r.status_code == 400

    def test_change_password_round_trip(self):
        # Use Admin2, change password then change back
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        assert s.post(f"{API}/auth/login", json={"username": ADMIN2_USER, "password": ADMIN2_PASS}).status_code == 200
        new_pw = "newpass123"
        r = s.post(f"{API}/auth/change-password", json={"current_password": ADMIN2_PASS, "new_password": new_pw})
        assert r.status_code == 200
        # Re-login with new pw
        s2 = requests.Session()
        assert s2.post(f"{API}/auth/login", json={"username": ADMIN2_USER, "password": new_pw}).status_code == 200
        # Revert password
        r = s2.post(f"{API}/auth/change-password", json={"current_password": new_pw, "new_password": ADMIN2_PASS})
        assert r.status_code == 200

    def test_logout_clears_cookie(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # Subsequent me should be 401
        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 401


# ------------- Categories seed -------------
class TestCategories:
    def test_eight_seeded(self, categories):
        names = {c["name"] for c in categories}
        expected = {"Laptop", "Desktop", "Monitor", "Printer", "Mobile", "Headphones", "Keyboard/Mouse", "Docking"}
        assert expected.issubset(names), f"Missing: {expected - names}"
        # Each has prefix
        for c in categories:
            assert c.get("prefix")
        # Laptop prefix LAP
        lap = next(c for c in categories if c["name"] == "Laptop")
        assert lap["prefix"] == "LAP"


# ------------- Employees CRUD -------------
class TestEmployees:
    def test_crud(self, session):
        payload = {"name": f"TEST_Emp_{uuid.uuid4().hex[:6]}", "department": "IT", "manager": "Mgr"}
        r = session.post(f"{API}/employees", json=payload)
        assert r.status_code == 200
        emp = r.json()
        assert emp["name"] == payload["name"]
        eid = emp["id"]

        # GET list includes it
        r = session.get(f"{API}/employees")
        assert r.status_code == 200
        assert any(e["id"] == eid for e in r.json())

        # Update
        r = session.put(f"{API}/employees/{eid}", json={**payload, "department": "HR"})
        assert r.status_code == 200
        assert r.json()["department"] == "HR"

        # Delete
        r = session.delete(f"{API}/employees/{eid}")
        assert r.status_code == 200


# ------------- Locations CRUD -------------
class TestLocations:
    def test_crud(self, session):
        payload = {"name": f"TEST_Loc_{uuid.uuid4().hex[:6]}"}
        r = session.post(f"{API}/locations", json=payload)
        assert r.status_code == 200
        lid = r.json()["id"]

        r = session.put(f"{API}/locations/{lid}", json={"name": payload["name"] + "_upd"})
        assert r.status_code == 200
        assert r.json()["name"].endswith("_upd")

        r = session.delete(f"{API}/locations/{lid}")
        assert r.status_code == 200


# ------------- Assets -------------
class TestAssets:
    def test_create_auto_id_and_duplicate(self, session, categories):
        laptop = next(c for c in categories if c["name"] == "Laptop")
        r1 = session.post(f"{API}/assets", json={"category_id": laptop["id"], "status": "In Use", "department": "TESTDEPT"})
        assert r1.status_code == 200, r1.text
        a1 = r1.json()
        assert a1["asset_id"].startswith("LAP-")
        first_seq = int(a1["asset_id"].split("-")[1])

        r2 = session.post(f"{API}/assets", json={"category_id": laptop["id"], "status": "In Use"})
        assert r2.status_code == 200
        a2 = r2.json()
        second_seq = int(a2["asset_id"].split("-")[1])
        assert second_seq == first_seq + 1, f"Expected incrementing seq, got {first_seq} then {second_seq}"

        # Duplicate
        r3 = session.post(f"{API}/assets", json={"category_id": laptop["id"], "asset_id": a1["asset_id"]})
        assert r3.status_code == 400

        # Update preserves asset_id when blank
        r4 = session.put(f"{API}/assets/{a1['id']}", json={"category_id": laptop["id"], "asset_id": "", "manufacturer": "Dell"})
        assert r4.status_code == 200
        assert r4.json()["asset_id"] == a1["asset_id"]

        # Update with conflicting id fails
        r5 = session.put(f"{API}/assets/{a1['id']}", json={"category_id": laptop["id"], "asset_id": a2["asset_id"]})
        assert r5.status_code == 400

        # Cleanup
        session.delete(f"{API}/assets/{a1['id']}")
        session.delete(f"{API}/assets/{a2['id']}")

    def test_filters(self, session, categories):
        desktop = next(c for c in categories if c["name"] == "Desktop")
        today = __import__("datetime").date.today()
        in_10 = (today + __import__("datetime").timedelta(days=10)).isoformat()
        far = (today + __import__("datetime").timedelta(days=200)).isoformat()

        a = session.post(
            f"{API}/assets",
            json={
                "category_id": desktop["id"],
                "status": "Under Repair",
                "department": "TESTDEPT_F",
                "warranty_expiration_date": in_10,
                "manufacturer": "ACME_TEST_UNIQUE",
            },
        ).json()
        b = session.post(
            f"{API}/assets",
            json={
                "category_id": desktop["id"],
                "status": "In Storage",
                "department": "TESTDEPT_F",
                "warranty_expiration_date": far,
            },
        ).json()

        # status filter
        r = session.get(f"{API}/assets", params={"status": "Under Repair"})
        assert r.status_code == 200
        assert any(x["id"] == a["id"] for x in r.json())
        assert all(x["status"] == "Under Repair" for x in r.json())

        # warranty_expiring filter
        r = session.get(f"{API}/assets", params={"warranty_expiring": "true"})
        ids = [x["id"] for x in r.json()]
        assert a["id"] in ids
        assert b["id"] not in ids

        # department filter
        r = session.get(f"{API}/assets", params={"department": "TESTDEPT_F"})
        ids = [x["id"] for x in r.json()]
        assert a["id"] in ids and b["id"] in ids

        # search
        r = session.get(f"{API}/assets", params={"q": "ACME_TEST_UNIQUE"})
        ids = [x["id"] for x in r.json()]
        assert a["id"] in ids

        session.delete(f"{API}/assets/{a['id']}")
        session.delete(f"{API}/assets/{b['id']}")


# ------------- Maintenance -------------
class TestMaintenance:
    def test_crud(self, session, categories):
        cat = categories[0]
        asset = session.post(f"{API}/assets", json={"category_id": cat["id"], "status": "In Use"}).json()
        r = session.post(
            f"{API}/maintenance",
            json={"asset_id": asset["id"], "date": "2026-01-10", "type": "Repair", "notes": "TEST"},
        )
        assert r.status_code == 200
        mid = r.json()["id"]

        r = session.get(f"{API}/maintenance", params={"asset_id": asset["id"]})
        assert r.status_code == 200
        assert any(m["id"] == mid for m in r.json())

        r = session.delete(f"{API}/maintenance/{mid}")
        assert r.status_code == 200
        session.delete(f"{API}/assets/{asset['id']}")


# ------------- Dashboard -------------
class TestDashboard:
    def test_stats(self, session):
        r = session.get(f"{API}/dashboard/stats")
        assert r.status_code == 200
        data = r.json()
        for key in ["total", "in_use", "in_storage", "under_repair", "warranty_expiring", "by_category", "by_department"]:
            assert key in data
        assert isinstance(data["by_category"], list)
        assert isinstance(data["by_department"], list)
