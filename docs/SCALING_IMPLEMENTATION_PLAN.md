# Scaling Standards — Implementation Plan

Cross-repo plan to bring **Hinthar-SMS** (backend) and **Hinthar-Dashboard** (frontend) in line with:

- `Hinthar-SMS/docs/API_STANDARDS.md`
- `Hinthar-Dashboard/docs/FRONTEND_STANDARDS.md`

Goal: scale students / teachers / class times / attendance safely; **scrap payroll from the product surface**; keep attendance matrices as scoped aggregate routes; introduce consistent pagination and role helpers.

**Last status update:** 2026-08-06 (Clerk resource auth + Phase 0/5/6 polish).

---

## Status at a glance

| Phase | Focus | Status |
|------:|-------|--------|
| 0 | Docs truthfulness, freeze payroll scope, dead nav | **Done** — orphan Support/Feedback/test routes removed; payroll nav scrubbed |
| 1 | Roles + permission helpers + frontend gates | **Done** — `people/roles.py`, permissions, `RequireRole`, pending role, Clerk = identity only |
| 2 | Scrap payroll UI + drop model residue | **Done** — UI cleared; migrations dropped `default_rate` / `bank_details` / `paid` |
| 3 | Pagination + list pages off fetch-all | **Done** — default page 50 / max 200; list pages use `list*Page` + server `q`/filters (no hybrid fetch-all) |
| 4 | Attendance matrix filters + UX split | **Done** — matrix `class_id` 400; Sessions Take roll deep links |
| 5 | Bulk / filter / OpenAPI hygiene | **Done** — `records` preferred; `class_id` aliases; page-boundary tests; error freeze; global handler deferred |
| 6 | Design system, check-in UX, QR lifecycle | **Done** (preset migrate deferred) — ConfirmDialog, timetable empty/legend, thin role homes, Clerk resource auth |
| 7 | Entity detail pages + analytics + teacher cover | **In progress** — student hub shipped; class/teacher hubs next |

### Remaining (priority order)

1. **Class detail hub** — attendance analytics for that class (lesson roll metrics; keep campus check-in labeled separately if shown).
2. **Teacher attendance + substitutes** — how staff mark teacher presence / absences and assign cover (product + API + UI TBD).
3. **shadcn preset `b2C8WxsCO` migrate** — dedicated PR; re-merge semantic tokens after apply.
4. Optional: commit Spectacular schema snapshot; global DRF exception handler.

### Out of scope until product asks

- Reviving `payroll/`
- Clerk multi-session / Pro org switching as the account-switch story (current: sign out → sign-in)
- Student self-service portal

---

## Achieved this conversation cycle (2026-08-06) — student hub + color tokens

### Backend (SMS)

- `Student.check_in_token_active` (+ migration `0013`); regenerate re-activates.
- `POST /students/{id}/activate_check_in_token/` / `deactivate_check_in_token/` (staff+).
- `GET /students/{id}/attendance-summary/?range=week|month|all` — campus check-in vs lesson roll labeled separately (`people/student_analytics.py`).
- QR check-in + lookup reject inactive tokens; lookup **403** payload includes safe `student` summary for terminal card (no blocking top banner required).

### Frontend (Dashboard)

- `/students/[id]/` staff hub: profile, enrollments, QR activate/deactivate/regenerate, attendance charts (Recharts).
- Analytics range tabs use layout-matched skeletons (no spinner overlay).
- Check-in overview: icon-only row actions + pagination.
- Terminal: deactivated QR shown as confirmation-panel card with student info when available.
- Semantic colors: `--success` / `--warning` / `--attendance-*` in `globals.css`; helpers in `lib/status-styles.ts` + `lib/chart-colors.ts`; replaced ad-hoc emerald/rose/amber/sky in management + attendance + terminal.

### Earlier same-day (already on branch)

- Check-in overview aggregate (school-wide dual columns); corrections; matrix `class_id` 400; list pages on server `q` + pagination.

---

## Principles

1. **Standards first, then migrate** — new code follows docs immediately; old endpoints get compatibility aliases during transition.
2. **Backend enforces auth** — frontend role gating is UX only.
3. **No big-bang rewrite** — phased PRs, each shippable.
4. **Payroll frozen** — do not revive `payroll/`; residue removed from live UX and models.

---

## Phase 0 — Align docs & freeze scope

| Task | Status |
|------|--------|
| Treat API + FRONTEND standards as source of truth; link from READMEs | Done |
| Mark payroll as archived in live product docs | Done in standards; some historical docs still mention `paid` |
| Dead nav / empty Support-Feedback | **Done** — routes deleted; `/check-in` redirects to overview |
| Inventory OpenAPI vs real routes | Done for Phase 5 hot paths; schema file optional regen |

---

## Phase 1 — Role hierarchy & permission helpers — DONE

- SMS: `people/roles.py`, permissions refactor, pending role, Clerk JWT syncs identity only.
- Dashboard: role helpers, `RequireRole`, sidebar/page gates, pending access gate.

**Still watch:** teacher-scoped querysets if teacher UI expands.

