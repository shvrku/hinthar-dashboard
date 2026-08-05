# Hinthar-Dashboard Frontend Standards & UX Review

Standards for the Next.js App Router dashboard as the school management UI scales. Design system target: **shadcn/ui** with preset `b2C8WxsCO` (see `.agents/rules/style-guide.md`). Current install uses **base-maia / mist** in `components.json` — align to the chosen preset in a dedicated design-system pass.

Backend contract: follow `Hinthar-SMS/docs/API_STANDARDS.md` in the sibling SMS repository.

---

## 1. Product domains (mental model for staff)

Keep these **visually and verbally separate** in nav and page titles:

| Domain | What it means | Primary routes |
|--------|---------------|----------------|
| **People & classes** | Students, teachers, subjects, class cohorts, enrollment | `/students`, `/teachers`, `/subjects`, `/classes` |
| **Schedule** | Weekly slots → generated dated sessions; ad-hoc tutoring | `/timetable`, `/sessions` |
| **Lesson attendance** | Present / late / absent **per class session** | `/attendance` (+ future scoped routes) |
| **Campus check-in** | Daily building presence via QR / terminal | `/check-in/overview`, `/management`, `/terminal` |
| **Payroll / finance** | **Out of scope** — remove UI residue | none |

Staff confusion risk today: sidebar label **“Attendance Matrix”** vs **“Check-In”**. Prefer:

- Operations → **Session Attendance**
- Check-In → keep as campus gate

---

## 2. UX review (current pages)

Verdicts are for **front-office / academic staff**, not developers.

### Strengths

- Management pages (`/classes`, `/teachers`, `/students`, `/subjects`) share a recognizable pattern: header → KPIs → search → table → dialogs → client pagination.
- Session attendance already uses the **matrix API** (correct aggregate choice) with Matrix vs Roster modes.
- Check-in terminal is a clear single-purpose kiosk surface.
- Sidebar groups Management vs Operations vs Check-In is a good start.

### Issues by page

| Page | Graspability | Notes |
|------|--------------|-------|
| `/` (Overview) | Weak | Static “module launcher”; live KPIs live on orphan `/dashboard`. Staff open “Dashboard” and do not see live counts. |
| `/dashboard` | Good data, bad discovery | Not in sidebar. Merge into `/` or link it. |
| `/classes` | Good | Enrollment dialogs are dense but learnable. |
| `/teachers` | Mixed | **Default rate / bank details** look like required HR/payroll — scrap for now. |
| `/students` | Good | Bulk import helps scale. |
| `/subjects` | Good | Simple catalog. |
| `/timetable` | Medium | Custom week grid is powerful; empty states and “which class?” must be obvious. New staff need a short legend (slot = recurring; sessions generated from slots). |
| `/sessions` | Medium | Timetabled vs ad-hoc toggle is easy to miss. **Paid** column is payroll residue — remove. Delete messaging about paid sessions confuses. |
| `/attendance` | Hard for new staff | Very dense control bar (mode + range + layout + filters). Subject/teacher filters are **client-only** (not sent to API) → slow monthly grids. Present vs late colors too similar. Column headers lack subject names at a glance. Auto-selects first class (wrong-class risk). Dual search fields (matrix vs roster). ~1.4k-line mega-page. |
| `/check-in` root | Bad | Dead-end / easter-egg — remove or redirect to overview. |
| `/check-in/overview` | Medium–good | Cohort tables for a date are understandable once “campus presence ≠ lesson roll” is clear. |
| `/check-in/management` | Good for admins | QR token ops; not for every staff role. |
| `/check-in/terminal` | Good | Purpose-built. |
| `/support`, `/feedback` | Placeholder | Fine as stubs; hide until real. |
| Auth / roles | Critical gap | Any signed-in Clerk user sees full nav and all actions. No role-based hiding. Teachers/students would see admin tooling if given login. |

### Attendance UX recommendations

1. **Split information architecture** (recommended):
   - `/attendance` — landing: pick class + date mode, then open matrix or roster.
   - `/attendance/class/[classId]` — class matrix with query string scopes:
     - `?month=8&year=2026`
     - `?date_from=2026-08-01&date_to=2026-08-31`
     - `?subject_id=` / `?teacher_id=` (must be passed to API once backend honors them)
     - `?layout=matrix|roster`
     - `?session_id=` when layout=roster
   - Optional later: `/attendance/sessions/[sessionId]` — single-session roster (deep link from Sessions table).

2. **Keep matrix as its own API-backed view** — do not rebuild from paginated `/session-attendances/` lists.

3. **Visual hierarchy**: sticky student column + subject short code in column headers; distinct colors for present / late / absent / unmarked; “unmarked” ≠ “absent” if records missing.

4. **Reduce control density**: primary = Class + Date range; secondary (collapsed) = Subject, Teacher, Layout.

5. **Remove auto-select first class** — require explicit class choice (or remember last class in `localStorage`).

---

## 3. Frontend architecture standards

### Routing

- App Router only under `app/`.
- One primary page per concern; avoid mega-pages > ~400 lines — extract hooks (`useAttendanceMatrix`) and presentational components.
- Trailing slashes stay on (`trailingSlash: true`) to match Django.

