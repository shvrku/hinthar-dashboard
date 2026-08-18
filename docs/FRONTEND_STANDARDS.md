# Hinthar-Dashboard Frontend Standards & UX Review

Standards for the Next.js App Router dashboard as the school management UI scales. Design system: **shadcn/ui** with **base-vega / zinc** (`components.json`; see `.agents/rules/style-guide.md`).

Backend contract: follow `Hinthar-SMS/docs/API_STANDARDS.md` in the sibling SMS repository.

**Motion / GSAP:** see [`docs/ANIMATION_STANDARDS.md`](./ANIMATION_STANDARDS.md) for entrance, table, skeleton, and performance rules.

---

## 1. Product domains (mental model for staff)

Keep these **visually and verbally separate** in nav and page titles:

| Domain | What it means | Primary routes |
|--------|---------------|----------------|
| **People & classes** | Students, teachers, subjects, class cohorts, enrollment | `/students`, `/teachers`, `/subjects`, `/classes` (+ `/[id]` hubs) |
| **Schedule** | Weekly slots → generated dated sessions; ad-hoc tutoring | `/timetable`, `/sessions`, `/sessions/find/` |
| **Lesson attendance** | Present / late / absent / excused **per class or ad-hoc session** | `/attendance/`, `/attendance/class/[classId]/`, `/attendance/adhoc/` |
| **Campus check-in** | Daily building presence via QR / terminal | `/check-in/overview`, `/management`, `/terminal`, `/corrections` |
| **Payroll / finance** | **Out of scope** — residue removed from live UI/API | none |

Staff confusion risk: keep **Session Attendance** vs **Check-In** verbally separate (campus presence ≠ lesson roll).

Scaling plan (complete): `docs/SCALING_IMPLEMENTATION_PLAN.md`.

---

## 2. UX review (current pages)

Verdicts are for **front-office / academic staff**, not developers.

### Strengths

- Management list pages share header → KPIs → search → table → dialogs → **server** pagination (`page` / `page_size` + `q`).
- Session attendance uses matrix aggregates with Matrix vs Roster; routes split by class vs ad-hoc.
- Check-in terminal is lookup → confirm → commit (no token leakage in UI).
- Role gates via `RequireRole` / sidebar filtering; Clerk is identity, Django owns role.

### Issues by page (as of 2026-08-18)

| Page | Graspability | Notes |
|------|--------------|-------|
| `/` | Dispatcher | Post-login role router: staff → `/overview`, linked student → own `/students/[id]`, linked teacher → own `/teachers/[id]`, unmatched student/teacher and pending → `/pending`, terminal → `/check-in/terminal`. `/dashboard` redirects to `/overview`. |
| `/pending` | Good | Waiting-for-link home. Same page for `pending` role **and** unmatched student/teacher (role set, no profile id). |
| `/settings` | Good | Appearance (theme + palette). All signed-in roles. |
| `/overview` | Good | Staff home: greeting, four 30-day trend KPIs, student enrollment line/area chart, compact recent-activity list from `GET /stats/`. |
| `/classes` | Good | Enrollment dialogs are dense but learnable. |
| `/classes/[id]` | Good | Hub: roster, weekly slot grid, attendance analytics. |
| `/teachers` | Good | Payroll rate/bank fields removed. |
| `/teachers/[id]` | Good | Shared hub: profile, weekly slot grid, analytics; recent sessions **read-only**. **Manage on Sessions** is staff-only — owner teachers cannot open `/sessions`. |
| `/students` | Good | Staff+ directory. Server search + pagination; bulk import helps scale. Students cannot open this. |
| `/students/[id]` | Good | Shared hub: details + QR on one row, weekly class timetable, class row cards, campus vs lesson analytics. Staff: enroll, QR activate/deactivate/regenerate. Owner student (`me.student_profile_id === id`): read-only + QR download only. |
| `/student` | Redirect | Legacy alias: student → `/`; staff+ → `/students/`. |
| `/subjects` | Good | Simple catalog. |
| `/users` | Redirect | Canonical list is `/users/management`. |
| `/users/management` | Good | Server `q` + role filter. **Student** column links `student_profile_id` to `/students/{id}/`. |
| `/users/matching/students` | Good | Admin: link Clerk accounts to student rows. `/users/matching` redirects here. |
| `/users/matching/teachers` | Good | Admin: link Clerk accounts to teacher rows. `/users/matching-teachers` re-exports this page. |
| `/timetable` | Good | Landing → class week grid; empty states + week legend. |
| `/sessions` | Good | Bulk / cross-class lookup; Assigned + Substitute on edit; `SessionTeacherCell`. |
| `/sessions/find/` | Good | Slot-first path: class → week grid → slot occurrence table + edit. |
| `/attendance/` | Good | Landing → class or ad-hoc. Sessions **Take roll** deep-links into the matching roster. |
| `/attendance/class/[classId]/` | Good | Server subject/teacher filters; headers show subject · teacher; identifiers under names; excused supported. Month KPIs count **loaded** rows (including future sessions in the window). Missing cells are unmarked (`—`), not absent. |
| `/attendance/adhoc/` | Good | Add Session + **Add Students** (server search, load-more). Empty grid until students added. |
| `/check-in/overview` | Good | Server aggregate. **All classes**: dual Missing \| Checked-in columns, each paginated via `status=`; single class keeps dual columns unpaginated; icon-only **Undo** / actions; school-wide search. |
| `/check-in/management` | Good | QR view + regenerate (activate/deactivate lives on student hub). |
| `/check-in/corrections` | Good | Undo mis-tap campus check-ins; auto-reverts lesson marks attributed to that check-in. |
| `/check-in/terminal` | Good | Lookup → confirm → commit; deactivated QR/code shows confirmation-panel card (QR **and** unique-code paths blocked until reactivated). |
| Auth / roles | Addressed | Resource `auth.protect` + gates. `/` is the Clerk force-redirect + dispatcher. Waiting-for-link (`pending`, unmatched student/teacher): `/`, `/settings`, `/pending` only. Linked students: those plus own `/students/{id}`. Linked teachers: those plus own `/teachers/{id}`. New Clerk sign-ups JIT as `pending` on first `GET /me/` — no auto-link by email. |

