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

export default function Locations() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/locations");
      setRows(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing(null); setName(""); setOpen(true); };
  const startEdit = (r) => { setEditing(r); setName(r.name); setOpen(true); };

  const save = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    try {
      if (editing) await api.put(`/locations/${editing.id}`, { name });
      else await api.post("/locations", { name });
      setOpen(false);
      toast.success("Saved");
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this location?")) return;
    try {
      await api.delete(`/locations/${id}`);
      toast.success("Deleted");
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <Layout>
      <PageHeader
        subtitle="Places"
        title="Locations"
        actions={
          <Button onClick={startNew} data-testid="new-location-btn" className="bg-brand hover:bg-brand-hover text-white rounded-sm">
            <Plus size={16} className="mr-2" /> New Location
          </Button>
        }
      />
      <div className="panel overflow-hidden" data-testid="locations-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-alt border-b border-line">
              {["Location Name", ""].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-3 px-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={2} className="text-center py-10 text-ink-muted">Loading…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={2} className="text-center py-16 text-ink-muted">No locations yet.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line hover:bg-surface-alt" data-testid={`loc-row-${r.id}`}>
                <td className="py-3 px-4 text-ink font-medium">{r.name}</td>
                <td className="py-3 px-4 text-right space-x-3">
                  <button onClick={() => startEdit(r)} className="text-ink-muted hover:text-ink text-xs inline-flex items-center gap-1" data-testid={`edit-loc-${r.id}`}>
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => del(r.id)} className="text-red-700 hover:underline text-xs inline-flex items-center gap-1" data-testid={`del-loc-${r.id}`}>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Location" : "New Location"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="field-label mb-1 block">Location Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="loc-name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm">Cancel</Button>
            <Button onClick={save} data-testid="loc-save" className="bg-brand hover:bg-brand-hover text-white rounded-sm">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
