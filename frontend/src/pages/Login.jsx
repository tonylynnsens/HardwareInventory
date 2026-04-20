import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOGO_URL } from "@/lib/api";
import { Loader2, LogIn } from "lucide-react";

export default function Login() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (ready && user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    const res = await login(username.trim(), password);
    setSubmitting(false);
    if (res.ok) navigate("/");
    else setErr(res.error);
  };

  return (
    <div className="min-h-screen w-full flex bg-surface-page" data-testid="login-page">
      {/* Left: brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center bg-[#6E1A1A]">
        <div
          className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #fff 0, transparent 40%), radial-gradient(circle at 80% 70%, #fff 0, transparent 40%)",
          }}
        />
        <div className="relative z-10 text-center px-12 max-w-lg">
          <img
            src={LOGO_URL}
            alt="Sens"
            className="w-40 h-40 mx-auto mb-10 drop-shadow-xl"
          />
          <h2 className="font-heading text-4xl font-bold text-white tracking-tight mb-3">
            IT Hardware Inventory
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            A secure, internal control room for tracking every laptop,
            desktop, monitor, mobile and accessory in your estate.
          </p>
          <div className="mt-12 flex items-center justify-center gap-8 text-white/50 text-[11px] uppercase tracking-[0.2em] font-semibold">
            <span>Accuracy</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span>Structure</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span>Clarity</span>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img src={LOGO_URL} alt="Sens" className="w-12 h-12" />
            <div>
              <div className="font-heading font-bold text-lg">Sens Inventory</div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                IT Hardware
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-muted font-semibold mb-2">
              Admin Access
            </div>
            <h1 className="font-heading text-3xl font-bold text-ink tracking-tight">
              Sign in
            </h1>
            <p className="text-sm text-ink-muted mt-2">
              Enter your credentials to access the inventory.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="username" className="field-label">Username</Label>
              <Input
                id="username"
                data-testid="login-username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Admin"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="field-label">Password</Label>
              <Input
                id="password"
                data-testid="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="h-11"
              />
            </div>

            {err && (
              <div
                data-testid="login-error"
                className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-sm"
              >
                {err}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              data-testid="login-submit"
              className="w-full h-11 bg-[#6E1A1A] hover:bg-[#8B1A1A] text-white rounded-sm font-semibold tracking-wide"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <LogIn size={16} className="mr-2" />
              )}
              Sign in
            </Button>
          </form>

          <div className="mt-10 text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            Internal use only · Sens IT
          </div>
        </div>
      </div>
    </div>
  );
}
