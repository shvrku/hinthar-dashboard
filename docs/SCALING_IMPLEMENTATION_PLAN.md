# Scaling Standards — Implementation Plan

Cross-repo plan to bring **Hinthar-SMS** (backend) and **Hinthar-Dashboard** (frontend) in line with:

- `Hinthar-SMS/docs/API_STANDARDS.md`
- `Hinthar-Dashboard/docs/FRONTEND_STANDARDS.md`

Goal: scale students / teachers / class times / attendance safely; **scrap payroll from the product surface**; keep attendance matrices as scoped aggregate routes; introduce consistent pagination and role helpers.

**Last status update:** 2026-08-06 (this conversation cycle).

---

## Status at a glance

| Phase | Focus | Status |
|------:|-------|--------|
| 0 | Docs truthfulness, freeze payroll scope, dead nav | **Mostly done** — standards linked from READMEs; keep OpenAPI/history docs honest as you touch them |
| 1 | Roles + permission helpers + frontend gates | **Done** — `people/roles.py`, permissions, `RequireRole`, pending role, Clerk = identity only |
| 2 | Scrap payroll UI + drop model residue | **Done** — UI cleared; migrations dropped `default_rate` / `bank_details` / `paid` |
| 3 | Pagination + list pages off fetch-all | **Done** — default page 50 / max 200; list pages use `list*Page` + server `q`/filters (no hybrid fetch-all) |
| 4 | Attendance matrix filters + UX split | **Done** — matrix `class_id` 400; Sessions Take roll deep links |
| 5 | Bulk / filter / OpenAPI hygiene | **Partial** — bulk upsert status bug fixed; OpenAPI/Spectacular still lag |
| 6 | Design system, check-in UX, QR lifecycle | **Partial** — `/dashboard` → `/`; preset / ConfirmDialog / QR activate-deactivate / overview redesign open |

### Remaining (priority order)

1. **Check-in overview redesign** — class-first navigation; group **Checked in** vs **Missing**.
2. **Phase 6 QR token lifecycle** — activate / deactivate student QR tokens.
3. **Phase 5 hygiene** — OpenAPI refresh; canonical filter names; error body consistency; page-boundary tests where missing.
4. **Teacher queryset scoping** — teachers must not get school-wide lists if a teacher portal is coming.
5. **Phase 6 design polish** — shadcn preset `b2C8WxsCO`; shared `ConfirmDialog`; role-appropriate home; timetable empty states.
6. **Analytics (not started)** — student / teacher / class summaries + trends; keep check-in ≠ lesson roll as separate metrics.
7. **Optional** — `GET /check-ins/overview/` aggregate; ad-hoc class-bulk add / remove-from-session if staff ask.

### Out of scope until product asks

- Reviving `payroll/`
- Clerk multi-session / Pro org switching as the account-switch story (current: sign out → sign-in)
- Student self-service portal

---

## Achieved this conversation cycle (2026-08-06)

Backend (SMS)

- Server-side `q` (+ structured filters) on students, teachers, users, sessions, ad-hoc sessions, check-ins.
- Matrix students include `unique_code`.
- Ad-hoc `bulk_upsert` validates against `SessionAttendance.STATUS_CHOICES` (was crashing on missing `AdHocSessionAttendance.STATUS_CHOICES`).
- Attendance matrix: missing / `all` / `adhoc` `class_id` → **400**; unknown class → **404**.

Frontend (Dashboard)

- List pages: always server page + debounced `q`/filters — **no** fetch-all hybrid.
- Users page: search + role filter.
- Attendance columns: **subject · teacher · date/time** (class + ad-hoc); roster labels match.
- Student subtitle: **identifier** (`unique_code`), not DB id; search matches identifier.
- Ad-hoc **Add Students** dialog: server search, multi-select, paginated “Load more”, creates absent attendance rows.
- Sessions **Take roll** deep links → class roster (`?date&layout=roster&session_id`) and ad-hoc (`/attendance/adhoc/?…`).
- Small fixes: class `getSessionStartTime` aligned with ad-hoc; Add Session open resets date; removed stray `.clerk-session-claims.json`.

Earlier in the same scaling thread (already landed before this doc refresh)

- Secure check-in terminal lookup → confirm → commit; fullscreen removed.
- Clerk session claims (email/username) + Django identity sync (never role).
- Pending-role gate / trailing-slash fixes for `/pending/`.
- Payroll field removal (F1), excused attendance UI (H1), `/dashboard` redirect (I1).
- Pagination default on; attendance routes split (`/attendance/`, `/attendance/class/[classId]/`, `/attendance/adhoc/`).
- Live overview KPIs on `/` via `getStats()`.

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
| Dead nav / empty Support-Feedback | Partial — keep pruning |
| Inventory OpenAPI vs real routes | Ongoing (Phase 5) |

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
| Optional check-in overview aggregate API | Open (see Phase 6 check-in UX) |

