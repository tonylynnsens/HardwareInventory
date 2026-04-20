import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Wrench,
  Users,
  MapPin,
  Tags,
  Settings as SettingsIcon,
  LogOut,
  FileText,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LOGO_URL } from "@/lib/api";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/assets", label: "Assets", icon: Package },
  { to: "/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/locations", label: "Locations", icon: MapPin },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  return (
    <aside
      data-testid="app-sidebar"
      className="w-64 flex-shrink-0 bg-white border-r border-line flex flex-col h-full"
    >
      <div className="px-5 py-6 border-b border-line flex items-center gap-3">
        <img
          src={LOGO_URL}
          alt="Sens"
          className="w-10 h-10 object-contain"
          data-testid="sidebar-logo"
        />
        <div className="leading-tight">
          <div className="font-heading font-bold text-[15px] tracking-tight text-ink">
            Sens Inventory
          </div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            IT Hardware
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1" data-testid="sidebar-nav">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={({ isActive }) =>
                isActive ? "nav-item-active" : "nav-item"
              }
            >
              <Icon size={16} strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-line">
        <div className="px-3 py-2 mb-2 text-xs">
          <div className="text-ink-muted uppercase tracking-[0.1em] text-[10px]">
            Signed in as
          </div>
          <div className="font-medium text-ink" data-testid="sidebar-username">
            {user?.username}
          </div>
        </div>
        <button
          data-testid="logout-btn"
          onClick={logout}
          className="nav-item w-full"
        >
          <LogOut size={16} strokeWidth={2} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
