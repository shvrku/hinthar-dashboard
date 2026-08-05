# Scaling Standards — Implementation Plan

Cross-repo plan to bring **Hinthar-SMS** (backend) and **Hinthar-Dashboard** (frontend) in line with:

- `Hinthar-SMS/docs/API_STANDARDS.md`
- `Hinthar-Dashboard/docs/FRONTEND_STANDARDS.md`

Goal: scale students / teachers / class times / attendance safely; **scrap payroll from the product surface**; keep attendance matrices as scoped aggregate routes; introduce consistent pagination and role helpers.

---

## Principles

1. **Standards first, then migrate** — new code follows docs immediately; old endpoints get compatibility aliases during transition.
2. **Backend enforces auth** — frontend role gating is UX only.
3. **No big-bang rewrite** — phased PRs, each shippable.
4. **Payroll frozen** — do not revive `payroll/`; remove residue from live UX and then from models.

---

## Phase 0 — Align docs & freeze scope (0.5–1 day)

| Task | Repo | Done when |
|------|------|-----------|
| Treat `API_STANDARDS.md` + `FRONTEND_STANDARDS.md` as source of truth | both | Linked from each README |
| Mark payroll sections in old docs as archived / historical | both | README no longer lists payroll routes as live |
| Remove or redirect `/check-in` easter-egg; hide Support/Feedback if empty | Dashboard | No dead-end primary nav |
| Inventory OpenAPI vs real routes (`class-students` vs `timetable-students`) | SMS | README corrected |

**Out of scope this cycle:** building a real payroll module; student/teacher self-service portals beyond permission scaffolding.

---

## Phase 1 — Role hierarchy & permission helpers (2–4 days)

### Backend

1. Add `people/roles.py` with `ROLE_RANK` and helpers: `is_admin`, `is_staff_or_above`, `is_terminal_or_above`, `is_teacher_or_above`, `is_at_least`.
2. Refactor `people/permissions.py` to use helpers; rename for clarity:
   - Keep `IsAdmin`, `IsStaffOrAdmin` → alias/rename to `IsStaffOrAbove`
   - Keep `IsTerminalOrAbove`, `CanCheckIn`, ownership classes
   - Replace informal `role in (...)` in views with helpers
3. Audit every ViewSet `permission_classes` + `get_queryset()`:
   - Staff+: full operational CRUD
   - Terminal: SAFE methods globally where intended; write only check-in
   - Teacher: **scoped** querysets (own classes/sessions/attendance) — stop bare `IsAuthenticated` school-wide lists
   - Student: own profile / token only
4. Tests: matrix of role × method × key endpoints (403 vs 200).

### Frontend

1. Add `lib/roles.ts` mirroring ranks/helpers.
2. Fetch `/me/` into a small `CurrentUserProvider` (role + profile ids).
3. Filter `app-sidebar.tsx` by role; wrap pages with `RequireRole`.
4. Terminal users land on `/check-in/terminal` (or overview) — not full admin chrome if possible.

**Risk:** teachers today may rely on overly open list endpoints. Coordinate queryset scoping with any teacher UI you already use.

---

## Phase 2 — Scrap payroll from the live product (1–2 days)

### Frontend (do first — no migration needed)

- Teachers: remove default rate / bank fields, columns, bulk-import columns.
- Sessions: remove Paid column, form state, paid-delete user copy.
- Types/metadata: drop payroll wording.

### Backend (follow-up migration)

1. Stop returning / requiring `default_rate`, `bank_details` in serializers (make optional then remove).
2. Deprecate `paid` on Session / AdHocSession: stop filtering/guards in API; migration to drop columns in a later PR.
3. Leave `payroll/` app commented and in `INSTALLED_APPS` until a dedicated “drop payroll tables” migration is scheduled.

---

## Phase 3 — Pagination for unbounded lists (3–5 days)

### Backend

1. Add `config/pagination.py` → `StandardPageNumberPagination` (page_size 50, max 200).
2. Set as `DEFAULT_PAGINATION_CLASS`.
3. Explicitly set `pagination_class = None` only on true aggregates (`AttendanceMatrixView`, stats) and optionally tiny catalogs.
4. Fix timetable teacher/class views: real pagination or plain list — no fake envelopes.
5. Standardize filter names (`class_id`, `date_from`, `date_to`); keep aliases deprecated.
6. Tests for page boundaries on `sessions`, `students`, `session-attendances`, `check-ins`.

### Frontend