---

## Phase 5 — API hygiene & bulk consistency — PARTIAL

| Task | Status |
|------|--------|
| Ad-hoc bulk_upsert status choices crash | Fixed |
| Document / stabilize `records` body for upsert | Open |
| Canonical FK query params; OpenAPI refresh | Open |
| Error body consistency | Open |
| Page-boundary tests on hot lists | Open |

---

## Phase 6 — Design system, check-in UX & QR lifecycle — PARTIAL

| Task | Status |
|------|--------|
| `/dashboard` redirects to `/` | Done |
| Live KPIs on `/` via `getStats()` | Done |
| shadcn preset `b2C8WxsCO` migrate | Open |
| Shared `ConfirmDialog` | Open |
| Role-appropriate home surfaces | Open |
| Timetable empty states / legend | Open |
| **Check-in correction UI** (delete / amend mis-tap) | **Done** — `/check-in/corrections` + `DELETE /check-ins/{id}/` |
| **Check-in overview redesign** (class picker + checked-in / missing groups) | **Todo — brainstorm below** |
| **QR token activate / deactivate** | **Todo** |

### Check-in correction — shipped

- Route: `/check-in/corrections/` (staff nav under Check-In).
- List by date + `q` + type filter; single + bulk delete with confirm.
- API: `DELETE /check-ins/{id}/` and `bulk_delete` (staff+ only).
- Safe auto-revert: attendance rows stamped with `auto_marked_by_checkin` are reverted to **Absent** when that check-in is deleted. Later manual roll edits clear the stamp and are preserved.
- After delete, student can check in again via Terminal.

### Check-in overview redesign (todo — brainstorm)

Current `/check-in/overview` stacks every cohort vertically (hard to scan). Target UX:

1. **Class-first** — sticky class selector / sidebar / chips (or URL `?class_id=`) so staff jump to one cohort without scrolling the whole school.
2. **Two groups per class** — **Checked in** and **Missing** (enrolled but no check-in for the selected date), each with count badges.
3. Date control stays; keep campus check-in verbally distinct from Session Attendance.
4. Prefer a dedicated `GET /check-ins/overview/?class_id=&date=` aggregate later so the page does not fetch-all students + check-ins.

### QR token activate / deactivate (todo)

Today: tokens always exist; management can **view** + **regenerate** (`regenerate_check_in_token`). Missing: soft disable without issuing a new secret.

- Model: e.g. `check_in_token_active` boolean (default true) on `Student`, or nullable token + status enum.
- API: `POST …/deactivate_check_in_token/`, `POST …/activate_check_in_token/` (staff+); QR + lookup must reject inactive tokens.
- UI on `/check-in/management`: Activate / Deactivate beside Regenerate; clear badge for inactive.
- Regenerate should leave the token **active** after issue.

---

## Moving forward (recommended next work)

```text
Next 1  Check-in overview redesign (+ optional overview aggregate)
Next 2  QR token activate / deactivate (SMS model + management UI)
Next 3  Phase 5: OpenAPI + bulk/filter hygiene + missing list tests
Next 4  Phase 6: ConfirmDialog + preset pass + role homes
Next 5  Teacher scoped querysets (if teacher login is imminent)
Next 6  Analytics v1
```

Analytics product sketch (when you start it): class roll (have), student profile trends, teacher/subject coverage, school overview heatmaps — **never** mix campus check-in rate with lesson roll without labeling.

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
PR-I  check-in correction + overview redesign + QR activate/deactivate  ← next
PR-J  design-system preset + ConfirmDialog (Dashboard)           ← follows
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
3. ~~**Keep `paid` boolean**~~ — **dropped** with payroll residue.
4. **Clerk role sync** vs admin-only Django role assignment — **Django remains source of truth**; Clerk carries identity claims only.

---

## Opinion summary

| Proposal | Recommendation |
|----------|----------------|
| Scrap payroll | **Done** — do not revive |
| Paginated lists + server search | **Done** — keep as the only list pattern |
| Attendance matrices as scoped routes | **Done pattern**; finish optional hardenings |
| Hierarchy Admin &gt; Staff &gt; Terminal &gt; Teacher / Student | **Done** — keep tests green as routes change |
| Analytics | **Next product milestone** after hygiene / home polish |

The main remaining scale risks are **OpenAPI drift**, **teacher over-open reads** (if teachers log in), and **missing analytics** — not unbounded list downloads or payroll UI.
