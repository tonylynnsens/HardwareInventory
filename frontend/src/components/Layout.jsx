import React from "react";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "sonner";

export default function Layout({ children }) {
  return (
    <div className="h-screen w-full flex overflow-hidden bg-surface-page">
      <Sidebar />
      <main
        data-testid="main-content"
        className="flex-1 overflow-auto"
      >
        <div className="max-w-[1400px] mx-auto px-8 py-8 animate-fade-in-up">
          {children}
        </div>
      </main>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-end justify-between mb-8 pb-4 border-b border-line">
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-ink-muted font-semibold mb-1">
          {subtitle}
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-ink">
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