### Attendance UX — current contract

1. Routes: `/attendance/` landing; `/attendance/class/[classId]?…`; `/attendance/adhoc/?…`.
2. Matrix APIs remain the only way to load grids — do not rebuild from paginated attendance lists.
3. Column headers: subject, teacher, date, time. Student secondary line: `unique_code`.
4. Ad-hoc participants = attendance rows created via Add Students (start **absent**).
5. Sessions **Take roll** deep-links into class/ad-hoc roster with `session_id` (+ date filters).
6. Matrix: stored statuses are `present | late | absent | excused` only. Missing / `null` cells are unmarked (grey `—`). KPIs never treat unmarked as absent; they include future sessions that are already in the loaded window.
7. Shared pieces live in `components/attendance/` — class and ad-hoc pages compose them.

### Find sessions / substitute UX — current contract

1. Prefer `/sessions/find/` when staff know the class + weekly slot; keep `/sessions` for bulk search.
2. Week grid on **Find sessions** and `/timetable/[classId]/` is **time × day**. Hub cards (`HubTimetableCard` / `TimetableWeekSnippet`) are the allowed **day-column** exception — do not “fix” hubs to match the editor.
3. Slot click → filtered occurrence **table** (`timetable_slot_id` + date range); row click → session edit dialog.
4. Substitute edits live on Sessions / Find sessions only — teacher hub recent rows are read-only.
5. UI copy: **Substitute** (not “cover”); Assigned teacher stays the generation teacher; empty `actual_teacher` = taught as assigned.
6. Always pass `class_id` when loading timetable slots for a class-scoped UI.

### Datetime handling

- Parse/display backend DateTimes only via `lib/utils.ts` (`parseBackendDateTime`, `formatBackendDateTime`, `formatBackendDate`, `formatBackendTime`, `toSessionDateString`, `formatSlotClock`, `formatRelativeTime`, …).
- Expect **ISO-8601** from the API; helpers still tolerate legacy `dd/mm/yy` input during transition.
- Do not use bare `new Date(backendString)` for list/matrix keys or filters.
---

## 3. Frontend architecture standards

### Routing

- App Router only under `app/`.
- One primary page per concern; avoid mega-pages > ~400 lines — extract hooks (`useAttendanceMatrix`) and presentational components.
- Trailing slashes stay on (`trailingSlash: true`) to match Django.

