// Shared status + condition constants
export const STATUS_OPTIONS = [
  "In Use",
  "In Storage",
  "Loaned",
  "Under Repair",
  "Retired",
];

export const CONDITION_OPTIONS = ["New", "Good", "Fair", "Poor", "Damaged"];

export const MAINT_TYPES = ["Repair", "Service", "Inspection"];

export const TECH_CATEGORY_NAMES = ["Laptop", "Desktop"];

export const STATUS_STYLE = {
  "In Use": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "In Storage": "bg-slate-100 text-slate-700 border-slate-200",
  Loaned: "bg-blue-50 text-blue-800 border-blue-200",
  "Under Repair": "bg-amber-50 text-amber-800 border-amber-200",
  Retired: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

export function fmtDate(s) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return s;
  }
}

export function fmtMoney(n) {
  if (n == null || n === "") return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(n));
  } catch {
    return String(n);
  }
}