### Auth & roles

| Layer | Standard |
|-------|----------|
| Clerk | Middleware (`proxy.ts`) protects app routes; public: sign-in/up only |
| Identity | Call `GET /me/` after sign-in; cache role on client context |
| Nav | Filter sidebar items by `isStaffOrAbove` / `isTerminalOrAbove` / etc. |
| Page gate | Shared `<RequireRole minimum="staff" />` (or allow-list) |
| Actions | Hide destructive buttons the role cannot call (still enforced by API) |

Mirror backend helpers in `lib/roles.ts`:

```ts
export const ROLE_RANK = { student: 1, teacher: 2, terminal: 3, staff: 4, admin: 5 } as const
export function isStaffOrAbove(role: Role) { … }
// isAdmin, isTerminalOrAbove, isTeacherOrAbove, isAtLeast
```

Terminal UI: only check-in routes (+ read-only views if product wants). Teachers: own timetable / sessions / attendance (once API scopes exist).

### Data fetching

| Rule | Detail |
|------|--------|
| Client | `createApi(token)` from `lib/api.ts` remains the single HTTP surface |
| Lists | Prefer **server pagination** params `page`, `page_size` once backend enables them |
| Aggregates | Matrix / stats only via dedicated helpers (`getAttendanceMatrix`, …) |
| Cache | Keep short TTL GET cache for catalogs; invalidate on mutation |
| Avoid | Fetch-all + `usePagination` slice for unbounded resources |

When adding a paginated list page:

1. Add/extend `lib/api.ts` method with `page` / `page_size` and typed envelope `{ count, next, previous, results }`.
2. Store `page`, `pageSize`, `total` in page state (or URL search params — preferred for shareable staff links).
3. Wire `StandardTablePagination` to server `count`, not `filtered.length`.
4. Put filters in the URL (`?class_id=&q=`) so refresh preserves context.
5. Loading: skeleton table; empty: one clear CTA.

### UI composition

- Use shadcn primitives from `components/ui/` — do not reinvent Select/Dialog/Table.
- Shared chrome: `StandardPageHeader`, KPI strip, confirm dialog (**one** shared `ConfirmDialog`, not per-page copies).
- Forms: consistent required-field marking; no payroll fields on teachers/sessions.
- Motion: keep existing subtle stagger; do not add decorative noise.

### Payroll UI scrap list

| Location | Action |
|----------|--------|
| `app/teachers/page.tsx` | Remove rate / bank fields & columns |
| `components/bulk-import-modal.tsx` | Remove teacher CSV rate/bank columns |
| `app/sessions/page.tsx` | Remove Paid column / form / paid-delete copy |
| `lib/types.ts` | Drop or deprecate `default_rate`, `bank_details`, `paid` |
| `app/layout.tsx` metadata | Remove “payroll” from description |

---

## 4. How to add a new paginated management route (frontend)

Example: `/audit-logs` backed by `GET /api/v1/audit-logs/?page=&page_size=`.

1. **Types** in `lib/types.ts` for the entity + `Paginated<T>`.
2. **API** helper: `listAuditLogs({ page, page_size, …filters })` returning the envelope (do not auto-unwrap `results` only — expose `count`).
3. **Page** `app/audit-logs/page.tsx`:
   - `RequireRole minimum="admin"`
   - Read `page` / filters from `useSearchParams`
   - `useEffect` load on param change
   - Table + `StandardTablePagination`
4. **Sidebar** entry under the right group, role-filtered.
5. **Empty / error** states with retry.
6. Do **not** add client-only pagination over a full download.

For **select dropdowns** that need many students: use a dedicated options endpoint or typeahead search API — never load the full student list into a Select.

---

## 5. How to add a scoped attendance overview route

When a new overview is needed (e.g. class attendance for a term):

1. Confirm backend aggregate exists or add one per API standards (prefer `/attendance/...` prefix).
2. Add `lib/api.ts` getter with explicit params (`class_id`, dates, `subject_id`, …).
3. Add route under `/attendance/...` with params in the **path** (class id) and **query** (dates/filters).
4. Page responsibilities:
   - Validate class id
   - Show active filter chips (class name, month, subject)
   - Matrix and/or roster only — no unrelated KPIs from other domains
5. Deep-link from `/sessions` (“View roll”) and `/classes` (“Attendance”).

---

## 6. Naming & copy standards

| Instead of | Prefer |
|------------|--------|
| Attendance Matrix (nav) | Session Attendance |
| Paid session | (remove) |
| Default rate | (remove until payroll) |
| Dashboard (static home) | Overview **or** live Stats dashboard |

Status labels: **Present**, **Late**, **Absent** (Title Case in UI). If `excused` is supported in types, either implement it in the picker or remove from types.

---

## 7. Design system note

- Follow shadcn skill / CLI; preset `b2C8WxsCO` when initializing or migrating tokens.
- Until the preset is applied consistently, new UI must still use existing `components/ui` and CSS variables — no one-off color systems on individual pages.
- Ignore nested `time_table/` tree for product work (legacy fork risk).
