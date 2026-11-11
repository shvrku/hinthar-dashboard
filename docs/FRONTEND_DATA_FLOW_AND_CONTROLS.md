# Hinthar Dashboard — Frontend Data Flow, API Pipeline & Interactive Controls Reference

**Repository:** `Hinthar-Dashboard/hinthar-dashboard`  
**Source of Truth Files:**
- API Client & React Query: [`lib/api.ts`](../lib/api.ts), [`hooks/use-api-queries.ts`](../hooks/use-api-queries.ts)
- Next.js Zero-Trust Proxy: [`app/api/[...slug]/route.ts`](../app/api/%5B...slug%5D/route.ts)
- Role Hierarchy & Access Gates: [`lib/roles.ts`](../lib/roles.ts), [`components/app-access-gate.tsx`](../components/app-access-gate.tsx), [`components/require-role.tsx`](../components/require-role.tsx), [`components/bootstrap-overlay.tsx`](../components/bootstrap-overlay.tsx), [`app/(app)/page.tsx`](../app/(app)/page.tsx)
- Global Shell & Navigation: [`components/app-sidebar.tsx`](../components/app-sidebar.tsx), [`components/site-header.tsx`](../components/site-header.tsx), [`components/command-search-dialog.tsx`](../components/command-search-dialog.tsx)

---

## 1. End-to-End Request & Auth Data Flow Informatics (ASCII)

### 1.1 Browser → API Client → Next.js Proxy → Django Backend Pipeline

```text
+-----------------------------------------------------------------------------------+
| 1. BROWSER UI / WORKSPACE COMPONENT                                               |
|    User clicks button / changes filter / submits InspectorSheet                   |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 2. API CLIENT LAYER (lib/api.ts + hooks/use-api-queries.ts)                       |
|    +-- buildQueryString(): Strips null, undefined, "", and sentinel "all"         |
|    +-- cachedRequest(): 60s in-memory cache for idempotent metadata GETs          |
|    +-- Target Resolution:                                                         |
|        +-- [Mode A: Direct Origin] If NEXT_PUBLIC_API_ORIGINS / ORIGIN set:       |
|            Sends request directly to Django with Authorization: Bearer <ClerkJWT> |
|            (GET requests auto-failover across origins on network TypeError;       |
|             POST/PUT/PATCH/DELETE never failover to prevent duplicate writes)     |
|        +-- [Mode B: Same-Origin Proxy] Calls /api/v1/... on Next.js server        |
+-----------------------------------------+-----------------------------------------+
                                          | (Mode B)
                                          v
+-----------------------------------------------------------------------------------+
| 3. NEXT.JS ZERO-TRUST PROXY (app/api/[...slug]/route.ts)                          |
|    +-- isSafeApiSlug(): Blocks "..", ".", "\" and requires slugParts[0] === "v1"  |
|    +-- Clerk Server Auth: const { userId, getToken } = await auth()               |
|        +-- Missing userId or token --> Rejects with 401 Unauthorized              |
|    +-- Header Scrubbing: Strips inbound host/connection/authorization,            |
|        injects Authorization: Bearer ${token}                                     |
|    +-- Upstream Fetch: Forwards to BACKEND_API_ORIGIN (default localhost:8000)    |
|        +-- 3xx Redirect from backend --> Trapped & returns 502 Bad Gateway        |
|        +-- Network exception         --> Returns 502 {"error":"Backend unavail"}  |
|        +-- Idempotent GET on cacheable prefixes --> Adds Cache-Control:           |
|            private, max-age=60, stale-while-revalidate=120                        |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 4. DJANGO REST FRAMEWORK (Hinthar-SMS /api/v1/*)                                  |
|    ClerkJWTAuthentication -> Role Permission Check -> Serializer -> PostgreSQL    |
+-----------------------------------------------------------------------------------+
```

### 1.2 Post-Login Role Dispatcher & `AppAccessGate` Decision Tree

```text
+-----------------------------------------------------------------------------------+
| CLERK SESSION ESTABLISHED --> BootstrapOverlay (z-[9999])                         |
| Phases: [1] session (20%) -> [2] profile GET /api/v1/me/ (60%) -> [3] routing     |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| EVALUATE DJANGO USER PROFILE (app/(app)/page.tsx & components/app-access-gate.tsx)|
+-----------------------------------------------------------------------------------+
  |
  +-- 1. user.is_active === false?
  |      YES --> Force redirect to /account-locked (Only /account-locked & /settings allowed)
  |
  +-- 2. user.role === "pending" OR (role in ["student","teacher"] AND profile_id == null)?
  |      YES --> Force redirect to /pending (Only /pending, /announcements*, /settings allowed)
  |
  +-- 3. user.role === "terminal"?
  |      YES --> Force redirect to /check-in/terminal (Locked to /check-in/terminal*)
  |
  +-- 4. user.role === "student" (with student_profile_id)?
  |      YES --> Redirect to /students/{student_profile_id}
  |              (Permitted: own /students/{id}, /announcements*, /events*, /settings)
  |
  +-- 5. user.role === "teacher" (with teacher_profile_id)?
  |      YES --> Redirect to /teachers/{teacher_profile_id}
  |              (Permitted: own /teachers/{id}, /announcements*, /events*, /settings)
  |
  +-- 6. user.role === "staff" (Rank 4) OR "admin" (Rank 5)?
         YES --> Redirect to /overview
                 +-- Staff (Rank 4): Full access to all 7 Operational Workspaces
                 +-- Admin (Rank 5): All 7 Workspaces + /users/management & /users/matching/*
```