### Auth & roles

| Layer | Standard |
|-------|----------|
| Clerk | `proxy.ts` is session plumbing only (`clerkMiddleware()`). Do **not** use `createRouteMatcher` for auth gates. |
| Resource auth | `await auth.protect()` in `app/(app)/layout.tsx`; API proxy checks session and returns 401. Public: `app/(public)/sign-in`, `sign-up`. |
| Identity | Call `GET /me/` after sign-in; cache role on client context |
| Nav | Filter sidebar items by `isStaffOrAbove` / `isTerminalOrAbove` / etc. |
| Page gate | Shared `<RequireRole mode="staff" />` (`mode`: `staff` \| `admin` \| `checkin` \| `any` \| `student`); `AppAccessGate` for terminal / pending / unmatched redirects |
| Actions | Hide destructive buttons the role cannot call (still enforced by API) |

Mirror backend helpers in `lib/roles.ts`:

```ts
export const ROLE_RANK = { pending: 0, student: 1, teacher: 2, terminal: 3, staff: 4, admin: 5 } as const
export function isStaffOrAbove(role: Role) { … }
// isAdmin, isTerminalOrAbove, isAtLeast, canCheckIn (admin | staff | terminal)
```

Terminal UI: only check-in routes (+ read-only views if product wants). Teachers: own hub timetable via `GET /timetable/teacher/{id}/`; students: enrolled class grids via `GET /timetable/class/{id}/`. Unmatched student/teacher stay on `/pending` until an admin links a profile.

### Account matching & pending

Admins match Clerk accounts to roster rows. Do not invent a second matching UI.

| UI | API |
|----|-----|
| `/users/matching/students` | `POST /students/{id}/link_user/` `{ user_id }`; `POST …/unlink_user/`; `GET /users/?linked=&linked_target=student&linkable=&linkable_target=student` |
| `/users/matching/teachers` | Same on `/teachers/{id}/…` with `linked_target=teacher` / `linkable_target=teacher` |

Linkable roles: student `{pending, student}`, teacher `{pending, teacher}`, and no other profile already attached. Unlink returns a student/teacher-role account to `pending`.

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
- Motion: wrap management pages in `StaggerContainer` / `StaggerItem` (include the header). Do not add decorative noise or page-level padding on the stagger root — app shell padding lives on the inner `main` wrapper (`p-4 pb-10 md:p-6 md:pb-12`).

### Entity hub layout

Student, teacher, and class hubs share one vertical order. Staff and owner see the same structure; only actions differ (edit / enroll / QR lifecycle stay staff+).

1. **Identity row** — profile card. Student hub pairs it with **Student ID** (QR) on the same row (`lg:grid-cols-3`, details `col-span-2`). Teacher hub has no QR, so the profile card stays full width.
2. **Weekly timetable** — `HubTimetableCard` / `TimetableWeekSnippet`. This is **weekly `TimetableSlot` rows**, never a dated session list. Data:
   - Class hub: `GET /timetable/class/{id}/` (same helper as student hub)
   - Student hub: `student.class_ids` → `GET /timetable/class/{id}/` (merge if several classes)
   - Teacher hub: `GET /timetable/teacher/{id}/`
   - Staff **editor** (`/timetable/[classId]/`, Find sessions): `GET /timetable-slots/?class_id=`
3. **Compact related info** — short height. Student: class row cards (name + “View in classes”, staff remove on the right). Do not put enrollment beside the QR. Identity and Student ID cards on the same row **stretch to equal height**. Student ID: title only, code beside actions; action buttons stay default size (`h-9`) and do not grow to fill the card.
4. **Analytics / recent work** — attendance charts, teacher accountability, recent sessions (read-only on the teacher hub). Staff-only CTA to `/sessions` for substitutes.

Slot cell copy: subject + time; student/class views add **teacher**; teacher view adds **class**. “Open full timetable” only on the class hub (staff editor). Do not add a second week-grid component.

### Page header & reload contract

| Slot | Use for | Variant |
|------|---------|---------|
| `back` | Parent navigation | Ghost — always **"Back to {label}"** |
| `children` | Tertiary (Import CSV, Add Students, …) | `outline` |
| `secondaryAction` | Reload list / matrix | **`outline`** via `buildReloadAction` |
| `primaryAction` | Create / main CTA | `default` (filled) |

