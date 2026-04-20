# Sens IT Hardware Inventory — PRD

## Original Problem Statement
Internal web app for IT staff (2 admins) to track hardware assets: Categories, Employees, Locations, Assets (with conditional Technical Specs for Laptop/Desktop), and Maintenance records. Data is locked by default; Edit button unlocks. Sens logo on every authenticated screen. Auto-generated Asset IDs with category prefix (LAP-0001 etc.). Views: All, In Use, In Storage, Under Repair, Warranty Expiring (30d), by Department. Clean corporate UI.

## Architecture
- **Backend**: FastAPI + MongoDB (motor). JWT auth via bcrypt + httpOnly cookies. All routes under `/api`. UUID-based primary keys (no `_id` leakage).
- **Frontend**: React + React Router + Tailwind + shadcn/ui + lucide-react + sonner. Light corporate theme, brand color `#6E1A1A`, Chivo/IBM Plex Sans fonts.

## Users / Personas
- IT Admin 1 (username: `Admin`, password: `nothing`)
- IT Admin 2 (username: `Admin2`, password: `nothing2`)
Both have identical full access. Can change their own password.

## Implemented (2026-02-20)
- Auth: login, logout, me, change-password (JWT cookies)
- Idempotent admin + category seeding on startup
- Categories CRUD (8 defaults: Laptop, Desktop, Monitor, Printer, Mobile, Headphones, Keyboard/Mouse, Docking)
- Employees CRUD (name, department, manager)
- Locations CRUD
- Assets CRUD with all sections from spec, auto-gen Asset ID via `counters` collection, unique constraint, filter by status/warranty-expiring/department/search
- Maintenance CRUD linked to asset
- Dashboard stats (counts by status, warranty-expiring 30d, by category, by department)
- Frontend: login (Sens logo split-screen), dashboard (KPI grid + charts), assets list (tabs + search + filter), asset detail (locked↔edit with Lock/Edit button), conditional Tech Specs section (Laptop/Desktop only), asset form with 6 sections, employee-selected → auto-fill department, maintenance history inline + global page, employees/locations/categories CRUD pages, settings/change-password page.

## Tested (iterations 1–2)
- Backend: 15/15 pytest green
- Frontend E2E: login, protected routes, logo, all CRUD, auto-gen Asset ID, lock/edit/save cycle, conditional Tech Specs, department auto-fill, warranty-expiring filter, maintenance add/delete, change-password (success/error paths), logout.

## Backlog (P1 / P2)
- P1: Brute-force lockout on login (playbook suggests 5-try lockout)
- P1: Audit trail (who changed what, when) on asset edits
- P2: CSV import/export for bulk onboarding existing fleet
- P2: PDF export of single asset record (for handover)
- P2: Barcode / QR code generation for Asset IDs
- P2: Warranty expiry email alerts
- P2: Multiple photos per asset (object storage)
- P2: Role segregation (viewer vs admin) if the team grows

## Next Tasks
- Add any real employees, locations, and first assets to seed production data.
- Decide whether to enable audit-trail before the team starts using live inventory.