### 1.3 16-to-7 Route Consolidation Map

```text
LEGACY ROUTES (Redirects / Aliases)          CONSOLIDATED V2 WORKSPACE
-----------------------------------------    ------------------------------------------------
/dashboard, /overview                    --> 1. /overview        (Overview KPIs & Audit Feed)
/check-in/overview                       --> 2. /check-in        (Tab: Daily Roll)
/check-in/corrections                    -->    /check-in?tab=logs (Tab: Scan Log & Undo)
/check-in/terminal                       -->    /check-in/terminal (Live QR Kiosk)
/check-in/management                     -->    /students        (QR InspectorSheet Drawer)
/attendance, /attendance/class/[id]      --> 3. /attendance      (Cohort Roll & Matrix)
/attendance/adhoc                        -->    /attendance?adhoc=true
/timetable, /timetable/[classId]         --> 4. /schedule        (Tab: 7-Day Timetable Grid)
/sessions, /sessions/find/[classId]/[id] -->    /schedule        (Tab: Session Roster / Drawer)
/classes                                 --> 5. /classes         (Tab: Cohorts & Classes)
/subjects                                -->    /classes?tab=subjects (Tab: Subject Catalog)
/students, /teachers                     --> 6. /students & /teachers (+ /[id] Entity Hubs)
/announcements, /events                  --> 7. /communications  (Staff Unified Dispatch)
/users, /users/deactivated               --> 8. /users/management & /users/matching/* (Admin)
```

---

## 2. Global Chrome Controls (`AppSidebar`, `SiteHeader`, `CommandSearchDialog`, `/settings`)

| Control / Button | Location | Handler & Action | API / State Effect |
| :--- | :--- | :--- | :--- |
| **Brand Header Tile** | `AppSidebar` top header | Navigates to `homeHref` (`/account-locked` if deactivated, else `/`) | Client route transition |
| **Workspace Links (7)** | `AppSidebar` (`Workspaces` group, Staff+) | Navigates to `/overview`, `/check-in`, `/attendance`, `/schedule`, `/classes`, `/students`, `/communications` | Updates active sidebar indicator |
| **Users Admin Menu** | `AppSidebar` (`Administration` group, Admin only) | Collapsible menu: `Management` (`/users/management`), `Match students` (`/users/matching/students`), `Match teachers` (`/users/matching/teachers`) | Client route transition |
| **User Avatar Menu** | `AppSidebar` footer | Dropdown items:<br>• `Settings` → `/settings`<br>• `Manage Account` → `openUserProfile()` (Clerk modal)<br>• `Switch account` / `Log out` → `signOut({ redirectUrl: "/sign-in/" })` | Ends Clerk session or opens Clerk profile modal |
| **Sidebar Toggle** | `SiteHeader` top-left (`⌘B`) | Calls `toggleSidebar()` from `SidebarProvider` | Collapses/expands left navigation rail |
| **Command Search (`⌘K`)** | `SiteHeader` top-right (`Search Hinthar...`) | Opens `CommandSearchDialog` (`setSearchOpen(true)`). Selecting an item calls `runCommand(href)` → `router.push(href)` | Role-filtered quick jump across all pages |
| **Motion Toggle** | `SiteHeader` top-right & `/settings` | Calls `toggleReducedMotion()` (`MotionPreferenceProvider`) | Writes `localStorage["reduced-motion"]`, toggles `html[data-reduced-motion]` |
| **Theme Toggle** | `SiteHeader` top-right & `/settings` | Calls `toggleTheme()` / `setTheme("light" \| "dark")` (`ThemeProvider`) | Writes `localStorage["theme"]`, toggles `html.dark` |

---

## 3. Workspace 1: Overview (`/overview`)

**Files:** [`app/(app)/overview/page.tsx`](../app/%28app%29/overview/page.tsx), [`components/overview/kpi-metric-card.tsx`](../components/overview/kpi-metric-card.tsx), [`components/overview/recent-activity-list.tsx`](../components/overview/recent-activity-list.tsx)

```text
[GET /api/v1/stats/] ---> +--> 4 KPI Metric Cards (Students, Teachers, Sessions, Check-Ins + 30d Delta)
                          +--> StudentEnrollmentChart (12-Month Cumulative Area Chart)
                          +--> RecentActivityList (8 Latest Categorized AuditLog Events)
```

| Button / Control | Location | Handler Function | API Call & Method | Payload / Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| **`Refresh`** | `SystemHeader` right actions | `handleRefresh()` | `GET /api/v1/stats/` (`api.getStats()`) | Re-randomizes greeting quote (`pickDashboardSubtext`), invalidates `apiQueryKeys.stats`, refetches KPIs, chart, and audit feed. |
| **`Check-In Terminal`** | `SystemHeader` right actions | Direct link | None | Navigates to `/check-in/terminal`. |
| **`Export CSV`** | Above KPI metric cards | `downloadCsv("dashboard-overview.csv", rows)` | Client-side export | Downloads CSV containing metric name, count, 30-day delta, and trend direction. |
| **Chart Export Menu (`⋯`)** | `StudentEnrollmentChart` header | `ChartExportMenu` (`Download CSV` / `Download PNG`) | Client-side export | Downloads 12-month enrollment series as `.csv` or rasterized `.png`. |

---

## 4. Workspace 2: Campus Check-In (`/check-in` & `/check-in/terminal`)

**Files:** [`app/(app)/check-in/page.tsx`](../app/%28app%29/check-in/page.tsx), [`app/(app)/check-in/terminal/page.tsx`](../app/%28app%29/check-in/terminal/page.tsx), [`components/check-in/qr-scanner.tsx`](../components/check-in/qr-scanner.tsx)