Reload terminology (`buildReloadAction` / `reloadActionLabel`):

- Before first successful fetch → **"Load Data"**
- After data has loaded once → **"Refresh"**
- While busy → keep that label, `disabled`, spin `RotateCcw` — **do not** use "Loading…" / "Refreshing…" as the button text
- Empty before first load: `Click "Load Data" to fetch …`
- Empty after load: `No … found.`

Loading states:

- Initial / empty table **and page changes**: shared skeletons from `components/page-skeletons.tsx` whenever `loading` is true (do not keep stale rows while page numbers move)
- Pagination footer: pass `loading` to `StandardTablePagination` → **"Loading page…"** + spinner, disable page/size controls until the fetch finishes
- Header reload: button spinner via `buildReloadAction` (label stays Load Data / Refresh)
- Auth bootstrap only: full-page spinner OK

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

Example: a future `/audit-logs` page backed by `GET /api/v1/audit-logs/?page=&page_size=&category=` (staff+). Home already previews important events from `GET /stats/.recent_activity` — do not duplicate that feed as a second fetch-all.

1. **Types** in `lib/types.ts` for the entity + `Paginated<T>`.
2. **API** helper: `listAuditLogs({ page, page_size, …filters })` returning the envelope (do not auto-unwrap `results` only — expose `count`).
3. **Page** `app/audit-logs/page.tsx`:
   - `RequireRole mode="staff"` (API is staff+, not admin-only)
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
| Default rate | Out of scope — do not show (payroll frozen) |
| Dashboard (static home) | Overview **or** live Stats dashboard |

Status labels: **Present**, **Late**, **Absent**, **Excused** (Title Case in UI). Unmarked cells use an em dash, not “Absent”.

Teacher fields: **Assigned** (generation teacher) vs **Substitute** (`actual_teacher` when set). Empty substitute = taught as assigned.

---

## 7. Design system & color tokens

- Follow shadcn skill / CLI; project style is **base-vega** with **zinc** base (`components.json`). Preset code: **`bd1haIy0`**.
- App palettes (orthogonal to light/dark): **`emerald`** (default), **`mono`**, and **`amoled`** via `data-palette` — pick on **Settings** (`/settings`). Static shell previews live in `public/themes/{palette}-{mode}.png` (regenerate with `npx tsx scripts/generate-theme-previews.ts`).
- Brand mark: `components/hinthar-mark.tsx` (`HintharMark`). Crop viewBox `312 306 400×412.5` from `public/icon-transparent.svg` (1024² padded source). Fills are `currentColor` at 0.2 / 0.5 / 0.8. Sidebar tile: `bg-sidebar-primary text-sidebar-primary-foreground`, mark `size-5` in a `size-8` rounded tile. Bootstrap overlay keeps its own 1024 viewBox + light/dark tile recipe — do not unify it with the sidebar mark.
- Historical cobalt/HSL spec: `docs/hinthar-dashboard-design-system.md` — **do not copy tokens from it**. Live truth is `app/globals.css`, the in-app Design System page, and this section.
- **Do not invent one-off palette colors** (`emerald-*`, `rose-*`, `amber-*`, `sky-*`) in page CSS.
- Use semantic tokens from `app/globals.css` (wired in `@theme inline`):

| Token | Use for |
|-------|---------|
| `success` / `success-foreground` | Positive feedback banners, success badges |
| `warning` / `warning-foreground` | Soft alerts (already checked in, deactivated QR) |
| `destructive` | Errors, destructive actions |
| `attendance-present` / `late` / `absent` / `excused` | Lesson roll status UI + charts |
| `attendance-campus` | Campus check-in chart series |

- Shared class helpers: `lib/status-styles.ts` (`feedbackBanner`, `attendanceSurface`, …).
- Chart fills: `lib/chart-colors.ts` (`ATTENDANCE_STATUS_COLORS`, `CAMPUS_CHECKIN_COLOR`).
- New UI must use existing `components/ui` and these CSS variables.

### Motion

- Stack: GSAP 3 + `@gsap/react` only (no Motion / Framer Motion).
- Full rules, primitives, checklists, and performance assessment: [`docs/ANIMATION_STANDARDS.md`](./ANIMATION_STANDARDS.md).

Ignore nested `time_table/` tree for product work (legacy fork risk).
