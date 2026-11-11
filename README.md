# Hinthar Dashboard — School Management Frontend

Next.js 16 (App Router) operational interface for the Hinthar Education Center & School Management System, paired with the sibling Django REST backend (**Hinthar-SMS**). Built around a high-density, Two-Mode Tactical Monochrome design system and consolidated into 7 core operational workspaces.

---

## Documentation Suite

| Document | Contents |
| :--- | :--- |
| **[`docs/DESIGN_SYSTEM_AND_STYLING.md`](docs/DESIGN_SYSTEM_AND_STYLING.md)** | Two-Mode Tactical Monochrome tokens (`Light` & `Dark`), 3-tier surface hierarchy, `4px`/`2px` geometry, V2 primitive specifications (`SystemHeader`, `DataModule`, `CohortSwitcher`, `RollStatusControl`, `InspectorSheet`, `AttendanceMatrixView`), GSAP motion & directional table reveals, and TypeScript domain contracts. |
| **[`docs/FRONTEND_DATA_FLOW_AND_CONTROLS.md`](docs/FRONTEND_DATA_FLOW_AND_CONTROLS.md)** | ASCII architecture & data-flow diagrams, Next.js API proxy & Clerk JWT flow, role access gates, and a complete **button-by-button / function-by-function catalog** across every workspace, tab, drawer, and modal. |

Sibling Backend Documentation (`Hinthar-SMS`):
- **[`Hinthar-SMS/docs/BACKEND_DATA_MODELS_AND_SCHEMA.md`](../../Hinthar-SMS/Hinthar-SMS/docs/BACKEND_DATA_MODELS_AND_SCHEMA.md)**
- **[`Hinthar-SMS/docs/BACKEND_ENDPOINTS_AND_FUNCTIONS.md`](../../Hinthar-SMS/Hinthar-SMS/docs/BACKEND_ENDPOINTS_AND_FUNCTIONS.md)**

---

## Consolidated Workspace Architecture

1. **Role Dispatcher (`/`, `/pending`, `/account-locked`)** — Post-login router inspecting `GET /api/v1/me/`: routes deactivated users (`is_active=false`) to `/account-locked`, unmatched/pending users to `/pending`, terminal accounts to `/check-in/terminal`, linked students/teachers to their own detail hub, and staff/admins to `/overview`.
2. **Overview (`/overview`)** — Live 30-day trend KPIs, 12-month student enrollment growth chart (with CSV/PNG export), and categorized audit log feed from `GET /api/v1/stats/`.
3. **Campus Check-In (`/check-in` & `/check-in/terminal`)** — Unified `Daily Roll` (Arrived vs Missing per cohort with `Mark Arrived`) and `Scan Log & Undo` (single/bulk undo that safely reverts auto-marked lesson attendance), clamped to historical/today dates (`max={todayStr}`), plus the camera QR & manual ID Kiosk Terminal.
4. **Lesson Attendance (`/attendance`)** — Dual-mode workspace (`Daily Session Roll` + `Monthly & Subject Matrix`) with `CohortSwitcher`, `AD-HOC` tutoring session mode, `RollStatusControl` (`P` / `L` / `A` / `E`), sticky `RANGE SUMMARY` columns, and atomic `bulk_upsert` saves.
5. **Schedule (`/schedule`)** — 7-day (`MON`–`SUN`) flexible education-center timetable grid, inline `+ SCHEDULE SLOT` creation, Slot `InspectorSheet` (`Dated Occurrences` & `Substitute Teacher` assignment), and batch `Generate Sessions` date-range drawer.
6. **Academics (`/classes` & `/classes/[id]`)** — Unified `Cohorts` and `Subject Catalog` workspace with Cohort `InspectorSheet` (`Overview & Offerings` | `Edit Cohort`), inline subject creation, primary cohort enrollment, and cross-cohort elective/drop overrides with live conflict warnings.
7. **Directory (`/students`, `/students/[id]`, `/teachers`, `/teachers/[id]`)** — Paginated student & faculty registries, RFC-4180 CSV `BulkImportModal`, Student `InspectorSheet` (`QR Pass & Telemetry` with `Rotate Token`, `PNG`, `Print`, `Activate/Deactivate Pass` | `Edit Profile`), and Student/Teacher Detail Hubs.
8. **Communications (`/communications`, `/announcements/*`, `/events/*`)** — Unified staff communications workspace and public/member portals for markdown announcements and event registration/waitlist management.
9. **User Administration & Matching (`/users/management`, `/users/matching/*`)** — Admin-only Clerk directory sync/import, guarded role & active status controls, and 1:1 Clerk account ↔ Student/Teacher profile linking.

---

## Project Pass Status

### Completed in This Pass
- [x] **V2 Tactical Monochrome Design System & 16-to-7 Workspace Consolidation**
- [x] **Role Dispatcher, Access Gates (`AppAccessGate`, `RequireRole`) & Account Bootstrap**
- [x] **Overview Dashboard (30-Day Trend KPIs, Enrollment Series Chart & Audit Feed)**
- [x] **Campus Check-In Consolidation (`Daily Roll`, `Scan Log & Undo`, Date Clamping & Kiosk Terminal)**
- [x] **Dual-Mode Lesson Attendance (`Daily Session Roll`, Sticky `AttendanceMatrixView` & Ad-Hoc Tutoring)**
- [x] **7-Day Flexible Timetable Grid, Substitute Teacher Cover & Batch Session Generator**
- [x] **Academics Hub (`Cohorts | Subject Catalog`, Course Offerings & Student Enrollment Conflict Detection)**
- [x] **Student & Faculty Directory, CSV Bulk Import, QR Pass `InspectorSheet` & Entity Detail Hubs**
- [x] **School Communications (Announcements Press Feed, Markdown Editor & Events Registration/Management)**
- [x] **Admin User Management, Clerk Sync Modal & Student/Teacher Profile Matching**

### Remaining for Next Pass
- [ ] **Pay-Roll for Teachers & Student Fee Payments**
- [ ] **Exam Tracking & Academic Report Cards**

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Configure Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) and `BACKEND_API_ORIGIN` / `NEXT_PUBLIC_API_ORIGIN` (default `http://localhost:8000`) in `.env.local`.
