import React, { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import Layout, { PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Categories() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", prefix: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/categories");
      setRows(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing(null); setForm({ name: "", prefix: "" }); setOpen(true); };
  const startEdit = (r) => { setEditing(r); setForm({ name: r.name, prefix: r.prefix }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim() || !form.prefix.trim()) { toast.error("Name and prefix required"); return; }
    try {
      if (editing) await api.put(`/categories/${editing.id}`, form);
      else await api.post("/categories", form);
      setOpen(false);
      toast.success("Saved");
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success("Deleted");
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <Layout>
      <PageHeader
        subtitle="Taxonomy"
        title="Categories"
        actions={
          <Button onClick={startNew} data-testid="new-cat-btn" className="bg-brand hover:bg-brand-hover text-white rounded-sm">
            <Plus size={16} className="mr-2" /> New Category
          </Button>
        }
      />

      <div className="panel overflow-hidden" data-testid="categories-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-alt border-b border-line">
              {["Name", "Prefix", ""].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-3 px-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={3} className="text-center py-10 text-ink-muted">Loading…</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line hover:bg-surface-alt" data-testid={`cat-row-${r.id}`}>
                <td className="py-3 px-4 text-ink font-medium">{r.name}</td>
                <td className="py-3 px-4 font-mono text-brand">{r.prefix}</td>
                <td className="py-3 px-4 text-right space-x-3">
                  <button onClick={() => startEdit(r)} className="text-ink-muted hover:text-ink text-xs inline-flex items-center gap-1">
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => del(r.id)} className="text-red-700 hover:underline text-xs inline-flex items-center gap-1">
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
          <DialogHeader><DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="field-label mb-1 block">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="cat-name" />
            </div>
            <div>
              <Label className="field-label mb-1 block">Asset ID Prefix *</Label>
              <Input value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase() })} data-testid="cat-prefix" placeholder="e.g. LAP" />
              <p className="text-xs text-ink-muted mt-1">Used to auto-generate Asset IDs (e.g. LAP-0001).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm">Cancel</Button>
            <Button onClick={save} data-testid="cat-save" className="bg-brand hover:bg-brand-hover text-white rounded-sm">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