### 4.1 Consolidated Check-In Workspace (`/check-in`)

| Button / Control | Location | Handler Function | API Call & Method | Payload & UI Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| **Tab: `Daily Roll` / `Scan Log & Bulk Undo`** | `SystemHeader` tabs | `setActiveTab("roll" \| "logs")` | Triggers tab data loader | Syncs `?tab=logs` URL query param and loads either cohort presence roll or chronological scan history. |
| **Date Picker (`max={todayStr}`)** | `DataModule` filter bar (both tabs) | `setSelectedDate(val)` | Refetches active tab | Strictly clamped to `max={todayStr}` to prevent future check-ins. |
| **Cohort Select Dropdown** | `Daily Roll` filter bar | `setSelectedClassId(val)` | `GET /api/v1/check-ins/overview/?date={date}&class_id={id}` (`api.overviewClass`) | When `"all"`, fetches paginated school-wide arrived & missing lists; when `<int>`, loads that cohort's roster. |
| **Roll Status Pills (`ALL \| MISSING \| ARRIVED`)** | `Daily Roll` filter bar | `setRollFilter(mode)` | Client/server filter | Filters displayed students by daily arrival state. |
| **Roll Search Input** | `Daily Roll` toolbar (300ms debounce) | `api.overviewSearch(date, q)` | `GET /api/v1/check-ins/overview/?date={date}&search={q}` | Searches across all cohorts for matching students with their arrival status. |
| **`Manual Check-In`** | `Daily Roll` row action (when `MISSING`) | `handleRollManualCheckIn(row)` | `POST /api/v1/check-ins/manual/` (`api.createCheckInManual`) | Payload: `{ student_id: row.studentId }`. Marks student arrived, auto-marks today's lesson roll (`present`/`late`), shows toast, refreshes roll & KPI counts. |
| **`Undo Check-In`** | `Daily Roll` row action (when `ARRIVED`) | Opens `ConfirmDialog` → `handleRollConfirmUndo()` | `DELETE /api/v1/check-ins/{id}/` (`api.deleteCheckIn`) | Deletes check-in record, reverts auto-marked lesson attendance back to `'absent'`, refreshes roll. |
| **Scan Type Filter (`ALL \| QR \| MANUAL`)** | `Scan Log` filter bar | `setLogTypeFilter(val)` | `GET /api/v1/check-ins/?date={date}&check_in_type={type}&q={q}` (`api.listCheckInsPage`) | Filters chronological scan log by capture method. |
| **Row & Header Checkboxes** | `Scan Log` table | `setSelectedLogIds(...)` | Client selection state | Enables bulk action bar in `DataModule`. |
| **`Undo Selected ({count})`** | `Scan Log` bulk action bar | Opens `ConfirmDialog` → `handleBulkUndo()` | `DELETE /api/v1/check-ins/bulk_delete/` (`api.bulkDeleteCheckIns`) | Payload: `{ ids: selectedLogIds }`. Deletes scans, reverts auto-marked lesson rolls, shows toast with reverted counts. |
| **`Undo` (Single Row)** | `Scan Log` row action | Opens `ConfirmDialog` → `handleSingleUndo()` | `DELETE /api/v1/check-ins/{id}/` (`api.deleteCheckIn`) | Deletes single scan and reverts auto-marked lesson attendance. |

### 4.2 Kiosk Terminal (`/check-in/terminal`)

```text
[Camera QR Scan] OR [Manual Code Input "Look Up"]
       |
       v
POST /api/v1/check-ins/lookup/  ({"check_in_token"} OR {"unique_code"})
       |
       +--> HTTP 403 (Deactivated Pass) --> Show Deactivated Card -> Click "Scan Next" to unlock
       +--> HTTP 200 (CheckInLookup)    --> Lock Scanner & Show Confirm Card
                                                  |
                  +-------------------------------+-------------------------------+
                  | Click "Confirm"                                               | Click "Cancel"
                  v                                                               v
      POST /api/v1/check-ins/qr/ (or /manual/)                             Unlock Scanner & Reset
      Commits CheckIn + Auto-Marks Today's Lesson Roll
```

| Button / Control | Location | Handler Function | API Call & Method | Payload & UI Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| **Camera QR Scanner** | Terminal main viewport (`QrScanner`) | `handleScan(token)` | `POST /api/v1/check-ins/lookup/` (`api.lookupCheckIn`) | Payload: `{ check_in_token }`. Locks scanner and displays student verification card (or deactivated warning card on `403`). |
| **`Look Up` Button** | Manual Student Code input bar | `handleManualLookup()` | `POST /api/v1/check-ins/lookup/` (`api.lookupCheckIn`) | Payload: `{ unique_code }`. Resolves student by code (`HIS26-00001`) and opens confirmation card. |
| **`Confirm` Button** | Lookup Confirmation Card | `handleConfirm(true)` | `POST /api/v1/check-ins/qr/` or `/check-ins/manual/` | Payload: `{ check_in_token }` or `{ student_id }`. Commits check-in, shows success toast, unlocks scanner for next student. |
| **`Cancel` / `Scan Next`** | Confirmation / Deactivated Card | `handleConfirm(false)` / `resetPending()` | None | Clears pending lookup card and immediately resumes camera scanning. |

---

## 5. Workspace 3: Lesson Attendance (`/attendance`)

