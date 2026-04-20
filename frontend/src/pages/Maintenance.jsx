import React, { useEffect, useMemo, useState } from "react";
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
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Wrench } from "lucide-react";
import { toast } from "sonner";
import { MAINT_TYPES, fmtDate } from "@/lib/constants";

export default function Maintenance() {
  const [records, setRecords] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ asset_id: "", date: "", type: "Service", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [m, a] = await Promise.all([api.get("/maintenance"), api.get("/assets")]);
      setRecords(m.data);
      setAssets(a.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets]);

  const save = async () => {
    if (!form.asset_id || !form.date) {
      toast.error("Asset and date are required");
      return;
    }
    setSaving(true);
    try {
      await api.post("/maintenance", form);
      toast.success("Record added");
      setOpen(false);
      setForm({ asset_id: "", date: "", type: "Service", notes: "" });
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    try {
      await api.delete(`/maintenance/${id}`);
      toast.success("Deleted");
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <Layout>
      <PageHeader
        subtitle="Service Log"
        title="Maintenance"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="new-maint-btn" className="bg-brand hover:bg-brand-hover text-white rounded-sm">
                <Plus size={16} className="mr-2" /> New Record
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Maintenance Record</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label className="field-label mb-1 block">Asset</Label>
                  <Select value={form.asset_id} onValueChange={(v) => setForm({ ...form, asset_id: v })}>
                    <SelectTrigger data-testid="dlg-maint-asset"><SelectValue placeholder="Choose asset" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {assets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.asset_id} — {a.manufacturer} {a.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="field-label mb-1 block">Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="dlg-maint-date" />
                </div>
                <div>
                  <Label className="field-label mb-1 block">Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger data-testid="dlg-maint-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MAINT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="field-label mb-1 block">Notes</Label>
                  <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="dlg-maint-notes" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm">Cancel</Button>
                <Button onClick={save} disabled={saving} data-testid="dlg-maint-save" className="bg-brand hover:bg-brand-hover text-white rounded-sm">
                  {saving ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="panel overflow-hidden" data-testid="maint-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-alt border-b border-line">
              {["Date", "Asset", "Type", "Notes", ""].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-3 px-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="text-center py-10 text-ink-muted">Loading…</td></tr>}
            {!loading && records.length === 0 && (
              <tr><td colSpan={5} className="text-center py-16 text-ink-muted">
                <Wrench size={24} className="mx-auto mb-2 opacity-40" />
                No maintenance records yet.
              </td></tr>
            )}
            {records.map((r) => {
              const a = assetMap[r.asset_id];
              return (
                <tr key={r.id} className="border-b border-line hover:bg-surface-alt transition-colors" data-testid={`maint-row-${r.id}`}>
                  <td className="py-3 px-4 text-ink">{fmtDate(r.date)}</td>
                  <td className="py-3 px-4 font-mono text-brand">{a?.asset_id || "—"}</td>
                  <td className="py-3 px-4 text-ink">{r.type}</td>
                  <td className="py-3 px-4 text-ink-muted">{r.notes}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => del(r.id)} className="text-red-700 hover:underline text-xs" data-testid={`del-maint-${r.id}`}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