---

## Phase 2 — Scrap payroll — DONE

- UI: rates, bank, Paid column / copy removed.
- SMS migrations: dropped payroll fields on people + sessions.

---

## Phase 3 — Pagination for unbounded lists — DONE

- SMS: `config/pagination.py` (50 / max 200) as default; catalogs/matrices opt out where intended.
- Dashboard: `Paginated<T>`, `fetchPage` / `list*Page`, `useServerPagination`.
- Browse + search always server-side (`q` + filters). Catalog selects: summary/`page_size` or typeahead — never full student dump into a Select (ad-hoc Add Students follows this).

---

## Phase 4 — Attendance matrix & UX — DONE

| Task | Status |
|------|--------|
| Honor `subject_id` / `teacher_id` on class matrix | Done |
| Split routes: landing / class / adhoc | Done |
| Subject + teacher in column headers | Done |
| Excused in matrix + roster | Done |
| Student identifier under name | Done |
| Ad-hoc: add participants (attendance rows) | Done (search multi-select) |
| Require valid `class_id` → 400 (`all`/`adhoc` too) | Done |
| Sessions → “Take roll” deep link | Done |
| Check-in overview aggregate API | **Done** (`GET /check-ins/overview/`) |

---

## Phase 5 — API hygiene & bulk consistency — DONE

| Task | Status |
|------|--------|
| Ad-hoc bulk_upsert status choices crash | Fixed |
| Document / stabilize `records` body for upsert | Done — prefer `{"records":[…]}`; bare list fallback |
| Canonical FK query params; OpenAPI refresh | Done — `class_id` on session-attendances + class-students; bulk_upsert OpenAPI; schema file regen when env allows |
| Error body consistency | Done for this cycle — domain `{"error"}` (+ optional nested context); DRF validation; **global handler deferred** |
| Page-boundary tests on hot lists | Done — students, teachers, users, sessions, check-ins |

---

## Phase 6 — Design system, check-in UX & QR lifecycle — DONE (preset deferred)

| Task | Status |
|------|--------|
| `/dashboard` redirects to `/` | Done |
| Live KPIs on `/` via `getStats()` | Done |
| shadcn preset `b2C8WxsCO` migrate | Deferred — dedicated PR; preserve semantic tokens |
| Shared `ConfirmDialog` | **Done** — `components/confirm-dialog.tsx` |
| Role-appropriate home surfaces | **Done** — thin teacher/student/pending copy on `/pending` |
| Timetable empty states / legend | **Done** — Empty* + week legend |
| Clerk resource auth (no `createRouteMatcher`) | **Done** — `(public)`/`(app)` layouts + slim `proxy.ts` |
| Semantic color tokens (no ad-hoc emerald/rose/sky) | **Done** — `globals.css` + `lib/status-styles.ts` / `chart-colors.ts` |
| **Check-in correction UI** (delete / amend mis-tap) | **Done** — `/check-in/corrections` + `DELETE /check-ins/{id}/` |
| **Check-in overview redesign** (class picker + checked-in / missing groups) | **Done** — aggregate API; All classes + dual columns; school `status=` pagination; Undo; no fetch-all |
| **QR token activate / deactivate** | **Done** — student hub + management can still view/regenerate |

### Check-in correction — shipped

- Route: `/check-in/corrections/` (staff nav under Check-In).
- List by date + `q` + type filter; single + bulk delete with confirm.
- API: `DELETE /check-ins/{id}/` and `bulk_delete` (staff+ only).
- Safe auto-revert: attendance rows stamped with `auto_marked_by_checkin` are reverted to **Absent** when that check-in is deleted. Later manual roll edits clear the stamp and are preserved.
- After delete, student can check in again via Terminal.

### Check-in overview redesign — shipped

- **Server-side aggregate** `GET /check-ins/overview/` — client never pulls full `students` + `class-students` + `check-ins`. Modes: `classes` | `class` | `school` (`class_id=all`, optional `status=missing|arrived`, paginated) | `search` (paginated).
- Searchable class picker includes **All classes**; URL-backed `class_id` / `date`.
- **Missing** and **Checked in** side by side; school-wide loads each column separately with its own footer; Class column on school rows; progress uses full-day `arrived` / `total`.
- Inline **Undo** on checked-in rows (same safe revert as Corrections); icon-only actions + pagination.
- Debounced school-wide search → paginated jump-to-class table.
- Layout: tables constrained so dual cards do not force page horizontal scroll.

### QR token activate / deactivate — shipped

- Model: `Student.check_in_token_active` (default `True`; migration `0013`).
- API: `POST /students/{id}/activate_check_in_token/`, `deactivate_check_in_token/` (staff+); regenerate re-activates.
- QR check-in + lookup reject inactive tokens; lookup **403** includes safe `student` summary for terminal card.
- UI: `/students/[id]` hub (primary); terminal shows confirmation-panel card (not a blocking top banner).

---

## Phase 7 — Entity detail hubs, analytics, teacher cover — IN PROGRESS

