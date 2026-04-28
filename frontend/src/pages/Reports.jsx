import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, FileText, Users, Building2, LayoutGrid, ShieldAlert, Briefcase } from "lucide-react";
import { LOGO_URL } from "@/lib/api";
import { fmtDate, STATUS_STYLE } from "@/lib/constants";

const REPORTS = [
  { key: "employees", label: "Employees & Equipment", icon: Users, desc: "Every employee and the equipment currently assigned to them." },
  { key: "departments", label: "By Department", icon: Building2, desc: "Employees grouped by department, each with their assigned equipment." },
  { key: "companies", label: "By Company", icon: Briefcase, desc: "All equipment grouped by the owning company (legal entity)." },
  { key: "categories", label: "Equipment by Category", icon: LayoutGrid, desc: "All equipment grouped by category (Laptop, Desktop, Monitor…)." },
  { key: "warranty", label: "Warranty Expiring (30 days)", icon: ShieldAlert, desc: "Assets whose warranty expires within the next 30 days." },
];

export default function Reports() {
  const [tab, setTab] = useState("employees");
  const [data, setData] = useState({ employees: [], assets: [], categories: [], locations: [], companies: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/employees"),
      api.get("/assets"),
      api.get("/categories"),
      api.get("/locations"),
      api.get("/companies"),
    ])
      .then(([e, a, c, l, co]) =>
        setData({ employees: e.data, assets: a.data, categories: c.data, locations: l.data, companies: co.data })
      )
      .finally(() => setLoading(false));
  }, []);

  const catMap = useMemo(() => Object.fromEntries(data.categories.map((c) => [c.id, c.name])), [data.categories]);
  const empMap = useMemo(() => Object.fromEntries(data.employees.map((e) => [e.id, e])), [data.employees]);
  const locMap = useMemo(() => Object.fromEntries(data.locations.map((l) => [l.id, l.name])), [data.locations]);
  const coMap = useMemo(() => Object.fromEntries(data.companies.map((c) => [c.id, c.name])), [data.companies]);
  const assetsByEmp = useMemo(() => {
    const m = {};
    for (const a of data.assets) {
      if (a.assigned_to_id) (m[a.assigned_to_id] ||= []).push(a);
    }
    return m;
  }, [data.assets]);

  const print = () => window.print();

  const activeReport = REPORTS.find((r) => r.key === tab);
  const Icon = activeReport.icon;

  return (
    <Layout>
      {/* Controls (hidden in print) */}
      <div data-print-hide="true">
        <div className="flex items-end justify-between mb-8 pb-4 border-b border-line">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-muted font-semibold mb-1">
              Printable Reports
            </div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-ink">Reports</h1>
            <p className="text-sm text-ink-muted mt-2 max-w-xl">
              Pick a report template below, review the data, then click <b>Print</b> to save as PDF or send to a printer.
            </p>
          </div>
          <Button
            onClick={print}
            data-testid="print-btn"
            className="bg-brand hover:bg-brand-hover text-white rounded-sm"
          >
            <Printer size={16} className="mr-2" /> Print / Save PDF
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mb-6" data-testid="report-tabs">
          <TabsList className="bg-white border border-line rounded-sm p-0.5 flex-wrap h-auto">
            {REPORTS.map((r) => {
              const RIcon = r.icon;
              return (
                <TabsTrigger
                  key={r.key}
                  value={r.key}
                  data-testid={`report-tab-${r.key}`}
                  className="rounded-sm data-[state=active]:bg-brand data-[state=active]:text-white text-xs font-semibold uppercase tracking-wider px-3"
                >
                  <RIcon size={13} className="mr-1.5" /> {r.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="text-ink-muted text-sm">Loading report data…</div>
      ) : (
        <div data-testid="report-content" className="panel p-8 bg-white">
          {/* Print header (visible on screen too) */}
          <div className="flex items-start justify-between border-b border-line pb-6 mb-8">
            <div className="flex items-center gap-4">
              <img src={LOGO_URL} alt="Sens" className="w-12 h-12 object-contain" />
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-ink-muted font-semibold">
                  Sens · IT Hardware Inventory
                </div>
                <h2 className="font-heading text-2xl font-bold text-ink flex items-center gap-2 mt-1">
                  <Icon size={20} className="text-brand" />
                  {activeReport.label}
                </h2>
                <p className="text-xs text-ink-muted mt-1">{activeReport.desc}</p>
              </div>
            </div>
            <div className="text-right text-xs text-ink-muted">
              <div className="font-semibold uppercase tracking-wider text-[10px]">Generated</div>
              <div className="text-ink font-medium mt-1">
                {new Date().toLocaleString(undefined, {
                  year: "numeric", month: "short", day: "2-digit",
                  hour: "2-digit", minute: "2-digit",
                })}
              </div>
            </div>
          </div>

          {tab === "employees" && <EmployeesReport employees={data.employees} assetsByEmp={assetsByEmp} catMap={catMap} />}
          {tab === "departments" && <DepartmentsReport employees={data.employees} assetsByEmp={assetsByEmp} catMap={catMap} />}
          {tab === "companies" && <CompaniesReport assets={data.assets} companies={data.companies} catMap={catMap} empMap={empMap} locMap={locMap} />}
          {tab === "categories" && <CategoriesReport assets={data.assets} categories={data.categories} empMap={empMap} locMap={locMap} />}
          {tab === "warranty" && <WarrantyReport assets={data.assets} catMap={catMap} empMap={empMap} locMap={locMap} />}
        </div>
      )}
    </Layout>
  );
}

/* ---------- Report Templates ---------- */

function EmployeesReport({ employees, assetsByEmp, catMap }) {
  const sorted = [...employees].sort((a, b) => a.name.localeCompare(b.name));
  const totalAssigned = Object.values(assetsByEmp).reduce((s, list) => s + list.length, 0);
  return (
    <>
      <SummaryBar items={[
        { label: "Employees", value: employees.length },
        { label: "Assigned Assets", value: totalAssigned },
        { label: "Unassigned Employees", value: employees.filter((e) => !(assetsByEmp[e.id] || []).length).length },
      ]} />
      <table className="w-full text-sm mt-6 border-collapse">
        <thead>
          <tr className="bg-surface-alt">
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-2 px-3 border border-line">Employee</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-2 px-3 border border-line">Department</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-2 px-3 border border-line">Location</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-2 px-3 border border-line">Manager</th>
            <th className="text-center text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-2 px-3 border border-line w-16">#</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-2 px-3 border border-line">Equipment</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => {
            const items = assetsByEmp[e.id] || [];
            return (
              <tr key={e.id} className="align-top">
                <td className="py-2 px-3 border border-line font-medium text-ink whitespace-nowrap">{e.name}</td>
                <td className="py-2 px-3 border border-line text-ink-muted whitespace-nowrap">{e.department || "—"}</td>
                <td className="py-2 px-3 border border-line text-ink-muted whitespace-nowrap">{e.location || "—"}</td>
                <td className="py-2 px-3 border border-line text-ink-muted whitespace-nowrap">{e.manager || "—"}</td>
                <td className="py-2 px-3 border border-line text-center font-mono">{items.length}</td>
                <td className="py-2 px-3 border border-line">
                  {items.length === 0 ? (
                    <span className="text-ink-muted italic text-xs">None</span>
                  ) : (
                    <ul className="space-y-0.5">
                      {items.map((a) => (
                        <li key={a.id} className="text-xs">
                          <span className="font-mono text-brand">{a.asset_id}</span>
                          <span className="text-ink-muted"> · {catMap[a.category_id] || "—"}</span>
                          {(a.manufacturer || a.model) && <span className="text-ink"> · {a.manufacturer} {a.model}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-ink-muted border border-line">No employees.</td></tr>}
        </tbody>
      </table>
    </>
  );
}

function DepartmentsReport({ employees, assetsByEmp, catMap }) {
  const groups = useMemo(() => {
    const m = {};
    for (const e of employees) {
      const key = e.department || "(No Department)";
      (m[key] ||= []).push(e);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.name.localeCompare(b.name));
    return Object.keys(m).sort().map((k) => ({ dept: k, employees: m[k] }));
  }, [employees]);

  if (groups.length === 0) return <div className="text-ink-muted text-sm">No employees yet.</div>;

  return (
    <div className="space-y-10">
      {groups.map((g, idx) => {
        const totalItems = g.employees.reduce((s, e) => s + (assetsByEmp[e.id]?.length || 0), 0);
        return (
          <section key={g.dept} className={idx > 0 ? "print-break" : ""}>
            <div className="flex items-center justify-between border-b border-line pb-2 mb-4">
              <h3 className="font-heading text-lg font-semibold text-ink">{g.dept}</h3>
              <div className="text-xs text-ink-muted font-mono">
                {g.employees.length} employees · {totalItems} items
              </div>
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface-alt">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-2 px-3 border border-line">Employee</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-2 px-3 border border-line">Location</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-2 px-3 border border-line">Manager</th>
                  <th className="text-center text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-2 px-3 border border-line w-16">#</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-2 px-3 border border-line">Equipment</th>
                </tr>
              </thead>
              <tbody>
                {g.employees.map((e) => {
                  const items = assetsByEmp[e.id] || [];
                  return (
                    <tr key={e.id} className="align-top">
                      <td className="py-2 px-3 border border-line font-medium text-ink">{e.name}</td>
                      <td className="py-2 px-3 border border-line text-ink-muted">{e.location || "—"}</td>
                      <td className="py-2 px-3 border border-line text-ink-muted">{e.manager || "—"}</td>
                      <td className="py-2 px-3 border border-line text-center font-mono">{items.length}</td>
                      <td className="py-2 px-3 border border-line">
                        {items.length === 0 ? <span className="text-ink-muted italic text-xs">None</span> : (
                          <ul className="space-y-0.5">
                            {items.map((a) => (
                              <li key={a.id} className="text-xs">
                                <span className="font-mono text-brand">{a.asset_id}</span>
                                <span className="text-ink-muted"> · {catMap[a.category_id] || "—"}</span>
                                {(a.manufacturer || a.model) && <span className="text-ink"> · {a.manufacturer} {a.model}</span>}
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
          </section>
        );
      })}
    </div>
  );
}

function CategoriesReport({ assets, categories, empMap, locMap }) {
  const sortedCats = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-10">
      <SummaryBar items={[
        { label: "Total Assets", value: assets.length },
        { label: "Categories", value: categories.length },
        { label: "In Use", value: assets.filter((a) => a.status === "In Use").length },
      ]} />
      {sortedCats.map((c, idx) => {
        const list = assets.filter((a) => a.category_id === c.id).sort((x, y) => x.asset_id.localeCompare(y.asset_id));
        return (
          <section key={c.id} className={idx > 0 ? "print-break" : ""}>
            <div className="flex items-center justify-between border-b border-line pb-2 mb-4">
              <h3 className="font-heading text-lg font-semibold text-ink">
                {c.name} <span className="font-mono text-xs text-ink-muted ml-2">{c.prefix}</span>
              </h3>
              <div className="text-xs text-ink-muted font-mono">{list.length} items</div>
            </div>
            {list.length === 0 ? (
              <div className="text-ink-muted text-sm italic">No assets in this category.</div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-surface-alt">
                    {["Asset ID", "Manufacturer / Model", "Serial", "Assigned To", "Location", "Status", "Warranty"].map((h) => (
                      <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-2 px-3 border border-line">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 px-3 border border-line font-mono text-brand">{a.asset_id}</td>
                      <td className="py-2 px-3 border border-line text-ink">{a.manufacturer} {a.model}</td>
                      <td className="py-2 px-3 border border-line text-ink-muted font-mono text-xs">{a.serial_number || "—"}</td>
                      <td className="py-2 px-3 border border-line text-ink-muted">{empMap[a.assigned_to_id]?.name || "—"}</td>
                      <td className="py-2 px-3 border border-line text-ink-muted">{locMap[a.location_id] || "—"}</td>
                      <td className="py-2 px-3 border border-line">
                        <span className={`status-pill ${STATUS_STYLE[a.status] || ""}`}>{a.status}</span>
                      </td>
                      <td className="py-2 px-3 border border-line text-ink-muted text-xs">{fmtDate(a.warranty_expiration_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </div>
  );
}

function WarrantyReport({ assets, catMap, empMap, locMap }) {
  const today = new Date();
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const list = assets
    .filter((a) => a.warranty_expiration_date)
    .filter((a) => {
      const d = new Date(a.warranty_expiration_date);
      return d >= today && d <= in30;
    })
    .sort((x, y) => x.warranty_expiration_date.localeCompare(y.warranty_expiration_date));

  return (
    <>
      <SummaryBar items={[
        { label: "Expiring (30 days)", value: list.length },
        { label: "Window", value: `${fmtDate(today.toISOString())} → ${fmtDate(in30.toISOString())}` },
      ]} />
      {list.length === 0 ? (
        <div className="text-ink-muted text-sm mt-6">No warranties expiring in the next 30 days.</div>
      ) : (
        <table className="w-full text-sm border-collapse mt-6">
          <thead>
            <tr className="bg-surface-alt">
              {["Warranty Ends", "Asset ID", "Category", "Manufacturer / Model", "Assigned To", "Location", "Status"].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-2 px-3 border border-line">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td className="py-2 px-3 border border-line text-ink font-medium whitespace-nowrap">{fmtDate(a.warranty_expiration_date)}</td>
                <td className="py-2 px-3 border border-line font-mono text-brand">{a.asset_id}</td>
                <td className="py-2 px-3 border border-line text-ink-muted">{catMap[a.category_id] || "—"}</td>
                <td className="py-2 px-3 border border-line text-ink">{a.manufacturer} {a.model}</td>
                <td className="py-2 px-3 border border-line text-ink-muted">{empMap[a.assigned_to_id]?.name || "—"}</td>
                <td className="py-2 px-3 border border-line text-ink-muted">{locMap[a.location_id] || "—"}</td>
                <td className="py-2 px-3 border border-line">
                  <span className={`status-pill ${STATUS_STYLE[a.status] || ""}`}>{a.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function SummaryBar({ items }) {
  return (
    <div className="grid gap-4 mb-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it) => (
        <div key={it.label} className="bg-surface-alt border border-line rounded-sm px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.15em] text-ink-muted font-semibold">{it.label}</div>
          <div className="font-heading text-2xl font-bold text-ink mt-1">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function CompaniesReport({ assets, companies, catMap, empMap, locMap }) {
  const groups = useMemo(() => {
    const m = {};
    for (const c of companies) m[c.id] = { name: c.name, assets: [] };
    m["__none__"] = { name: "(No Company / Unassigned)", assets: [] };
    for (const a of assets) (m[a.company_id]?.assets || m["__none__"].assets).push(a);
    return Object.values(m).sort((a, b) => {
      if (a.name.startsWith("(")) return 1;
      if (b.name.startsWith("(")) return -1;
      return a.name.localeCompare(b.name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, companies]);

  return (
    <div className="space-y-10">
      <SummaryBar items={[
        { label: "Companies", value: companies.length },
        { label: "Total Assets", value: assets.length },
        { label: "Unassigned", value: assets.filter((a) => !a.company_id).length },
      ]} />
      {groups.map((g, idx) => (
        <section key={g.name} className={idx > 0 ? "print-break" : ""}>
          <div className="flex items-center justify-between border-b border-line pb-2 mb-4">
            <h3 className="font-heading text-lg font-semibold text-ink">{g.name}</h3>
            <div className="text-xs text-ink-muted font-mono">{g.assets.length} assets</div>
          </div>
          {g.assets.length === 0 ? (
            <div className="text-ink-muted text-sm italic">No assets recorded for this company.</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface-alt">
                  {["Asset ID", "Category", "Manufacturer / Model", "Assigned To", "Location", "Status", "Warranty"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-2 px-3 border border-line">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.assets
                  .sort((x, y) => x.asset_id.localeCompare(y.asset_id))
                  .map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 px-3 border border-line font-mono text-brand">{a.asset_id}</td>
                    <td className="py-2 px-3 border border-line text-ink-muted">{catMap[a.category_id] || "—"}</td>
                    <td className="py-2 px-3 border border-line text-ink">{a.manufacturer} {a.model}</td>
                    <td className="py-2 px-3 border border-line text-ink-muted">{empMap[a.assigned_to_id]?.name || "—"}</td>
                    <td className="py-2 px-3 border border-line text-ink-muted">{locMap[a.location_id] || "—"}</td>
                    <td className="py-2 px-3 border border-line">
                      <span className={`status-pill ${STATUS_STYLE[a.status] || ""}`}>{a.status}</span>
                    </td>
                    <td className="py-2 px-3 border border-line text-ink-muted text-xs">{fmtDate(a.warranty_expiration_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  );
}

