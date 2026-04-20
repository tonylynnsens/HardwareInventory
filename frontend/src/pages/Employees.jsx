import React, { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import Layout, { PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { name: "", department: "", manager: "" };

export default function Employees() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/employees");
      setRows(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const startEdit = (r) => { setEditing(r); setForm({ name: r.name, department: r.department || "", manager: r.manager || "" }); setOpen(true); };

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

  return (
    <Layout>
      <PageHeader
        subtitle="People"
        title="Employees"
        actions={
          <Button onClick={startNew} data-testid="new-employee-btn" className="bg-brand hover:bg-brand-hover text-white rounded-sm">
            <Plus size={16} className="mr-2" /> New Employee
          </Button>
        }
      />

      <div className="panel overflow-hidden" data-testid="employees-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-alt border-b border-line">
              {["Name", "Department", "Manager", ""].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-3 px-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="text-center py-10 text-ink-muted">Loading…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={4} className="text-center py-16 text-ink-muted">No employees yet.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line hover:bg-surface-alt" data-testid={`emp-row-${r.id}`}>
                <td className="py-3 px-4 text-ink font-medium">{r.name}</td>
                <td className="py-3 px-4 text-ink-muted">{r.department || "—"}</td>
                <td className="py-3 px-4 text-ink-muted">{r.manager || "—"}</td>
                <td className="py-3 px-4 text-right space-x-3">
                  <button onClick={() => startEdit(r)} className="text-ink-muted hover:text-ink text-xs inline-flex items-center gap-1" data-testid={`edit-emp-${r.id}`}>
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => del(r.id)} className="text-red-700 hover:underline text-xs inline-flex items-center gap-1" data-testid={`del-emp-${r.id}`}>
                    <Trash2 size={12} /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
    </Layout>
  );
}