**Files:** [`app/(app)/attendance/page.tsx`](../app/%28app%29/attendance/page.tsx), [`components/attendance/attendance-workspace.tsx`](../components/attendance/attendance-workspace.tsx), [`components/attendance/attendance-matrix-view.tsx`](../components/attendance/attendance-matrix-view.tsx)

### 5.1 Workspace Navigation & Mode Controls

| Button / Control | Location | Handler Function | API Call & Method | Payload & UI Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| **`CohortSwitcher` (`ALL\|IG\|IAL\|YR` + Select + `<` `>`)** | Below `SystemHeader` | `handleCohortChange(code)` | Loads cohort sessions / matrix | Switches active cohort (or `ADHOC` tutoring mode) and updates URL query parameters (`?classId=` or `?adhoc=true`). |
| **`AD-HOC` Toggle Button** | Inside `CohortSwitcher` right cluster | `handleCohortChange("ADHOC")` | Loads ad-hoc sessions / matrix | Switches workspace between regular cohort lessons and ad-hoc tutoring sessions. |
| **Tab: `Daily Session Roll` / `Monthly & Subject Matrix`** | `SystemHeader` tabs | `handleTabChange("roll" \| "matrix")` | Loads daily roll or matrix | Switches between single-session roll call and multi-session spreadsheet matrix (`?view=matrix`). |
| **Date Picker** | `Daily Session Roll` toolbar | `handleDateChange(dateStr)` | `GET /api/v1/sessions/?class_id={id}&date_from={d}&date_to={d}` | Loads all sessions for the cohort on that date and their attendance rows. |

### 5.2 Tab 1: Daily Session Roll (Cohort & Ad-Hoc Modes)

| Button / Control | Location | Handler Function | API Call & Method | Payload & UI Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| **Session Selector Dropdown** | `Daily Session Roll` toolbar | `setSelectedSessionId(id)` | Hydrates from loaded day sessions | Switches active session for the chosen date. |
| **`Generate Today's Sessions`** | Empty state when no session exists on selected date | `handleCreateTodaySession()` | `POST /api/v1/sessions/generate/{classId}/` (`api.generateSessionsForClass`) | Payload: `{ start_date: selectedDate, end_date: selectedDate }`. Generates today's scheduled sessions from weekly slots and reloads roll. |
| **`Mark All Present`** | Roll toolbar right | Marks all roster students `"present"` in state | In-memory state update | Sets every student's status to `"present"` and sets `hasUnsavedChanges = true`. |
| **`RollStatusControl` (`PRESENT [P]`, `LATE [L]`, `ABSENT [A]`, `EXCUSED [E]`)** | Each student row | Updates `rollStatuses[studentId]` | In-memory state update | Updates row status badge and marks roll dirty (`hasUnsavedChanges = true`). |
| **Remarks Input** | Each student row | Updates `remarks[studentId]` | In-memory state update | Attaches optional note to the student's session attendance row. |
| **`Save Roll`** | Header / Toolbar primary CTA | `handleSaveRoll()` | `POST /api/v1/session-attendances/bulk_upsert/` (`api.bulkUpsertSessionAttendances`) | Payload: `{ records: [{ session_id, student_id, status, remarks }] }`. Atomically saves all roll marks, clears dirty flag, shows toast. |
| **`+ New Ad-Hoc Session`** | Toolbar (when in `ADHOC` mode) | Opens `InspectorSheet` → `handleCreateAdhocSession()` | `POST /api/v1/adhoc-sessions/` (`api.createAdHocSession`) | Payload: `{ title, subject_id, teacher_id, date, start_time, end_time, status: "scheduled" }`. Creates tutoring session and selects it. |
| **`+ Add Students` (Ad-Hoc)** | Toolbar (when in `ADHOC` mode) | Opens `InspectorSheet` → `handleAddStudentsToAdhoc()` | `POST /api/v1/adhoc-session-attendances/bulk_upsert/` | Searches directory via `GET /students/?q=`, adds checked students to the ad-hoc session with `status: "present"`. |
| **Remove Student Icon (`Trash2`)** | Ad-Hoc roll row | `handleRemoveAdhocStudent(studentId)` | `DELETE /api/v1/adhoc-session-attendances/{id}/` | Removes student from the ad-hoc tutoring roll. |
| **`Save Ad-Hoc Roll`** | Toolbar (when in `ADHOC` mode) | `handleSaveAdhocRoll()` | `POST /api/v1/adhoc-session-attendances/bulk_upsert/` | Commits all status and remark edits for the ad-hoc session. |

### 5.3 Tab 2: Monthly & Subject Matrix (`AttendanceMatrixView`)

| Button / Control | Location | Handler Function | API Call & Method | Payload & UI Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| **Month / Date Range Pickers** | Matrix toolbar | Updates `date_from` / `date_to` | `GET /api/v1/attendance/matrix/` (or `/adhoc-attendance/matrix/`) | Fetches cohort students, sessions (up to 400), and `(student_id, session_id)` status map. |
| **Subject Filter Dropdown** | Matrix toolbar | Filters visible session columns | Client-side column filter + summary recalculation |Scopes sticky `RANGE SUMMARY` (`% · P / L / A`) to the selected subject or all subjects. |
| **`MatrixCellControl` Cell Dropdown** | Each `(student, session)` cell | Updates `dirtyCells[key]` | In-memory dirty map | Highlights modified cell with an amber ring (`ring-amber-500`) and pulsing dot until saved. |
| **`Save Changes ({dirtyCount})`** | Matrix toolbar / header | `handleSaveDirtyCells()` | `POST /api/v1/session-attendances/bulk_upsert/` (or ad-hoc equivalent) | Sends only modified cells (`dirtyEntries`), clears amber dirty indicators, refetches matrix. |
| **Session Header Jump Link (`↗`)** | Top-right of each session column header | `onJumpToSession(dateStr, sessionId)` | Switches to `Daily Session Roll` tab | Opens that exact date and session in the Daily Roll view. |
| **`Export CSV`** | Matrix toolbar | `handleExportCSV()` | Client-side CSV generator | Downloads full spreadsheet matrix with student codes, summary rates, and chronological session columns. |