Product goal: deep links from list pages into per-entity surfaces; stop bouncing staff to Class / Check-In Management for everyday enrollment and QR work.

### Student detail (`/students/[id]`) — **shipped**

| Capability | Status |
|------------|--------|
| Profile + identifiers | Done |
| **Analytics** (campus vs lesson, labeled separately; `range=week\|month\|all`) | Done — `GET /students/{id}/attendance-summary/` |
| Enrolled classes (list + enroll / unenroll) | Done |
| QR management (view / regenerate / activate / deactivate) | Done |

### Class detail (`/classes/[id]` or extend attendance class route) — next

| Capability | Notes |
|------------|--------|
| **Attendance analytics only** (v1) | Roll rates, excused, trends by subject/teacher/time — not a second full matrix rewrite |
| Optional later | Roster shortcuts, timetable summary |

Likely API: scoped **class attendance summary** aggregate (reuse matrix filters mentally; do not dump unbound lists).

### Teacher attendance + substitutes — next

| Capability | Notes |
|------------|--------|
| Teacher presence / absence tracking | Product decision: per session, per day, or both? |
| Substitutes / cover | Assign cover teacher to a session (or day); show on roll / timetable |
| Teacher detail page | Analytics + upcoming sessions + cover history |

Likely needs **new SMS models/routes** (no substitute concept in live product today) — design before coding.

### Suggested next-cycle order

```text
1  Class detail: attendance analytics aggregate + UI
2  Teacher attendance + substitute model/API spike → UI
3  Teacher detail hub (if spike lands)
4  Phase 5 OpenAPI / bulk hygiene
5  Phase 6 ConfirmDialog + preset pass
```

---

## Moving forward (recommended next work)

```text
Next 1  Class attendance analytics hub
Next 2  Teacher attendance + substitutes (design → API → UI)
Next 3  Phase 5 OpenAPI / bulk hygiene
Next 4  Phase 6 ConfirmDialog + preset pass
Next 5  Teacher scoped querysets (if teacher login is imminent)
```

Analytics product sketch: class roll (have), **student profile trends** (have), **class attendance summary**, teacher/subject coverage, school heatmaps — **never** mix campus check-in rate with lesson roll without labeling.

---

## Suggested PR sequence (historical)

```text
PR-A  docs only (standards + this plan)                          ✓
PR-B  roles.py + permission refactor + tests (SMS)               ✓
PR-C  frontend roles + sidebar/page gates (Dashboard)            ✓
PR-D  scrap payroll UI (Dashboard)                               ✓
PR-E  pagination backend + API client envelope                   ✓
PR-F  migrate list pages to server pagination                    ✓
PR-G  matrix filters + attendance UX split + class_id 400 + Take roll  ✓
PR-H  payroll field deprecation migrations (SMS)                 ✓
PR-I  check-in correction + overview aggregate (school/search)   ✓
PR-J  student hub + QR activate/deactivate + attendance-summary  ✓
PR-K  class detail hub + analytics                               ← next
PR-L  teacher attendance + substitutes                              ← next
PR-M  design-system preset + ConfirmDialog                       ← can parallelize
```

---

## Success metrics

| Area | Signal |
|------|--------|
| Scale | Listing 5k+ sessions/check-ins stays fast (paged); matrix monthly for one class stays &lt; 2s p95; overview never fetch-alls |
| Auth | Teacher token cannot list all students; terminal cannot PATCH teachers |
| UX | New staff can mark a class roll in &lt; 3 clicks after class is known; no payroll fields visible; enroll + QR from student page |
| Docs | OpenAPI + standards match running code; no fake pagination envelopes |

---

## Open decisions (product)

1. **Should terminal read the full attendance matrix?** Standards allow read for terminal+; product may restrict matrix to staff+.
2. **Teacher portal depth** this quarter vs staff-only dashboard?
3. ~~**Keep `paid` boolean**~~ — **dropped** with payroll residue.
4. **Clerk role sync** vs admin-only Django role assignment — **Django remains source of truth**; Clerk carries identity claims only.
5. **Teacher attendance grain** — session-level vs day-level vs both?
6. **Substitute model** — replace teacher on `Session` only, or also timetable-slot defaults + ad-hoc?

---

## Opinion summary

| Proposal | Recommendation |
|----------|----------------|
| Scrap payroll | **Done** — do not revive |
| Paginated lists + server search | **Done** — keep as the only list pattern |
| Attendance matrices as scoped routes | **Done pattern** |
| Check-in overview aggregate | **Done** — keep school dual-column + status pagination |
| Hierarchy Admin &gt; Staff &gt; Terminal &gt; Teacher / Student | **Done** — keep tests green as routes change |
| Entity detail hubs + analytics | **Student hub done**; class + teacher next |
| Teacher cover / substitutes | **Next** — design models before UI |
| Semantic color tokens | **Done** — prefer tokens over palette utilities |

The main remaining scale risks are **OpenAPI drift**, **teacher over-open reads** (if teachers log in), and **missing class/teacher analytics / cover workflows** — not unbounded check-in overview downloads or payroll UI.
