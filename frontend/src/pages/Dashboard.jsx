import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Layout, { PageHeader } from "@/components/Layout";
import { Link } from "react-router-dom";
import {
  Package, CheckCircle2, Warehouse, Wrench, ShieldAlert, Handshake, Archive,
} from "lucide-react";

const KPI_COLOR = {
  total: "text-ink",
  in_use: "text-emerald-700",
  in_storage: "text-slate-700",
  under_repair: "text-amber-700",
  loaned: "text-blue-700",
  retired: "text-slate-500",
  warranty_expiring: "text-brand",
};

const KPI_ICON = {
  total: Package,
  in_use: CheckCircle2,
  in_storage: Warehouse,
  under_repair: Wrench,
  loaned: Handshake,
  retired: Archive,
  warranty_expiring: ShieldAlert,
};

const KPI_LINK = {
  total: "/assets",
  in_use: "/assets?status=In+Use",
  in_storage: "/assets?status=In+Storage",
  under_repair: "/assets?status=Under+Repair",
  loaned: "/assets?status=Loaned",
  retired: "/assets?status=Retired",
  warranty_expiring: "/assets?warranty_expiring=1",
};

const KPI_LABEL = {
  total: "Total Assets",
  in_use: "In Use",
  in_storage: "In Storage",
  under_repair: "Under Repair",
  loaned: "Loaned",
  retired: "Retired",
  warranty_expiring: "Warranty Expiring (30d)",
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const keys = ["total", "in_use", "in_storage", "under_repair", "loaned", "retired", "warranty_expiring"];

  return (
    <Layout>
      <PageHeader subtitle="Overview" title="Dashboard" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="kpi-grid">
        {keys.map((k) => {
          const Icon = KPI_ICON[k];
          return (
            <Link
              key={k}
              to={KPI_LINK[k]}
              data-testid={`kpi-${k}`}
              className="kpi group"
            >
              <div className="flex items-center justify-between">
                <span className="field-label">{KPI_LABEL[k]}</span>
                <Icon size={16} strokeWidth={2} className="text-ink-muted group-hover:text-brand transition-colors" />
              </div>
              <div className={`font-heading text-4xl font-bold ${KPI_COLOR[k]}`}>
                {stats ? stats[k] : "—"}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="panel p-6" data-testid="by-category-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold">Assets by Category</h3>
          </div>
          {stats && stats.by_category.length === 0 && (
            <div className="text-sm text-ink-muted">No assets yet.</div>
          )}
          <div className="space-y-3">
            {stats?.by_category.map((row) => (
              <div key={row.category} className="flex items-center gap-3">
                <div className="w-32 text-sm text-ink">{row.category}</div>
                <div className="flex-1 h-2 bg-slate-100 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-brand"
                    style={{
                      width: `${Math.min(100, (row.count / Math.max(1, stats.total)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="w-10 text-right font-mono text-sm text-ink">{row.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-6" data-testid="by-department-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold">Assets by Department</h3>
          </div>
          {stats && stats.by_department.length === 0 && (
            <div className="text-sm text-ink-muted">No department data yet.</div>
          )}
          <div className="space-y-3">
            {stats?.by_department.map((row) => (
              <div key={row.department} className="flex items-center gap-3">
                <div className="w-32 text-sm text-ink truncate">{row.department || "Unassigned"}</div>
                <div className="flex-1 h-2 bg-slate-100 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-slate-700"
                    style={{
                      width: `${Math.min(100, (row.count / Math.max(1, stats.total)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="w-10 text-right font-mono text-sm text-ink">{row.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
