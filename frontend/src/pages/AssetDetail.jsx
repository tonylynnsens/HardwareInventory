import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import Layout, { PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Edit3, Save, X, Trash2, Lock, Plus,
} from "lucide-react";
import {
  STATUS_OPTIONS, CONDITION_OPTIONS, STATUS_STYLE, TECH_CATEGORY_NAMES,
  MAINT_TYPES, fmtDate, fmtMoney,
} from "@/lib/constants";

const EMPTY = {
  asset_id: "",
  serial_number: "",
  category_id: "",
  manufacturer: "",
  model: "",
  assigned_to_id: "",
  department: "",
  location_id: "",
  status: "In Storage",
  assigned_date: "",
  operating_system: "",
  cpu: "",
  ram: "",
  storage: "",
  mac_address: "",
  supplier: "",
  purchase_date: "",
  purchase_price: "",
  invoice_number: "",
  warranty_expiration_date: "",
  condition: "Good",
  last_audit_date: "",
  expected_replacement_date: "",
  notes: "",
};

function Section({ title, children, testid }) {
  return (
    <section className="panel p-6" data-testid={testid}>
      <h3 className="font-heading text-lg font-semibold text-ink mb-6 pb-3 border-b border-line">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">{children}</div>
    </section>
  );
}

function ReadField({ label, value }) {
  return (
    <div className="read-field">
      <span className="field-label">{label}</span>
      <span className="field-value">{value || <span className="text-ink-muted">—</span>}</span>
    </div>
  );
}

function FormField({ label, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label className="field-label">{label}</Label>
      {children}
    </div>
  );
}