---

## 6. Workspace 4: Schedule & Timetable (`/schedule`)

**Files:** [`app/(app)/schedule/page.tsx`](../app/%28app%29/schedule/page.tsx), [`components/timetable/schedule-workspace.tsx`](../components/timetable/schedule-workspace.tsx)

| Button / Control | Location | Handler Function | API Call & Method | Payload & UI Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| **`CohortSwitcher`** | Top workspace bar | `handleCohortChange(code)` | `GET /api/v1/timetable-slots/?class_id={id}` & `GET /api/v1/sessions/?class_id={id}` | Loads 7-day weekly slots and dated session occurrences for the selected cohort. |
| **Tab: `Timetable Grid` / `Session Roster`** | `SystemHeader` tabs | `setActiveTab("grid" \| "sessions")` | Switches view | Toggles between the 7-day (`MON`–`SUN`) vertical lane grid and the paginated dated sessions table. |
| **`+ SCHEDULE SLOT` / `+ Add Slot`** | Bottom of each day column (`MON`–`SUN`) or header | Opens `InspectorSheet` (`NEW SLOT // {DAY}`) → `handleCreateSlot()` | `POST /api/v1/timetable-slots/` (`api.createTimetableSlot`) | Payload: `{ class_obj_id, subject_id, teacher_id, day_of_week, start_time, end_time, room }`. Backend validates teacher/room overlaps and **auto-generates sessions through month-end**. |
| **Click Existing Timetable Slot Card** | 7-Day Timetable Grid | Sets `inspectedSlot = slot` | Opens Slot `InspectorSheet` | Displays 2 sub-tabs: `Dated Occurrences & Substitute Dispatch` and `Slot Template`. |
| **`Assign Sub` / Substitute Teacher Select** | Slot `InspectorSheet` → `Occurrences` tab | `handleAssignSubstitute(sessionId, teacherId)` | `PATCH /api/v1/sessions/{sessionId}/` (`api.patchSession`) | Payload: `{ actual_teacher_id: teacherId }` (or `null` on **Revert Substitute**). Assigns/clears substitute teacher cover for that specific dated session. |
| **`Take Roll` (Session Occurrence)** | Slot `InspectorSheet` or `Session Roster` row | `router.push(...)` | Client navigation | Deep-links to `/attendance?classId={id}&sessionId={sessId}&date={dateStr}`. |
| **`Save Template Changes`** | Slot `InspectorSheet` → `Edit Slot Template` tab | `handleUpdateSlot()` | `PUT /api/v1/timetable-slots/{id}/` (`api.updateTimetableSlot`) | Updates recurring slot time/teacher/subject, re-validates overlaps, and clears timetable cache. |
| **`Delete Slot`** | Slot `InspectorSheet` → `Edit Slot Template` tab | Opens `ConfirmDialog` → `handleDeleteSlot()` | `DELETE /api/v1/timetable-slots/{id}/` (`api.deleteTimetableSlot`) | Deletes recurring slot and cascades deletion of its associated dated sessions. |
| **`Generate Sessions` Drawer & Button** | `SystemHeader` action → `InspectorSheet` (`GEN // {COHORT}`) | Presets (`Today Only`, `Next 7 Days`, `This Month`) + `handleConfirmGenerateSessions()` | `POST /api/v1/sessions/generate/{classId}/` (`api.generateSessionsForClass`) | Payload: `{ start_date, end_date }`. Batch-generates dated sessions and initial `'absent'` rolls with duplicate protection (`total_created` vs `total_already_existed`). |

---

## 7. Workspace 5: Academics (`/classes`, `/classes/[id]`, `/subjects`)

**Files:** [`app/(app)/classes/page.tsx`](../app/%28app%29/classes/page.tsx), [`app/(app)/classes/[id]/page.tsx`](../app/%28app%29/classes/%5Bid%5D/page.tsx)

### 7.1 Unified Academics Workspace (`/classes`)

