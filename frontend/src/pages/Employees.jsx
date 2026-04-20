import React, { useEffect, useMemo, useRef, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import Layout, { PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Upload, Download, FileSpreadsheet, Rows3, Table2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const EMPTY = { name: "", department: "", location: "", manager: "" };

export default function Employees() {
  const [rows, setRows] = useState([]);
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list | spreadsheet

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [e, a, c] = await Promise.all([
        api.get("/employees"),
        api.get("/assets"),
        api.get("/categories"),
      ]);
      setRows(e.data);
      setAssets(a.data);
      setCategories(c.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);

  // employee_id → [{asset_id, category, model, manufacturer, status}]
  const assetsByEmployee = useMemo(() => {
    const map = {};
    for (const a of assets) {
      if (!a.assigned_to_id) continue;
      (map[a.assigned_to_id] ||= []).push(a);
    }
    return map;
  }, [assets]);

  const startNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const startEdit = (r) => { setEditing(r); setForm({ name: r.name, department: r.department || "", location: r.location || "", manager: r.manager || "" }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    try {
      if (editing) {
        await api.put(`/employees/${editing.id}`, form);
        toast.success("Employee updated");
      } else {
        await api.post("/employees", form);
        toast.success("Employee added");
      }
      setOpen(false);
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this employee?")) return;
    try {
      await api.delete(`/employees/${id}`);
      toast.success("Deleted");
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const downloadTemplate = () => {
    const csv = "name,department,location,manager\nJane Doe,Engineering,London HQ,John Smith\nBob Lee,Finance,Sydney Office,Alice Ng\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const runImport = async () => {
    if (!importFile) { toast.error("Please choose a CSV file"); return; }
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append("file", importFile);
    try {
      const { data } = await api.post("/employees/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(data);
      toast.success(`${data.created} employees imported`);
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setImportFile(null);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Layout>
      <PageHeader
        subtitle="People"
        title="Employees"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => { resetImport(); setImportOpen(true); }}
              data-testid="import-employees-btn"
              className="rounded-sm"
            >
              <Upload size={16} className="mr-2" /> Import CSV
            </Button>
            <Button onClick={startNew} data-testid="new-employee-btn" className="bg-brand hover:bg-brand-hover text-white rounded-sm">
              <Plus size={16} className="mr-2" /> New Employee
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3 mb-4" data-testid="view-toggle">
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="bg-white border border-line rounded-sm p-0.5">
            <TabsTrigger value="list" data-testid="view-list" className="rounded-sm data-[state=active]:bg-brand data-[state=active]:text-white text-xs font-semibold uppercase tracking-wider px-3">
              <Rows3 size={13} className="mr-1.5" /> List
            </TabsTrigger>
            <TabsTrigger value="spreadsheet" data-testid="view-spreadsheet" className="rounded-sm data-[state=active]:bg-brand data-[state=active]:text-white text-xs font-semibold uppercase tracking-wider px-3">
              <Table2 size={13} className="mr-1.5" /> Spreadsheet
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="text-xs text-ink-muted ml-2">
          {rows.length} employees · {assets.filter((a) => a.assigned_to_id).length} assets assigned
        </div>
      </div>

      {view === "list" ? (
        <ListView rows={rows} loading={loading} onEdit={startEdit} onDelete={del} />
      ) : (
        <SpreadsheetView
          rows={rows}
          loading={loading}
          assetsByEmployee={assetsByEmployee}
          catMap={catMap}
        />
      )}

      {/* Edit / New Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Employee" : "New Employee"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="field-label mb-1 block">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="emp-name" />
            </div>
            <div>
              <Label className="field-label mb-1 block">Department</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} data-testid="emp-dept" />
            </div>
            <div>
              <Label className="field-label mb-1 block">Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} data-testid="emp-location" placeholder="e.g. London HQ" />
            </div>
            <div>
              <Label className="field-label mb-1 block">Manager</Label>
              <Input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} data-testid="emp-manager" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm">Cancel</Button>
            <Button onClick={save} data-testid="emp-save" className="bg-brand hover:bg-brand-hover text-white rounded-sm">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) resetImport(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Employees from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV with columns: <span className="font-mono text-ink">name</span>,{" "}
              <span className="font-mono text-ink">department</span>,{" "}
              <span className="font-mono text-ink">location</span>,{" "}
              <span className="font-mono text-ink">manager</span>. Only <span className="font-mono">name</span> is required. Duplicates (same name) are skipped.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <button
              type="button"
              onClick={downloadTemplate}
              data-testid="download-template-btn"
              className="w-full flex items-center justify-between px-4 py-3 bg-surface-alt border border-line rounded-sm hover:border-brand/40 transition-colors group"
            >
              <span className="flex items-center gap-3">
                <FileSpreadsheet size={18} className="text-brand" />
                <span className="text-sm font-medium text-ink">Download template CSV</span>
              </span>
              <Download size={14} className="text-ink-muted group-hover:text-brand" />
            </button>

            <div>
              <Label className="field-label mb-2 block">CSV File</Label>
              <Input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                data-testid="import-file-input"
                className="cursor-pointer"
              />
              {importFile && (
                <div className="text-xs text-ink-muted mt-2">
                  Selected: <span className="font-medium text-ink">{importFile.name}</span> · {Math.round(importFile.size / 1024)} KB
                </div>
              )}
            </div>

            {importResult && (
              <div className="rounded-sm border border-line bg-surface-alt p-4 text-sm" data-testid="import-result">
                <div className="font-heading font-semibold text-ink mb-2">Import complete</div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-2xl font-bold text-emerald-700">{importResult.created}</div>
                    <div className="text-[10px] uppercase tracking-wider text-ink-muted mt-1">Created</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-700">{importResult.skipped_duplicates}</div>
                    <div className="text-[10px] uppercase tracking-wider text-ink-muted mt-1">Duplicates</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-500">{importResult.skipped_blank}</div>
                    <div className="text-[10px] uppercase tracking-wider text-ink-muted mt-1">Blank Rows</div>
                  </div>
                </div>
                {importResult.errors?.length > 0 && (
                  <ul className="mt-3 text-xs text-red-700 list-disc list-inside">
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} className="rounded-sm">Close</Button>
            <Button onClick={runImport} disabled={importing || !importFile} data-testid="import-submit" className="bg-brand hover:bg-brand-hover text-white rounded-sm">
              <Upload size={14} className="mr-2" />
              {importing ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function ListView({ rows, loading, onEdit, onDelete }) {
  return (
    <div className="panel overflow-hidden" data-testid="employees-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-alt border-b border-line">
            {["Name", "Department", "Location", "Manager", ""].map((h) => (
              <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-3 px-4">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={5} className="text-center py-10 text-ink-muted">Loading…</td></tr>}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={5} className="text-center py-16 text-ink-muted">No employees yet.</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line hover:bg-surface-alt" data-testid={`emp-row-${r.id}`}>
              <td className="py-3 px-4 text-ink font-medium">{r.name}</td>
              <td className="py-3 px-4 text-ink-muted">{r.department || "—"}</td>
              <td className="py-3 px-4 text-ink-muted">{r.location || "—"}</td>
              <td className="py-3 px-4 text-ink-muted">{r.manager || "—"}</td>
              <td className="py-3 px-4 text-right space-x-3">
                <button onClick={() => onEdit(r)} className="text-ink-muted hover:text-ink text-xs inline-flex items-center gap-1" data-testid={`edit-emp-${r.id}`}>
                  <Pencil size={12} /> Edit
                </button>
                <button onClick={() => onDelete(r.id)} className="text-red-700 hover:underline text-xs inline-flex items-center gap-1" data-testid={`del-emp-${r.id}`}>
                  <Trash2 size={12} /> Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SpreadsheetView({ rows, loading, assetsByEmployee, catMap }) {
  return (
    <div className="panel overflow-auto" data-testid="employees-spreadsheet">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-surface-alt border-b border-line sticky top-0">
            {["Employee", "Department", "Location", "Manager", "# Items", "Equipment"].map((h) => (
              <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-3 px-4 border-r border-line last:border-r-0">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={6} className="text-center py-10 text-ink-muted">Loading…</td></tr>}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={6} className="text-center py-16 text-ink-muted">No employees yet.</td></tr>
          )}
          {rows.map((r) => {
            const items = assetsByEmployee[r.id] || [];
            return (
              <tr key={r.id} className="border-b border-line align-top hover:bg-surface-alt" data-testid={`sheet-row-${r.id}`}>
                <td className="py-3 px-4 text-ink font-medium border-r border-line whitespace-nowrap">{r.name}</td>
                <td className="py-3 px-4 text-ink-muted border-r border-line whitespace-nowrap">{r.department || "—"}</td>
                <td className="py-3 px-4 text-ink-muted border-r border-line whitespace-nowrap">{r.location || "—"}</td>
                <td className="py-3 px-4 text-ink-muted border-r border-line whitespace-nowrap">{r.manager || "—"}</td>
                <td className="py-3 px-4 font-mono text-ink border-r border-line text-center">{items.length}</td>
                <td className="py-3 px-4">
                  {items.length === 0 ? (
                    <span className="text-ink-muted text-xs italic">No equipment assigned</span>
                  ) : (
                    <ul className="space-y-1">
                      {items.map((a) => (
                        <li key={a.id} className="text-xs">
                          <Link to={`/assets/${a.id}`} className="font-mono text-brand hover:underline">{a.asset_id}</Link>
                          <span className="text-ink-muted"> · {catMap[a.category_id] || "—"}</span>
                          {(a.manufacturer || a.model) && (
                            <span className="text-ink"> · {a.manufacturer} {a.model}</span>
                          )}
                          {a.status && a.status !== "In Use" && (
                            <span className="text-ink-muted"> ({a.status})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
