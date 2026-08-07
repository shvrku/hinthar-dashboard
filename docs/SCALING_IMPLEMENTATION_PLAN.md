# Scaling Standards — Implementation Plan

Cross-repo plan to bring **Hinthar-SMS** (backend) and **Hinthar-Dashboard** (frontend) in line with:

- `Hinthar-SMS/docs/API_STANDARDS.md`
- `Hinthar-Dashboard/docs/FRONTEND_STANDARDS.md`

Goal: scale students / teachers / class times / attendance safely; **scrap payroll from the product surface**; keep attendance matrices as scoped aggregate routes; introduce consistent pagination and role helpers.

**Last status update:** 2026-08-07 (Phase 8 Find sessions + substitute UX ownership + datetime ISO standardization).

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
| 6 | Design system, check-in UX, QR lifecycle | **Done** — ConfirmDialog, timetable empty/legend, thin role homes, Clerk resource auth; shadcn **base-vega / zinc** + Chart |
| 7 | Entity detail pages + analytics + teacher cover | **Done** — student / class / teacher hubs; `actual_teacher` cover; row-click lists |
| 8 | Find sessions hub, substitute UX, datetime standards | **Done** — slot-first finder; substitute on `/sessions`; ISO DateTime wire format |

### Remaining (priority order)

1. Optional: commit Spectacular schema snapshot; global DRF exception handler.
2. Teacher-scoped querysets (if teacher login is imminent).
3. Teacher check-in writing `actual_teacher` (deferred — field reserved; staff assign via Sessions / Find sessions today).
4. Optional polish: deep-link Find sessions from teacher hub recent rows; ad-hoc substitute UI parity if product wants it on ad-hoc edit.

### Out of scope until product asks

- Reviving `payroll/`
- Clerk multi-session / Pro org switching as the account-switch story (current: sign out → sign-in)
- Student self-service portal
- Day-level teacher attendance; dedicated `substituted` session status
- Removing `/sessions` table (kept for lookup + bulk)

---

## Achieved this conversation cycle (2026-08-07) — Find sessions + datetime

### Backend (SMS)

- `GET /sessions/?timetable_slot_id=` filter (+ date_from/date_to) for slot occurrence lists.
- `GET /timetable-slots/?class_id=` filter (Find sessions / editors must not load all-school slots).
- Session DateTime API output standardized to **ISO-8601** (`SessionSerializer`, attendance-list nested times, generate summaries). Legacy `dd/mm/yy HH:MM:SS` still accepted on **input**.
- Prior Phase 7: class/teacher attendance-summary, `actual_teacher` on Session / AdHocSession.

### Frontend (Dashboard)

- **Find sessions** (`/sessions/find/` → `/sessions/find/[classId]/` week grid → `/sessions/find/[classId]/[slotId]/` filtered table + edit dialog).
- Substitute ownership: teacher hub Recent sessions **read-only**; assign/clear substitute on `/sessions` edit + Find slot edit; `SessionTeacherCell` (Substitute badge + Assigned tooltip).
- Timetable / attendance / find landings: class picker cards centered; headers stay full-width.
- Month KPI stats on attendance class/adhoc exclude future sessions (pregenerated absents).
- Shared datetime helpers in `lib/utils.ts` (`parseBackendDateTime`, `formatBackendDateTime`, `toSessionDateString`, `formatSlotClock`, …); attendance/sessions/check-in call sites migrated.

### Earlier (2026-08-06) — Phase 7 hubs

- Student / class / teacher hubs; shadcn charts; row-click lists; `actual_teacher` cover model.

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

## Phase 6 — Design system, check-in UX & QR lifecycle — DONE

| Task | Status |
|------|--------|
| `/dashboard` redirects to `/` | Done |
| Live KPIs on `/` via `getStats()` | Done |
| shadcn install (`base-vega` / zinc) | **Done** — see `components.json`; keep semantic tokens in `globals.css` |
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

## Phase 7 — Entity detail hubs, analytics, teacher cover — DONE

Product goal: deep links from list pages into per-entity surfaces; stop bouncing staff to Class / Check-In Management for everyday enrollment and QR work.

### Student detail (`/students/[id]`) — **shipped**

| Capability | Status |
|------------|--------|
| Profile + identifiers | Done |
| **Analytics** (campus vs lesson, labeled separately; `range=week\|month\|all`) | Done — `GET /students/{id}/attendance-summary/` |
| Enrolled classes (list + enroll / unenroll) | Done |
| QR management (view / regenerate / activate / deactivate) | Done |
| Charts via shadcn `ChartContainer` | Done |

### Class detail (`/classes/[id]`) — **shipped**

| Capability | Status |
|------------|--------|
| Identity + edit | Done |
| Roster enroll / unenroll | Done |
| Timetable summary + Take roll | Done |
| Attendance analytics (campus vs lesson separate) | Done — `GET /classes/{id}/attendance-summary/` |

### Teacher detail (`/teachers/[id]`) — **shipped**

| Capability | Status |
|------------|--------|
| Identity + edit | Done |
| Accountability (student rolls for sessions taught) | Done |
| Personal presence (derived from status + assigned vs `actual_teacher`) | Done |
| Recent sessions list | Done — **read-only** (Phase 8); manage substitute on `/sessions` or Find sessions |
| Assign cover inline on hub | **Superseded** — edit moved to Sessions / Find sessions (Phase 8) |

### Cover / substitute model