| Button / Control | Location | Handler Function | API Call & Method | Payload & UI Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| **Tab: `Cohorts & Classes` / `Subject Offerings & Curriculum`** | `SystemHeader` tabs | `handleTabChange("cohorts" \| "subjects")` | Switches view (`/classes` vs `/classes?tab=subjects`) | Consolidates Cohort management and the Global Subject Catalog into one workspace. |
| **Level Filter Pills (`ALL \| IG \| IAL \| YR`)** | `Cohorts` tab toolbar | `setLevelFilter(lvl)` | Client-side filter | Filters cohort table by education tier. |
| **`Add Cohort` → `Create Cohort`** | `SystemHeader` → `InspectorSheet` (`NEW // COHORT`) | `handleCreateCohort()` | `POST /api/v1/classes/` (`api.createClass`) | Payload: `{ education_level, cohort_identifier, cohort_sub_category }`. Creates cohort and invalidates `classes` cache. |
| **`Delete Selected ({count})` (Cohorts)** | `DataModule` bulk bar | Opens `ConfirmDialog` → `handleBulkDeleteCohorts()` | `DELETE /api/v1/classes/bulk_delete/` (`api.bulkDeleteClasses`) | Payload: `{ ids }`. Cascades deletion of linked slots & sessions. |
| **`Inspect` (Cohort Row)** | Cohort table row | Sets `inspectedCohort = cls` | Opens Cohort `InspectorSheet` | Sub-tabs: `Overview`, `Curriculum & Offerings`, `Settings / Edit`. |
| **`Assign Offering` (Cohort Drawer)** | Cohort `InspectorSheet` → `Curriculum` tab | `handleAssignCourse()` | `POST /api/v1/courses/` (`api.createCourse`) | Payload: `{ class_obj_id, subject_id, default_teacher_id }`. Links a subject + default teacher to the cohort. |
| **`Create & Assign` (Quick Add Subject)** | Cohort `InspectorSheet` → `Curriculum` tab | `handleQuickCreateAndAssignSubject()` | `POST /api/v1/subjects/` then `POST /api/v1/courses/` | Creates a brand-new global subject and immediately links it to the inspected cohort. |
| **Unlink Offering (`Trash2`)** | Cohort `InspectorSheet` / `/classes/[id]` | `handleUnlinkCourse(courseId)` | `DELETE /api/v1/courses/{id}/` (`api.deleteCourse`) | Removes subject offering from the cohort. |
| **`Save Changes` / `Delete Cohort`** | Cohort `InspectorSheet` → `Settings / Edit` tab | `handleUpdateCohort()` / `handleDeleteCohort()` | `PUT /api/v1/classes/{id}/` or `DELETE /api/v1/classes/{id}/` | Updates cohort identifier/level or deletes cohort. |
| **`New Subject` / `Edit` / `Delete`** | `Subjects` tab & Subject `InspectorSheet` | `handleSaveSubject()` / `handleDeleteSubject()` | `POST / PUT / DELETE /api/v1/subjects/` | Manages the global subject catalog. |

### 7.2 Cohort Detail Hub (`/classes/[id]`)
- **`Enroll` Student Button (`Cohort Roster` module):** Calls `POST /api/v1/class-students/` (`{ class_obj_id, student_id }`) to enroll a student into this primary cohort (backend enforces `unique_primary_cohort_per_student` and returns timetable conflict warnings).
- **`Remove` Student Button (`Trash2`):** Calls `DELETE /api/v1/class-students/{id}/` to unenroll the student.
- **`Take Roll` Button:** Navigates to `/attendance?classId={id}`.
- **Attendance Analytics Range & Subject Pickers:** Calls `GET /api/v1/classes/{id}/attendance-summary/?range={range}&subject_id={subjectId}` to render `ClassCampusChart`, `ClassStatusPieChart`, and `ClassSubjectBarChart`.

---

## 8. Workspace 6: Directory (`/students`, `/students/[id]`, `/teachers`, `/teachers/[id]`)

**Files:** [`app/(app)/students/page.tsx`](../app/%28app%29/students/page.tsx), [`app/(app)/students/[id]/page.tsx`](../app/%28app%29/students/%5Bid%5D/page.tsx), [`app/(app)/teachers/page.tsx`](../app/%28app%29/teachers/page.tsx), [`app/(app)/teachers/[id]/page.tsx`](../app/%28app%29/teachers/%5Bid%5D/page.tsx), [`components/bulk-import-modal.tsx`](../components/bulk-import-modal.tsx)

### 8.1 Student Directory (`/students`) & QR Pass `InspectorSheet`

| Button / Control | Location | Handler Function | API Call & Method | Payload & UI Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| **`Import Students`** | `SystemHeader` actions → `BulkImportModal` | Parses CSV, validates `SCHOOL_CODES`, clicks `Import {n} Students` | `POST /api/v1/students/bulk_create/` (`api.bulkCreateStudents`) | Payload: `{ items: StudentPayload[] }`. Batch creates students with auto-generated `unique_code` and QR tokens. |
| **`New Student` → `Create Student`** | `SystemHeader` → `InspectorSheet` | `handleCreateStudent()` | `POST /api/v1/students/` (`api.createStudent`) | Creates student record (and optional initial cohort enrollment). |
| **`Delete Selected ({count})`** | `DataModule` bulk bar | Opens `ConfirmDialog` → `handleBulkDelete()` | `DELETE /api/v1/students/bulk_delete/` (`api.bulkDeleteStudents`) | Payload: `{ ids }`. Deletes selected students. |
| **`Inspect` (Student Row)** | Student table row | Opens Student `InspectorSheet` | `GET /api/v1/students/{id}/check_in_token/` (`api.getCheckInToken`) | Fetches secret `check_in_token` on demand (never exposed in list payloads) and renders `QrCanvas`. |
| **`Download Badge PNG` / `Print Card`** | Student `InspectorSheet` (`QR Passcode` tab) & `/students/[id]` | `downloadQrPng()` / `window.open` print sheet | Client-side canvas export | Downloads high-DPI PNG badge or opens formatted ID card print window. |
| **`Rotate Token`** | Student `InspectorSheet` & `/students/[id]` | `handleRotateToken()` / `refreshQrToken()` | `POST /api/v1/students/{id}/regenerate_check_in_token/` | Generates a new 32-byte secret token, invalidating old printed QR codes, and sets `check_in_token_active = true`. |
| **`Deactivate QR` / `Activate QR`** | Student `InspectorSheet` & `/students/[id]` | `handleToggleActive()` / `toggleQrActive()` | `POST /api/v1/students/{id}/(de)activate_check_in_token/` | Soft-disables or re-enables gate check-in for the student without rotating their token. |
| **`Save Changes` (Profile Tab)** | Student `InspectorSheet` (`Profile` tab) & `/students/[id]` | `handleUpdateStudent()` / `saveProfile()` | `PUT /api/v1/students/{id}/` (`api.updateStudent`) | Updates student name, DOB, contact, school code, and exam candidate number. |