1. Change `lib/api.ts` list helpers to expose `{ count, results, next, previous }` (today many paths unwrap `results` only — keep unwrap helper for aggregates, not for paginated lists).
2. Migrate pages in order of pain: **Sessions → Students → Teachers → Check-in management → Session attendances (if listed) → Classes**.
3. Replace client `usePagination` slice with URL-driven `page` + server `count`.
4. Catalog selects: either `page_size=200` cap or options/typeahead endpoint.

**Rollback:** feature-flag or temporary `?page_size=` high default only if a specific admin tool breaks.

---

## Phase 4 — Attendance matrix & UX (3–5 days)

### Backend

1. Honor `subject_id` / `teacher_id` on `GET /attendance/matrix/` (today documented but unused).
2. Require valid `class_id` → **400** if missing/invalid (stop empty-200 for `all`).
3. Ad-hoc matrix: never expand to all students when empty.
4. ISO-8601 datetimes in matrix (already) and align session serializers over time.
5. Optional: `GET /check-ins/overview/?date=&class_id=` to replace heavy client assembly.
6. Optional: `GET /attendance/session/{id}/roster/` for deep links.

### Frontend

1. Rename nav to **Session Attendance**.
2. Split `/attendance` mega-page:
   - Landing / filters
   - `/attendance/class/[classId]?month&year|date_from&date_to&subject_id&teacher_id&layout&session_id`
3. Pass subject/teacher to API; show subject in column headers; fix present/late contrast; require explicit class selection.
4. Link from Sessions (“Take roll”) → roster route.

---

## Phase 5 — API hygiene & bulk consistency (2–3 days)

1. Single bulk mixin behavior documented; attendance `bulk_upsert` body key `records` only (accept list temporarily).
2. Canonical FK query params; remove unused OpenAPI params or implement them.
3. Error body consistency for manual `{"error"}` vs DRF validation.
4. Throttle check-in remains; consider staff write throttles later.
5. Refresh Spectacular descriptions to match standards.

---

## Phase 6 — Design system & page graspability (ongoing)

1. Apply shadcn preset `b2C8WxsCO` / migrate tokens from base-maia carefully.
2. Merge `/` and `/dashboard` into one live overview for staff.
3. Shared `ConfirmDialog`; delete per-page duplicates.
4. Timetable empty states + one-line legend (slots generate sessions).
5. Remove nested unused `time_table/` from the product repo when safe (or document “ignore”).
6. Role-appropriate home: staff → overview KPIs; terminal → check-in; teacher → today’s classes (when scoped).

---

## Suggested PR sequence

```text
PR-A  docs only (standards + this plan)                          ← current
PR-B  roles.py + permission refactor + tests (SMS)
PR-C  frontend roles + sidebar/page gates (Dashboard)
PR-D  scrap payroll UI (Dashboard)
PR-E  pagination backend + API client envelope (SMS + Dashboard)
PR-F  migrate list pages to server pagination (Dashboard)
PR-G  matrix filters + attendance UX split (SMS + Dashboard)
PR-H  payroll field deprecation migrations (SMS)
PR-I  design-system preset + overview merge (Dashboard)
```

---

## Success metrics

| Area | Signal |
|------|--------|
| Scale | Listing 5k+ sessions/check-ins stays fast (paged); matrix monthly for one class stays &lt; 2s p95 |
| Auth | Teacher token cannot list all students; terminal cannot PATCH teachers |
| UX | New staff can mark a class roll in &lt; 3 clicks after class is known; no payroll fields visible |
| Docs | OpenAPI + standards match running code; no fake pagination envelopes |

---

## Open decisions (product)

1. **Should terminal read the full attendance matrix?** Standards allow read for terminal+; product may restrict matrix to staff+.
2. **Teacher portal depth** this quarter vs staff-only dashboard?
3. **Keep `paid` boolean** as a non-payroll “settled” flag, or drop entirely?
4. **Clerk role sync** vs admin-only Django role assignment (recommended: Django remains source of truth until sync is designed)?

---

## Opinion summary

| Proposal | Recommendation |
|----------|----------------|
| Scrap payroll | **Yes** — UI now, model residue next |
| Paginated list routes + written add-route recipe | **Yes** — required for sessions/attendances/check-ins/students |
| Attendance matrices as own scoped routes | **Yes — already correct pattern**; tighten params and split frontend routes |
| Hierarchy Admin &gt; Staff &gt; Terminal &gt; Teacher / Student + helpers | **Yes** — implement `roles.py` + mirror on frontend |
| Reusable `IsStaffOrAbove`-style checks | **Yes** — replace scattered role tuples |

The codebase is a solid DRF + Next foundation; the main scale risks are **unbounded lists**, **over-open teacher reads**, **attendance page cognitive load**, and **payroll residue**. Standards docs above are the contract; this plan is the migration path.
