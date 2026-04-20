import React, { useState } from "react";
import { api, formatApiError } from "@/lib/api";
import Layout, { PageHeader } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, User } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (next !== confirm) {
      toast.error("New password and confirmation do not match");
      return;
    }
    setSaving(true);
    try {
      await api.post("/auth/change-password", { current_password: current, new_password: next });
      toast.success("Password updated");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <PageHeader subtitle="Account" title="Settings" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="panel p-6 lg:col-span-1" data-testid="account-panel">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-sm bg-brand-50 flex items-center justify-center text-brand">
              <User size={18} />
            </div>
            <div>
              <div className="font-heading font-semibold text-ink">{user?.name}</div>
              <div className="text-xs text-ink-muted">@{user?.username}</div>
            </div>
          </div>
          <div className="text-xs text-ink-muted leading-relaxed">
            You are signed in as an IT administrator. Both admin accounts have identical access.
          </div>
        </div>

        <div className="panel p-6 lg:col-span-2" data-testid="change-password-panel">
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-line">
            <KeyRound size={16} className="text-brand" />
            <h3 className="font-heading text-lg font-semibold">Change Password</h3>
          </div>
          <form onSubmit={submit} className="space-y-5 max-w-md" data-testid="change-password-form">
            <div>
              <Label className="field-label mb-1 block">Current Password</Label>
              <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required data-testid="cp-current" />
            </div>
            <div>
              <Label className="field-label mb-1 block">New Password</Label>
              <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} required data-testid="cp-new" />
            </div>
            <div>
              <Label className="field-label mb-1 block">Confirm New Password</Label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required data-testid="cp-confirm" />
            </div>
            <Button type="submit" disabled={saving} data-testid="cp-submit" className="bg-brand hover:bg-brand-hover text-white rounded-sm">
              {saving ? "Updating…" : "Update Password"}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