### 8.2 Student Detail Hub (`/students/[id]`) — Cohort & Cross-Subject Enrollment Controls

| Button / Control | Location | Handler Function | API Call & Method | Payload & UI Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| **`Assign Cohort` / `Unenroll`** | Primary Cohort Card | `handleEnroll()` / `handleUnenroll()` | `POST` or `PATCH /api/v1/class-students/` / `DELETE /api/v1/class-students/{id}/` | Assigns or switches the student's single primary cohort and refreshes timetable conflict checks. |
| **`Drop Course` / `Restore Course`** | Primary Cohort Course Row | `handleDropPrimaryCourse()` / `handleRestorePrimaryCourse()` | `POST /api/v1/student-subject-enrollments/` (`status: "dropped"`) or `DELETE /{id}/` | Drops a specific subject from the student's primary cohort (and removes future `'absent'` session rolls) or restores it. |
| **Host Cohort + Subject Select (Live Conflict Pre-Check)** | Cross-Cohort Subject Enrollments Card | Effect on dropdown change | `GET /api/v1/timetable/student/{id}/?candidate_class_id={c}&candidate_subject_id={s}` | Pre-checks whether the candidate elective clashes with any existing weekly timetable slot and displays a non-blocking conflict warning banner. |
| **`Enroll into Course` / `Remove Course`** | Cross-Cohort Subject Enrollments Card | `handleAddCrossEnrollment()` / `handleRemoveCrossEnrollment()` | `POST /api/v1/student-subject-enrollments/` (`status: "enrolled"`) or `DELETE /{id}/` | Enrolls student into an elective subject offered by another cohort (and auto-populates future session attendance rows). |
| **Attendance Analytics Range Tabs** | `StudentAttendanceOverview` | `setRange("week" \| "month" \| "all")` | `GET /api/v1/students/{id}/attendance-summary/?range={range}` (or `/me/attendance-summary/` for student owner) | Renders campus check-in vs lesson attendance breakdown charts. |

### 8.3 Faculty Directory (`/teachers`) & Teacher Detail Hub (`/teachers/[id]`)
- **`Import Faculty`:** Opens `BulkImportModal` (`entityType="teacher"`) → `POST /api/v1/teachers/bulk_create/`.
- **`New Teacher` / `Inspect` / `Delete` / `Delete Selected`:** Calls `POST / PUT / DELETE /api/v1/teachers/` and `DELETE /api/v1/teachers/bulk_delete/`.
- **Teacher Detail Hub (`/teachers/[id]`):** Loads weekly schedule via `GET /api/v1/timetable/teacher/{id}/` and accountability/coverage analytics via `GET /api/v1/teachers/{id}/attendance-summary/?range={week|month|all}`.

---

## 9. Workspace 7: School Communications (`/communications`, `/announcements/*`, `/events/*`)

**Files:** [`app/(app)/communications/page.tsx`](../app/%28app%29/communications/page.tsx), [`app/(app)/announcements/*`](../app/%28app%29/announcements/page.tsx), [`app/events/*`](../app/events/page.tsx), [`components/announcements/*`](../components/announcements/announcement-editor-form.tsx), [`components/events/*`](../components/events/event-editor-form.tsx)

| Button / Control | Location | Handler Function | API Call & Method | Payload & UI Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| **Tab: `Announcements` / `Events`** | `/communications` `SystemHeader` | `handleTabChange("announcements" \| "events")` | `GET /api/v1/announcements/` or `GET /api/v1/events/` | Unified staff dispatch view with search, tag chips, and status filters. |
| **`New Announcement` → `Publish`** | `/communications` → `/announcements/new` (`AnnouncementEditorForm`) | `publish(draft)` | `POST /api/v1/announcements/` (`api.createAnnouncement`) | Payload: `{ title, body, status: "published", is_featured: false, is_pinned, tag_names }`. Publishes markdown post and navigates to `/announcements`. |
| **`Edit` → `Save changes`** | `/announcements/[slug]` → `/announcements/[slug]/edit` | `save(draft)` | `PATCH /api/v1/announcements/{slug}/` (`api.updateAnnouncement`) | Updates markdown body, title, pinned state, and tags. |
| **`New Event` → `Publish Event`** | `/communications` → `/events/manage/new` (`EventEditorForm`) | `createEvent(payload)` | `POST /api/v1/events/` (`api.createEvent`) | Creates school event with audience (`internal`/`external`), registration mode (`instant_waitlist`/`approval_required`), capacity, and schedule. |
| **`Register` / `Cancel registration`** | Public/Member Event Detail (`/events/[slug]`) | `register()` / `cancel()` | `POST /api/v1/events/{slug}/register/` or `/cancel-registration/` | Registers signed-in user (`confirmed`, `waitlisted`, or `pending`) or cancels registration. Redirects unauthenticated visitors to `/sign-in`. |
| **`Confirm` / `Waitlist` / `Cancel` (Roster Review)** | Staff Event Registrations (`/events/manage/[slug]/registrations`) | `setStatus(regId, status)` | `POST /api/v1/events/{slug}/registrations/{regId}/review/` (`api.reviewEventRegistration`) | Payload: `{ status: "confirmed" \| "waitlisted" \| "cancelled" }`. Updates participant status in real time. |
| **`Delete Event`** | `/events/manage/[slug]` | `deleteEvent(slug)` | `DELETE /api/v1/events/{slug}/` | Deletes event and redirects to `/events`. |