- `Session.teacher` / `AdHocSession.teacher` = **Assigned** (from generation).
- `actual_teacher` nullable — empty means taught as assigned; set only for a **Substitute** (UI label). Field reserved for future teacher check-in write.
- No `substituted` status; no separate teacher_attendance enum.
- Same-as-assigned values normalize to null on save.
- Staff set/clear substitute via `/sessions` edit dialog and Find sessions slot table — not the teacher hub.

### List QoL

- Row click on students / teachers / classes → entity hub (`stopPropagation` on actions).

---

## Phase 8 — Find sessions, substitute UX ownership, datetime ISO — DONE

Product goal: staff find a class slot’s dated occurrences without hunting the full sessions table; one place owns substitute edits; wire format matches parsers.

### Find sessions — **shipped**

| Capability | Status |
|------------|--------|
| Landing `/sessions/find/` → class picker | Done |
| Class week grid `/sessions/find/[classId]/` (same layout as timetable) | Done |
| Slot table `/sessions/find/[classId]/[slotId]/` + date range + edit dialog | Done |
| Nav + command search “Find sessions” | Done |
| `GET /sessions/?timetable_slot_id=` (+ `date_from` / `date_to`) | Done |
| `GET /timetable-slots/?class_id=` (must not dump all-school slots) | Done |

`/sessions` table **kept** for bulk / cross-class lookup. Find sessions is the slot-first path.

### Substitute UX — **shipped**

| Capability | Status |
|------------|--------|
| `SessionTeacherCell` — substitute name + Substitute badge; Assigned tooltip | Done |
| `/sessions` edit: Assigned + Substitute fields | Done |
| Teacher hub: no Assign cover / Clear / status edit on recent rows | Done |
| Link “Manage on Sessions” from teacher hub | Done |

### Datetime standards — **shipped**

| Capability | Status |
|------------|--------|
| SMS: Session (and nested attendance-list) DateTimes emit **ISO-8601** | Done |
| SMS: legacy `dd/mm/yy HH:MM:SS` still accepted on input | Done |
| Dashboard: `lib/utils.ts` parsers/formatters; attendance / sessions / check-in migrated | Done |
| Find slot table: client clamp to selected date range after parse | Done |

### Attendance / timetable polish (same cycle)

- Month KPI stats exclude future pregenerated absents.
- Class picker cards centered on attendance / timetable / find landings (headers full-width).
- Timetable class page title / auto-load / Refresh aligned with attendance class page.

---

## Moving forward (recommended next work)

```text
Next 1  Optional: OpenAPI schema snapshot / global exception handler
Next 2  Teacher scoped querysets (if teacher login is imminent)
Next 3  Teacher check-in via actual_teacher (deferred)
Next 4  Optional: deep-link Find sessions from teacher hub; ad-hoc substitute UI parity
```

Analytics product sketch: class roll (have), **student profile trends** (have), **class / teacher attendance summary** (have), teacher/subject coverage, school heatmaps — **never** mix campus check-in rate with lesson roll without labeling.

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
PR-K  class detail hub + analytics                               ✓
PR-L  teacher attendance + substitutes (actual_teacher)            ✓
PR-M  shadcn charts + list row-click                             ✓
PR-N  Find sessions + substitute ownership + ISO datetime        ✓
```

---

## Success metrics

| Area | Signal |
|------|--------|
| Scale | Listing 5k+ sessions/check-ins stays fast (paged); matrix monthly for one class stays &lt; 2s p95; overview never fetch-alls; Find sessions never loads all-school slots |
| Auth | Teacher token cannot list all students; terminal cannot PATCH teachers |
| UX | New staff can mark a class roll in &lt; 3 clicks after class is known; find a slot’s sessions without scanning the full sessions table; no payroll fields visible; enroll + QR from student page |
| Docs | OpenAPI + standards match running code; no fake pagination envelopes; DateTime wire = ISO |

---

## Open decisions (product)

1. **Should terminal read the full attendance matrix?** Standards allow read for terminal+; product may restrict matrix to staff+.
2. **Teacher portal depth** this quarter vs staff-only dashboard?
3. ~~**Keep `paid` boolean**~~ — **dropped** with payroll residue.
4. **Clerk role sync** vs admin-only Django role assignment — **Django remains source of truth**; Clerk carries identity claims only.
5. **Teacher attendance grain** — session-level vs day-level vs both?
6. ~~**Substitute model**~~ — **decided**: nullable `actual_teacher` on Session / AdHocSession (empty = as assigned). Slot defaults and teacher check-in write still open when product asks.
7. **Remove or thin `/sessions` table** once Find sessions + filters cover staff habits? — currently **keep**.

---

## Opinion summary

| Proposal | Recommendation |
|----------|----------------|
| Scrap payroll | **Done** — do not revive |
| Paginated lists + server search | **Done** — keep as the only list pattern |
| Attendance matrices as scoped routes | **Done pattern** |
| Check-in overview aggregate | **Done** — keep school dual-column + status pagination |
| Hierarchy Admin &gt; Staff &gt; Terminal &gt; Teacher / Student | **Done** — keep tests green as routes change |
| Entity detail hubs + analytics | **Student / class / teacher hubs done** |
| Teacher cover / substitutes | **Done** — `actual_teacher`; edit on Sessions / Find sessions |
| Find sessions (slot-first) | **Done** — keep `/sessions` for bulk lookup |
| ISO DateTime wire + shared parsers | **Done** — do not reintroduce locale datetime dumps |
| Semantic color tokens | **Done** — prefer tokens over palette utilities |
| shadcn charts | **Done** — `components/ui/chart` |

The main remaining scale risks are **OpenAPI drift** and **teacher over-open reads** (if teachers log in) — not missing entity hubs, Find sessions, or unbounded check-in overview downloads.
