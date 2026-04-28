import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import Layout, { PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search } from "lucide-react";
import { STATUS_STYLE, fmtDate } from "@/lib/constants";

const TABS = [
  { key: "all", label: "All Assets", filter: {} },
  { key: "in_use", label: "In Use", filter: { status: "In Use" } },
  { key: "in_storage", label: "In Storage", filter: { status: "In Storage" } },
  { key: "under_repair", label: "Under Repair", filter: { status: "Under Repair" } },
  { key: "warranty", label: "Warranty Expiring", filter: { warranty_expiring: "1" } },
];

export default function Assets() {
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(sp.get("q") || "");
  const [deptFilter, setDeptFilter] = useState(sp.get("department") || "all");
  const [companyFilter, setCompanyFilter] = useState(sp.get("company_id") || "all");

  const statusParam = sp.get("status");
  const warrantyParam = sp.get("warranty_expiring");

  const activeTab =
    warrantyParam ? "warranty" :
    statusParam === "In Use" ? "in_use" :
    statusParam === "In Storage" ? "in_storage" :
    statusParam === "Under Repair" ? "under_repair" :
    "all";

  const load = async () => {
    setLoading(true);
    const params = {};
    if (statusParam) params.status = statusParam;
    if (warrantyParam) params.warranty_expiring = true;
    if (q) params.q = q;
    if (deptFilter && deptFilter !== "all") params.department = deptFilter;
    if (companyFilter && companyFilter !== "all") params.company_id = companyFilter;
    try {
      const [aRes, cRes, eRes, lRes, coRes] = await Promise.all([
        api.get("/assets", { params }),
        api.get("/categories"),
        api.get("/employees"),
        api.get("/locations"),
        api.get("/companies"),
      ]);
      setAssets(aRes.data);
      setCategories(cRes.data);
      setEmployees(eRes.data);
      setLocations(lRes.data);
      setCompanies(coRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusParam, warrantyParam, deptFilter, companyFilter]);

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);
  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const locMap = useMemo(() => Object.fromEntries(locations.map((l) => [l.id, l.name])), [locations]);
  const coMap = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.name])), [companies]);

  const departments = useMemo(() => {
    const s = new Set();
    employees.forEach((e) => e.department && s.add(e.department));
    assets.forEach((a) => a.department && s.add(a.department));
    return Array.from(s).sort();
  }, [employees, assets]);

  const onSearch = (e) => {
    e.preventDefault();
    load();
  };

  const setTab = (key) => {
    const tab = TABS.find((t) => t.key === key);
    const next = new URLSearchParams();
    Object.entries(tab.filter).forEach(([k, v]) => next.set(k, v));
    if (deptFilter && deptFilter !== "all") next.set("department", deptFilter);
    setSp(next);
  };

  return (
    <Layout>
      <PageHeader
        subtitle="Inventory"
        title="Assets"
        actions={
          <Button
            data-testid="new-asset-btn"
            onClick={() => navigate("/assets/new")}
            className="bg-brand hover:bg-brand-hover text-white rounded-sm"
          >
            <Plus size={16} className="mr-2" /> New Asset
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Tabs value={activeTab} onValueChange={setTab} data-testid="asset-tabs">
          <TabsList className="bg-white border border-line rounded-sm p-0.5">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                data-testid={`tab-${t.key}`}
                className="rounded-sm data-[state=active]:bg-brand data-[state=active]:text-white text-xs font-semibold uppercase tracking-wider px-3"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <form onSubmit={onSearch} className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              data-testid="asset-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search asset ID, serial, model…"
              className="h-9 pl-8 w-64 rounded-sm"
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="h-9 w-44 rounded-sm" data-testid="dept-filter">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="h-9 w-52 rounded-sm" data-testid="company-filter">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </form>
      </div>

      <div className="panel overflow-hidden" data-testid="assets-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-alt border-b border-line">
              {["Asset ID", "Category", "Manufacturer / Model", "Assigned To", "Department", "Company", "Location", "Status", "Warranty"].map(
                (h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-3 px-4">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="text-center py-10 text-ink-muted">Loading…</td></tr>
            )}
            {!loading && assets.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-16 text-ink-muted">
                  <div className="font-medium text-ink mb-1">No assets yet</div>
                  <div className="text-xs">Click "New Asset" to add your first record.</div>
                </td>
              </tr>
            )}
            {assets.map((a) => (
              <tr
                key={a.id}
                onClick={() => navigate(`/assets/${a.id}`)}
                data-testid={`asset-row-${a.asset_id}`}
                className="border-b border-line hover:bg-surface-alt cursor-pointer transition-colors"
              >
                <td className="py-3 px-4 font-mono text-[13px] font-semibold text-brand">
                  <Link to={`/assets/${a.id}`} onClick={(e) => e.stopPropagation()}>
                    {a.asset_id}
                  </Link>
                </td>
                <td className="py-3 px-4 text-ink">{catMap[a.category_id] || "—"}</td>
                <td className="py-3 px-4 text-ink">
                  <div className="font-medium">{a.manufacturer || "—"}</div>
                  <div className="text-xs text-ink-muted">{a.model || ""}</div>
                </td>
                <td className="py-3 px-4 text-ink">{empMap[a.assigned_to_id]?.name || "—"}</td>
                <td className="py-3 px-4 text-ink-muted">{a.department || "—"}</td>
                <td className="py-3 px-4 text-ink-muted">{coMap[a.company_id] || "—"}</td>
                <td className="py-3 px-4 text-ink-muted">{locMap[a.location_id] || "—"}</td>
                <td className="py-3 px-4">
                  <span className={`status-pill ${STATUS_STYLE[a.status] || ""}`}>
                    {a.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-ink-muted text-xs">{fmtDate(a.warranty_expiration_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