export default function AssetDetail() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [original, setOriginal] = useState(null);
  const [editing, setEditing] = useState(isNew);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [maintenance, setMaintenance] = useState([]);

  const loadRefs = async () => {
    const [c, e, l] = await Promise.all([
      api.get("/categories"),
      api.get("/employees"),
      api.get("/locations"),
    ]);
    setCategories(c.data);
    setEmployees(e.data);
    setLocations(l.data);
  };

  const loadAsset = async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/assets/${id}`);
      const normalized = { ...EMPTY, ...data };
      setForm(normalized);
      setOriginal(normalized);
      const mRes = await api.get("/maintenance", { params: { asset_id: id } });
      setMaintenance(mRes.data);
    } catch (err) {
      toast.error(formatApiError(err));
      navigate("/assets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefs();
    loadAsset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const locMap = useMemo(() => Object.fromEntries(locations.map((l) => [l.id, l.name])), [locations]);

  const currentCat = catMap[form.category_id];
  const showTech = currentCat && TECH_CATEGORY_NAMES.includes(currentCat.name);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onAssignedToChange = (v) => {
    const emp = empMap[v];
    setForm((f) => ({
      ...f,
      assigned_to_id: v,
      department: emp?.department || f.department,
    }));
  };

  const save = async () => {
    if (!form.category_id) {
      toast.error("Please select a category");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      // empty strings → null for relations/dates/numbers
      ["assigned_to_id", "location_id"].forEach((k) => {
        if (!payload[k]) payload[k] = null;
      });
      ["assigned_date", "purchase_date", "warranty_expiration_date", "last_audit_date", "expected_replacement_date"].forEach((k) => {
        if (!payload[k]) payload[k] = null;
      });
      if (payload.purchase_price === "" || payload.purchase_price == null) payload.purchase_price = null;
      else payload.purchase_price = Number(payload.purchase_price);

      if (isNew) {
        const { data } = await api.post("/assets", payload);
        toast.success(`Asset ${data.asset_id} created`);
        navigate(`/assets/${data.id}`);
        setEditing(false);
      } else {
        const { data } = await api.put(`/assets/${id}`, payload);
        const normalized = { ...EMPTY, ...data };
        setForm(normalized);
        setOriginal(normalized);
        setEditing(false);
        toast.success("Changes saved");
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (isNew) {
      navigate("/assets");
    } else {
      setForm(original);
      setEditing(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/assets/${id}`);
      toast.success("Asset deleted");
      navigate("/assets");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-ink-muted">Loading asset…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <Link to="/assets" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors" data-testid="back-to-assets">
          <ArrowLeft size={14} /> Back to Assets
        </Link>
        <div className="flex items-center gap-2">
          {!isNew && !editing && (
            <>
              <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-muted font-semibold mr-2">
                <Lock size={12} /> Locked
              </span>
              <Button
                variant="outline"
                data-testid="edit-btn"
                onClick={() => setEditing(true)}
                className="rounded-sm"
              >
                <Edit3 size={14} className="mr-2" /> Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" data-testid="delete-btn" className="rounded-sm text-red-700 border-red-200 hover:bg-red-50">
                    <Trash2 size={14} className="mr-2" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes {form.asset_id} and all its maintenance records.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="delete-cancel">Cancel</AlertDialogCancel>
                    <AlertDialogAction data-testid="delete-confirm" onClick={remove} className="bg-red-700 hover:bg-red-800">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {editing && (
            <>
              <Button variant="outline" data-testid="cancel-btn" onClick={cancel} className="rounded-sm">
                <X size={14} className="mr-2" /> Cancel
              </Button>
              <Button
                data-testid="save-btn"
                onClick={save}
                disabled={saving}
                className="bg-brand hover:bg-brand-hover text-white rounded-sm"
              >
                <Save size={14} className="mr-2" /> {saving ? "Saving…" : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-ink-muted font-semibold mb-1">
          {isNew ? "New Record" : "Asset Record"}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-ink font-mono">
            {form.asset_id || "— auto —"}
          </h1>
          {!isNew && form.status && (
            <span className={`status-pill ${STATUS_STYLE[form.status] || ""}`}>{form.status}</span>
          )}
          {!isNew && currentCat && (
            <span className="text-sm text-ink-muted">
              {currentCat.name} · {form.manufacturer} {form.model}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Section 1: Basic Information */}
        <Section title="Basic Information" testid="section-basic">
          {editing ? (
            <>
              <FormField label="Asset ID (leave blank to auto-generate)">
                <Input value={form.asset_id} onChange={(e) => set("asset_id", e.target.value)} data-testid="field-asset_id" placeholder={currentCat ? `${currentCat.prefix}-XXXX` : "Auto"} />
              </FormField>
              <FormField label="Category *">
                <Select value={form.category_id} onValueChange={(v) => set("category_id", v)}>
                  <SelectTrigger data-testid="field-category"><SelectValue placeholder="Choose category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Manufacturer">
                <Input value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} data-testid="field-manufacturer" />
              </FormField>
              <FormField label="Model">
                <Input value={form.model} onChange={(e) => set("model", e.target.value)} data-testid="field-model" />
              </FormField>
              <FormField label="Serial Number" className="md:col-span-2">
                <Input value={form.serial_number} onChange={(e) => set("serial_number", e.target.value)} data-testid="field-serial" />
              </FormField>
            </>
          ) : (
            <>
              <ReadField label="Asset ID" value={<span className="font-mono text-brand">{form.asset_id}</span>} />
              <ReadField label="Category" value={currentCat?.name} />
              <ReadField label="Manufacturer" value={form.manufacturer} />
              <ReadField label="Model" value={form.model} />
              <ReadField label="Serial Number" value={form.serial_number} />
            </>
          )}
        </Section>

        {/* Section 2: Assignment */}
        <Section title="Assignment" testid="section-assignment">
          {editing ? (
            <>
              <FormField label="Assigned To">
                <Select value={form.assigned_to_id || "__none__"} onValueChange={(v) => onAssignedToChange(v === "__none__" ? "" : v)}>
                  <SelectTrigger data-testid="field-assigned_to"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}{e.department ? ` · ${e.department}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Department">
                <Input value={form.department} onChange={(e) => set("department", e.target.value)} data-testid="field-department" />
              </FormField>
              <FormField label="Location">
                <Select value={form.location_id || "__none__"} onValueChange={(v) => set("location_id", v === "__none__" ? "" : v)}>
                  <SelectTrigger data-testid="field-location"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Status">
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger data-testid="field-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Assigned Date">
                <Input type="date" value={form.assigned_date || ""} onChange={(e) => set("assigned_date", e.target.value)} data-testid="field-assigned_date" />
              </FormField>
            </>
          ) : (
            <>
              <ReadField label="Assigned To" value={empMap[form.assigned_to_id]?.name} />
              <ReadField label="Department" value={form.department} />
              <ReadField label="Location" value={locMap[form.location_id]} />
              <ReadField label="Status" value={<span className={`status-pill ${STATUS_STYLE[form.status] || ""}`}>{form.status}</span>} />
              <ReadField label="Assigned Date" value={fmtDate(form.assigned_date)} />
            </>
          )}
        </Section>

        {/* Section 3: Technical Specs (conditional) */}
        {showTech && (
          <Section title="Technical Specifications" testid="section-tech">
            {editing ? (
              <>
                <FormField label="Operating System"><Input value={form.operating_system} onChange={(e) => set("operating_system", e.target.value)} data-testid="field-os" /></FormField>
                <FormField label="CPU"><Input value={form.cpu} onChange={(e) => set("cpu", e.target.value)} data-testid="field-cpu" /></FormField>
                <FormField label="RAM"><Input value={form.ram} onChange={(e) => set("ram", e.target.value)} data-testid="field-ram" placeholder="e.g. 16GB DDR4" /></FormField>
                <FormField label="Storage"><Input value={form.storage} onChange={(e) => set("storage", e.target.value)} data-testid="field-storage" placeholder="e.g. 512GB SSD" /></FormField>
                <FormField label="MAC Address" className="md:col-span-2"><Input value={form.mac_address} onChange={(e) => set("mac_address", e.target.value)} data-testid="field-mac" placeholder="00:1A:2B:3C:4D:5E" /></FormField>
              </>
            ) : (
              <>
                <ReadField label="Operating System" value={form.operating_system} />
                <ReadField label="CPU" value={form.cpu} />
                <ReadField label="RAM" value={form.ram} />
                <ReadField label="Storage" value={form.storage} />
                <ReadField label="MAC Address" value={<span className="font-mono">{form.mac_address}</span>} />
              </>
            )}
          </Section>
        )}

        {/* Section 4: Financial */}
        <Section title="Financial" testid="section-financial">
          {editing ? (
            <>
              <FormField label="Supplier"><Input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} data-testid="field-supplier" /></FormField>
              <FormField label="Purchase Date"><Input type="date" value={form.purchase_date || ""} onChange={(e) => set("purchase_date", e.target.value)} data-testid="field-purchase_date" /></FormField>
              <FormField label="Purchase Price"><Input type="number" step="0.01" value={form.purchase_price ?? ""} onChange={(e) => set("purchase_price", e.target.value)} data-testid="field-purchase_price" /></FormField>
              <FormField label="Invoice Number"><Input value={form.invoice_number} onChange={(e) => set("invoice_number", e.target.value)} data-testid="field-invoice" /></FormField>
              <FormField label="Warranty Expiration Date" className="md:col-span-2"><Input type="date" value={form.warranty_expiration_date || ""} onChange={(e) => set("warranty_expiration_date", e.target.value)} data-testid="field-warranty" /></FormField>
            </>
          ) : (
            <>
              <ReadField label="Supplier" value={form.supplier} />
              <ReadField label="Purchase Date" value={fmtDate(form.purchase_date)} />
              <ReadField label="Purchase Price" value={fmtMoney(form.purchase_price)} />
              <ReadField label="Invoice Number" value={form.invoice_number} />
              <ReadField label="Warranty Expiration" value={fmtDate(form.warranty_expiration_date)} />
            </>
          )}
        </Section>

        {/* Section 5: Lifecycle */}
        <Section title="Lifecycle" testid="section-lifecycle">
          {editing ? (
            <>
              <FormField label="Condition">
                <Select value={form.condition} onValueChange={(v) => set("condition", v)}>
                  <SelectTrigger data-testid="field-condition"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Last Audit Date"><Input type="date" value={form.last_audit_date || ""} onChange={(e) => set("last_audit_date", e.target.value)} data-testid="field-audit" /></FormField>
              <FormField label="Expected Replacement Date" className="md:col-span-2"><Input type="date" value={form.expected_replacement_date || ""} onChange={(e) => set("expected_replacement_date", e.target.value)} data-testid="field-replacement" /></FormField>
            </>
          ) : (
            <>
              <ReadField label="Condition" value={form.condition} />
              <ReadField label="Last Audit Date" value={fmtDate(form.last_audit_date)} />
              <ReadField label="Expected Replacement Date" value={fmtDate(form.expected_replacement_date)} />
            </>
          )}
        </Section>

        {/* Section 6: Notes */}
        <Section title="Notes" testid="section-notes">
          {editing ? (
            <div className="md:col-span-2">
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={5} data-testid="field-notes" placeholder="Any additional notes…" />
            </div>
          ) : (
            <div className="md:col-span-2 read-field">
              <span className="field-label">Notes</span>
              <span className="field-value whitespace-pre-wrap">{form.notes || <span className="text-ink-muted">—</span>}</span>
            </div>
          )}
        </Section>

        {/* Maintenance log */}
        {!isNew && <MaintenanceLog assetId={id} records={maintenance} onChange={loadAsset} />}
      </div>
    </Layout>
  );
}

function MaintenanceLog({ assetId, records, onChange }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: "", type: "Service", notes: "" });
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!form.date) {
      toast.error("Date is required");
      return;
    }
    setSaving(true);
    try {
      await api.post("/maintenance", { asset_id: assetId, ...form });
      setForm({ date: "", type: "Service", notes: "" });
      setOpen(false);
      toast.success("Maintenance record added");
      onChange();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const del = async (mid) => {
    try {
      await api.delete(`/maintenance/${mid}`);
      toast.success("Record deleted");
      onChange();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <section className="panel p-6" data-testid="section-maintenance">
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-line">
        <h3 className="font-heading text-lg font-semibold text-ink">Maintenance History</h3>
        <Button
          variant="outline"
          size="sm"
          data-testid="add-maintenance-btn"
          onClick={() => setOpen(!open)}
          className="rounded-sm"
        >
          <Plus size={14} className="mr-2" /> {open ? "Close" : "Add Record"}
        </Button>
      </div>

      {open && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6 p-4 bg-surface-alt border border-line rounded-sm" data-testid="new-maintenance-form">
          <div className="md:col-span-3">
            <Label className="field-label mb-1 block">Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="maint-date" />
          </div>
          <div className="md:col-span-3">
            <Label className="field-label mb-1 block">Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger data-testid="maint-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MAINT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-4">
            <Label className="field-label mb-1 block">Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="maint-notes" />
          </div>
          <div className="md:col-span-2 flex items-end">
            <Button onClick={add} disabled={saving} data-testid="maint-save" className="w-full bg-brand hover:bg-brand-hover text-white rounded-sm">
              Add
            </Button>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-sm text-ink-muted py-6 text-center">No maintenance records yet.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              {["Date", "Type", "Notes", ""].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-2 px-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="py-2 px-3 text-ink">{fmtDate(r.date)}</td>
                <td className="py-2 px-3 text-ink">{r.type}</td>
                <td className="py-2 px-3 text-ink-muted">{r.notes}</td>
                <td className="py-2 px-3 text-right">
                  <button onClick={() => del(r.id)} className="text-red-700 hover:underline text-xs" data-testid={`del-maint-${r.id}`}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
