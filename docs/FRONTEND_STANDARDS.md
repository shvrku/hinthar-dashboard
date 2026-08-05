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
| **Lesson attendance** | Present / late / absent / excused **per class or ad-hoc session** | `/attendance/`, `/attendance/class/[classId]/`, `/attendance/adhoc/` |
| **Campus check-in** | Daily building presence via QR / terminal | `/check-in/overview`, `/management`, `/terminal` |
| **Payroll / finance** | **Out of scope** — residue removed from live UI/API | none |

Staff confusion risk: keep **Session Attendance** vs **Check-In** verbally separate (campus presence ≠ lesson roll).

Scaling status / next work: `docs/SCALING_IMPLEMENTATION_PLAN.md`.

---

## 2. UX review (current pages)

Verdicts are for **front-office / academic staff**, not developers.

### Strengths

- Management list pages share header → KPIs → search → table → dialogs → **server** pagination (`page` / `page_size` + `q`).
- Session attendance uses matrix aggregates with Matrix vs Roster; routes split by class vs ad-hoc.
- Check-in terminal is lookup → confirm → commit (no token leakage in UI).
- Role gates via `RequireRole` / sidebar filtering; Clerk is identity, Django owns role.

### Issues by page (as of 2026-08-06)

| Page | Graspability | Notes |
|------|--------------|-------|
| `/` (Overview) | Medium | Prefer live KPIs here (Phase 6); `/dashboard` redirects to `/`. |
| `/classes` | Good | Enrollment dialogs are dense but learnable. |
| `/teachers` | Good | Payroll rate/bank fields removed. |
| `/students` | Good | Server search + pagination; bulk import helps scale. |
| `/subjects` | Good | Simple catalog. |
| `/users` | Good | Server `q` + role filter. |
| `/timetable` | Medium | Empty states / legend still thin. |
| `/sessions` | Medium | Timetabled vs ad-hoc toggle easy to miss; Paid residue gone. |
| `/attendance/` | Better | Landing → class or ad-hoc. Remaining: deep links from Sessions; optional density polish. |
| `/attendance/class/[classId]/` | Good | Server subject/teacher filters; headers show subject · teacher; identifiers under names; excused supported. |
| `/attendance/adhoc/` | Good | Add Session + **Add Students** (server search, load-more). Empty grid until students added. |
| `/check-in/overview` | Medium–good | Needs redesign: class-first picker; group **Checked in** vs **Missing** (see scaling plan Phase 6). |
| `/check-in/management` | Good | QR view + regenerate. Todo: activate/deactivate tokens. |
| `/check-in/corrections` | Good | Undo mis-tap campus check-ins; auto-reverts lesson marks attributed to that check-in. |
| `/check-in/terminal` | Good | Purpose-built. |
| `/support`, `/feedback` | Placeholder | Hide until real. |
| Auth / roles | Addressed | Gates exist; still enforce API scoping for teachers/students. |

### Attendance UX — current contract

1. Routes: `/attendance/` landing; `/attendance/class/[classId]?…`; `/attendance/adhoc/?…`.
2. Matrix APIs remain the only way to load grids — do not rebuild from paginated attendance lists.
3. Column headers: subject, teacher, date, time. Student secondary line: `unique_code`.
4. Ad-hoc participants = attendance rows created via Add Students (start **absent**).
5. Sessions **Take roll** deep-links into class/ad-hoc roster with `session_id` (+ date filters).

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
| Lists | Use **server pagination** (`page`, `page_size`) + server `q`/filters — never fetch-all then slice |
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

**Done** — do not reintroduce rate / bank / paid fields. Historical checklist (completed):

| Location | Action |
|----------|--------|
| `app/teachers/page.tsx` | Rate / bank removed |
| `components/bulk-import-modal.tsx` | Teacher CSV rate/bank columns removed |
| `app/sessions/page.tsx` | Paid column / form / paid-delete copy removed |
| `lib/types.ts` | Payroll fields dropped |
| `app/layout.tsx` metadata | Payroll wording removed |

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

Status labels: **Present**, **Late**, **Absent**, **Excused** (Title Case in UI).

---

## 7. Design system note

- Follow shadcn skill / CLI; preset `b2C8WxsCO` when initializing or migrating tokens.
- Until the preset is applied consistently, new UI must still use existing `components/ui` and CSS variables — no one-off color systems on individual pages.
- Ignore nested `time_table/` tree for product work (legacy fork risk).