---

## 10. Workspace 8: User Administration & Account Matching (`/users/*` — Admin Only)

**Files:** [`components/users/user-accounts-panel.tsx`](../components/users/user-accounts-panel.tsx), [`components/users/clerk-sync-dialog.tsx`](../components/users/clerk-sync-dialog.tsx), [`app/(app)/users/matching/students/page.tsx`](../app/%28app%29/users/matching/students/page.tsx), [`app/(app)/users/matching/teachers/page.tsx`](../app/%28app%29/users/matching/teachers/page.tsx)

### 10.1 Account Lifecycle & Clerk Sync Flow (ASCII)

```text
+-----------------------------------------------------------------------------------+
| 1. CLERK IDENTITY PROVISIONING                                                    |
|    +-- Automatic JIT on first login (ClerkJWTAuthentication -> role='pending')    |
|    +-- Webhook sync (POST /api/v1/webhooks/clerk/)                                |
|    +-- Manual Admin Pull: Click "Clerk Sync" -> GET /api/v1/users/clerk_sync/     |
|        +-- Click "Import All" -> POST /api/v1/users/clerk_import/                 |
|        +-- Click "Link" orphan -> POST /api/v1/users/{id}/clerk_link/             |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 2. PROFILE LINKING OR DIRECT ROLE ASSIGNMENT                                      |
|    +-- Student Match (/users/matching/students):                                  |
|        Click "Link" -> POST /api/v1/students/{id}/link_user/ {"user_id"}          |
|        (Sets Student.user = User AND auto-promotes User.role = 'student')         |
|    +-- Teacher Match (/users/matching/teachers):                                  |
|        Click "Link" -> POST /api/v1/teachers/{id}/link_user/ {"user_id"}          |
|        (Sets Teacher.user = User AND auto-promotes User.role = 'teacher')         |
|    +-- Direct Role Select (/users/management):                                    |
|        Select 'staff' / 'admin' / 'terminal' -> PATCH /api/v1/users/{id}/         |
+-----------------------------------------------------------------------------------+
```

### 10.2 Controls & Actions Catalog

| Button / Control | Location | Handler Function | API Call & Method | Payload & UI Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| **`Clerk Sync` Button** | `/users/management` header | Opens `ClerkSyncDialog` | `GET /api/v1/users/clerk_sync/` (`api.getClerkSync`) | Compares live Clerk directory against Django `people.User` table and lists unlinked accounts on both sides. |
| **`Import All ({count})` / Row `Import`** | `ClerkSyncDialog` (`Clerk Unlinked` section) | `runImport()` | `POST /api/v1/users/clerk_import/` (`api.importClerkUsers`) | Payload: `{}` (all) or `{ clerk_ids: [id] }`. Creates `pending` Django user rows for Clerk accounts and refreshes `/users/management`. |
| **Row `Link` (Orphan Django User)** | `ClerkSyncDialog` (`Django Unlinked` section) | `runLink(user)` | `POST /api/v1/users/{id}/clerk_link/` (`api.linkClerkUser`) | Payload: `{ clerk_id }`. Re-binds an existing Django user record to a Clerk `user_...` ID. |
| **Role Selector Dropdown** | `/users/management` row | `handleRoleSelect(user, newRole)` | `PATCH /api/v1/users/{id}/` (`api.updateUser`) | Payload: `{ role: newRole }`. Prompts confirmation if role change affects a linked profile; guarded on backend against demoting the last admin. |
| **`Deactivate` / `Reactivate`** | `/users/management` row | Opens `ConfirmDialog` → `api.updateUser(id, { is_active })` | `PATCH /api/v1/users/{id}/` | Toggles `is_active`. Deactivated users are immediately locked out of operational APIs and routed to `/account-locked`. Disabled when `can_deactivate === false` (self or last admin). |
| **Delete User (`Trash2`)** | `/users/management` row | Opens `ConfirmDialog` → `api.deleteUser(id)` | `DELETE /api/v1/users/{id}/` | Deletes Django user row. Disabled with tooltip (`delete_blocked_reason`) if user is self, last admin, or still linked to a Student/Teacher/Staff profile. |
| **`Link` Student Account** | `/users/matching/students` (`Unmatched Accounts` table) | `handleLink(user)` | `POST /api/v1/students/{studentId}/link_user/` (`api.linkStudentUser`) | Payload: `{ user_id: user.id }`. Links `Student.user` and promotes `user.role` to `"student"`. |
| **`Unlink` Student Account** | `/users/matching/students` (`Linked Accounts` table) | Opens Dialog → `handleUnlink()` | `POST /api/v1/students/{studentId}/unlink_user/` (`api.unlinkStudentUser`) | Clears `Student.user` and resets `user.role` back to `"pending"`. |
| **`Link` Teacher Account** | `/users/matching/teachers` (`Unmatched Accounts` table) | `handleLink(user)` | `POST /api/v1/teachers/{teacherId}/link_user/` (`api.linkTeacherUser`) | Payload: `{ user_id: user.id }`. Links `Teacher.user` and promotes `user.role` to `"teacher"`. |
| **`Unlink` Teacher Account** | `/users/matching/teachers` (`Linked Accounts` table) | Opens Dialog → `handleUnlink()` | `POST /api/v1/teachers/{teacherId}/unlink_user/` (`api.unlinkTeacherUser`) | Clears `Teacher.user` and resets `user.role` back to `"pending"`. |
