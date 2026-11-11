# Hinthar Dashboard — Design System, Styling, Primitives & Motion Reference

**Repository:** `Hinthar-Dashboard/hinthar-dashboard`  
**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · shadcn/ui (`base-vega / zinc`) · GSAP 3 (`@gsap/react`)  
**Source of Truth Files:**
- Theme & CSS Tokens: [`app/globals.css`](../app/globals.css), [`components/theme-provider.tsx`](../components/theme-provider.tsx), [`lib/status-styles.ts`](../lib/status-styles.ts), [`lib/chart-colors.ts`](../lib/chart-colors.ts)
- V2 Primitives: [`components/design-system/v2-primitives.tsx`](../components/design-system/v2-primitives.tsx)
- High-Density Matrix: [`components/attendance/attendance-matrix-view.tsx`](../components/attendance/attendance-matrix-view.tsx)
- Motion & GSAP: [`lib/gsap/easings.ts`](../lib/gsap/easings.ts), [`lib/gsap/reduced-motion.ts`](../lib/gsap/reduced-motion.ts), [`components/animation/animated-table-body.tsx`](../components/animation/animated-table-body.tsx)
- TypeScript Contracts: [`lib/types.ts`](../lib/types.ts)

---

## 1. Core Design Philosophy & Three-Tier Surface Architecture

Hinthar Dashboard v2 implements a **strict Two-Mode Tactical Monochrome System** (`Light` and `Dark` only). All interactive chrome (active tabs, primary buttons, active `LVL` filter pills, sidebar selection indicators, `CodeChip` left bars, and focus rings) uses high-contrast monochrome foreground/background tokens. Color is strictly reserved for **real-time operational telemetry** (attendance statuses, alerts, and destructive actions).

### 1.1 Three-Tier Surface Elevation Diagram (ASCII)

```text
+-----------------------------------------------------------------------------------+
| TIER 01: APP CANVAS (--background)                                                |
| Light: #F4F4F5 (Zinc 100)  |  Dark: #09090B (Zinc 950 Deep)                       |
| Role: Viewport floor, recessed workspace base, and fixed sidebar backdrop         |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | TIER 02: DATA MODULE (--card) + 1px Structural Hairline (--border)          |  |
|  | Light: #FFFFFF (Pure White) / Border #E4E4E7                                |  |
|  | Dark:  #121215 (Elevated Zinc) / Border #242429                             |  |
|  | Role: SystemHeader, DataModule tables, Timetable Grid, KPI Cards, Sheets    |  |
|  |                                                                             |  |
|  |   +---------------------------------------------------------------------+   |  |
|  |   | TIER 03: FLOATING & INTERACTIVE (--popover / --muted)               |   |  |
|  |   | Light: #FAFAFA (Zinc 50)   |  Dark: #18181C (Tactical Slate)        |   |  |
|  |   | Role: Select dropdowns, Combobox popovers, RollStatus menus, Sheets |   |  |
|  |   +---------------------------------------------------------------------+   |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### 1.2 Complete CSS Custom Properties Table (`app/globals.css`)

Tailwind CSS v4 `@theme inline` binds CSS custom properties directly to utility classes:

| CSS Custom Property | `@theme inline` Binding | Light Mode (`:root`) | Dark Mode (`.dark`) | Semantic Role & Architectural Usage |
| :--- | :--- | :--- | :--- | :--- |
| `--background` | `--color-background` | `#F4F4F5` (Zinc 100) | `#09090B` (Zinc 950) | **Tier 01 Canvas**: Viewport floor and recessed workspace base |
| `--foreground` | `--color-foreground` | `#18181B` (Zinc 900) | `#FAFAFA` (Zinc 50) | High-contrast body text and primary labels |
| `--card` | `--color-card` | `#FFFFFF` (Pure White) | `#121215` (Zinc 900) | **Tier 02 Module**: `DataModule`, `SystemHeader`, `InspectorSheet` |
| `--card-foreground` | `--color-card-foreground` | `#18181B` (Zinc 900) | `#FAFAFA` (Zinc 50) | Primary text on elevated cards and modules |
| `--popover` | `--color-popover` | `#FAFAFA` (Zinc 50) | `#18181C` (Zinc 900) | **Tier 03 Floating**: Dropdowns, select popups, combobox listboxes |
| `--popover-foreground` | `--color-popover-foreground` | `#18181B` (Zinc 900) | `#FAFAFA` (Zinc 50) | Text inside floating popovers and tooltips |
| `--primary` | `--color-primary` | `#18181B` (Zinc 900) | `#FAFAFA` (Zinc 50) | Primary CTA buttons, active tab underlines, focus accents |
| `--primary-foreground` | `--color-primary-foreground` | `#FAFAFA` (Zinc 50) | `#09090B` (Zinc 950) | Text on primary buttons and active indicators |
| `--secondary` | `--color-secondary` | `#E4E4E7` (Zinc 200) | `#1B1B20` (Zinc 850) | Secondary control backgrounds and muted badges |
| `--secondary-foreground` | `--color-secondary-foreground` | `#18181B` (Zinc 900) | `#FAFAFA` (Zinc 50) | Text on secondary buttons and secondary tags |
| `--muted` | `--color-muted` | `#E4E4E7` (Zinc 200) | `#1B1B20` (Zinc 850) | Recessed toolbar tracks, skeleton base fills, disabled pills |
| `--muted-foreground` | `--color-muted-foreground` | `#71717A` (Zinc 500) | `#A1A1AA` (Zinc 400) | Subtitles, overline headers, table column headers, icons |
| `--accent` | `--color-accent` | `#E4E4E7` (Zinc 200) | `#1F1F26` (Zinc 800) | Table row hover fills, active list item highlights |
| `--accent-foreground` | `--color-accent-foreground` | `#18181B` (Zinc 900) | `#FAFAFA` (Zinc 50) | Text inside active or hovered controls |
| `--destructive` | `--color-destructive` | `#F43F5E` (Rose 500) | `#F43F5E` (Rose 500) | Errors, delete confirmations, Absent roll status |
| `--success` | `--color-success` | `#10B981` (Emerald 500) | `#10B981` (Emerald 500) | Positive toasts, success banners, Present roll status |
| `--success-foreground` | `--color-success-foreground` | `#FFFFFF` | `#09090B` | Text placed on solid success backgrounds |
| `--warning` | `--color-warning` | `#F59E0B` (Amber 500) | `#F59E0B` (Amber 500) | Caution notices, Late roll status, substitute badges |
| `--warning-foreground` | `--color-warning-foreground` | `#18181B` | `#09090B` | Text placed on solid warning backgrounds |
| `--border` | `--color-border` | `#E4E4E7` (Zinc 200) | `#242429` (Zinc 800) | Structural `1px` hairlines, table borders, panel separators |
| `--input` | `--color-input` | `#D4D4D8` (Zinc 300) | `#27272A` (Zinc 800) | Form controls, select triggers, interactive input outlines |
| `--ring` | `--color-ring` | `#18181B` (Zinc 900) | `#FAFAFA` (Zinc 50) | Focus-visible ring outlines |
| `--attendance-present` | `--color-attendance-present` | `#10B981` (Emerald 500) | `#10B981` (Emerald 500) | Lesson attendance: Present status and chart series |
| `--attendance-late` | `--color-attendance-late` | `#F59E0B` (Amber 500) | `#F59E0B` (Amber 500) | Lesson attendance: Late status and chart series |
| `--attendance-absent` | `--color-attendance-absent` | `#F43F5E` (Rose 500) | `#F43F5E` (Rose 500) | Lesson attendance: Absent status and chart series |
| `--attendance-excused` | `--color-attendance-excused` | `#A1A1AA` (Zinc 400) | `#A1A1AA` (Zinc 400) | Lesson attendance: Excused status and chart series |
| `--attendance-campus` | `--color-attendance-campus` | `#18181B` (Zinc 900) | `#FAFAFA` (Zinc 50) | Campus building presence check-in chart series |
| `--chart-1` … `--chart-5` | `--color-chart-1..5` | Monochrome + Semantic | Monochrome + Semantic | Recharts series tokens |
| `--sidebar` | `--color-sidebar` | `#F4F4F5` | `#09090B` | Fixed sidebar navigation background |
| `--sidebar-border` | `--color-sidebar-border` | `#E4E4E7` | `#242429` | Vertical `1px` seam separating sidebar from workspace |
| `--radius` | `--radius-sm` … `--radius-4xl` | `0.25rem` (`4px`) | `0.25rem` (`4px`) | Base radius locking control geometry to `4px` |

### 1.3 Zero-Flash Theme Hydration & Clerk Layering
- **Before-Interactive Theme Script ([`app/layout.tsx`](../app/layout.tsx)):** Reads `localStorage.getItem('theme')` (falling back to `prefers-color-scheme: dark`), toggles `document.documentElement.classList.add('dark')`, and locks `data-palette="mono"` prior to first paint.
- **Theme Provider ([`components/theme-provider.tsx`](../components/theme-provider.tsx)):** Manages `theme: "light" | "dark"`. Legacy multi-palette switching is retired (`setPalette` is a no-op enforcing `"mono"`).
- **Clerk CSS Isolation ([`components/clerk-theme-provider.tsx`](../components/clerk-theme-provider.tsx)):** Uses `cssLayerName: "clerk"` inside `@layer theme, base, clerk, components, utilities;` so Clerk styles never override Tailwind v4 utilities.

---

## 2. Typography, Geometry & Spacing Standards

### 2.1 Typography Hierarchy
Fonts are loaded in [`app/layout.tsx`](../app/layout.tsx): `Inter` (`--font-sans`), `Geist` (`--font-geist-sans`), and `Geist_Mono` (`--font-geist-mono`).

| Element Role | Tailwind Utility Classes | Usage |
| :--- | :--- | :--- |
| **Workspace / Page Title** | `text-xl font-bold tracking-tight text-foreground` (`20px`) | `SystemHeader` primary title |
| **Legacy / Hub Page Title** | `text-2xl font-bold tracking-tight text-foreground` (`24px`) | `StandardPageHeader` on entity detail hubs |
| **Section / Card Title** | `text-sm font-semibold text-foreground` | Card headers, drawer sections |
| **Domain Overline / Table Head** | `font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground` | Breadcrumbs (`OPERATIONS // ATTENDANCE`), table column `<th>` |
| **Primary Table Cell** | `text-[13px] font-medium text-foreground` | Student/teacher names, cohort names |
| **Secondary / Supporting Text** | `text-xs text-muted-foreground` | Subtitles, timestamps, descriptions |
| **Technical Codes & Telemetry** | `font-mono text-xs tabular-nums` (or `text-[11px]`) | IDs (`HIS-26-1042`), cohorts (`IG K1`), time ranges (`09:00 – 10:30`), KPI counts, rates (`94%`) |

### 2.2 Corner Radii Hierarchy
- **`6px` (`rounded-md`):** Outer `DataModule` frames, `SystemHeader` containers, `InspectorSheet` panels, KPI cards.
- **`4px` (`rounded-sm` / `--radius`):** All interactive buttons, inputs, `<Select>` triggers, `RollStatusControl` cells, and filter controls.
- **`2px` (`rounded-[2px]`):** `TelemetryTag` badges, `CodeChip` identifiers (with `border-l-2` accent bar), and segmented switcher pills.
- **`1px` (`rounded-[1px]`):** Status dot indicators (`size-1.5 rounded-[1px]`) inside `TelemetryTag` and `SystemHeader`.
- **Banned:** Pill-shaped (`rounded-full`, `rounded-2xl`) buttons, cards, or table status badges.

### 2.3 Zero-Seam Table & Toolbar Spacing
- **Docked Command Toolbar:** `px-3.5 py-2.5 bg-muted/30 border-b border-border`.
- **Table Header (`<thead>`):** `h-9 bg-muted/30 border-b border-border`.
- **Table Row (`<tr>`):** `h-11` (`44px`) in standard tables; `DEFAULT_ROW_HEIGHT = 41px` in animated table bodies; `h-10` (`40px`) in dense attendance matrices.
- **Flush Seams:** `0px` margin/gap between toolbar, table canvas, and pagination footer—separated strictly by `1px` `border-border` hairlines.
- **Custom Scrollbars (`app/globals.css`):** `3px` width/height, trackless thumb using `color-mix(in oklch, var(--foreground) 18%, transparent)` (`32%` on hover).

### 2.4 Status Style Helpers ([`lib/status-styles.ts`](../lib/status-styles.ts))
- **`feedbackBanner`:** `success`, `warning`, and `destructive` alert banners (`border-{tone}/30 bg-{tone}/10 text-{tone}`).
- **`attendanceSurface`:** Soft cell/badge tints (`bg-attendance-{status}/15 text-attendance-{status} border-attendance-{status}/30`).
- **`attendanceSolid`:** High-emphasis active buttons (`bg-attendance-{status} text-white border-attendance-{status}`).
- **`attendanceRowTint`:** Subtle row background highlights (`bg-attendance-{status}/5 border-attendance-{status}/30`).

---

## 3. Education Center Domain Rules

1. **No Homeroom Teachers & No Terms:**
   - Cohorts (`IG K1`, `IAL A1`, `Year8 A`) do **not** have a homeroom teacher or academic term.
   - Cohort records consist of `education_level` (`IG`, `IAL`, `Year1`–`Year9`), `cohort_identifier`, `cohort_sub_category`, enrolled student count, and linked `Course` (`SubjectOffering`) records.
   - Teachers are assigned at the **Course / Timetable Slot / Session** level (`teacher` and optional substitute `actual_teacher`).
2. **7-Day Flexible Timetable (`MON`–`SUN`, No Fixed Bell Periods):**
   - Classes run 7 days a week (`0 = Monday` through `6 = Sunday`) at arbitrary start/end times (`09:00 – 10:30`, `13:30 – 15:00`, etc.).
   - There are no fixed `P1 / P2 / P3` rows or lunch break rows. The Weekly Grid renders 7 vertical day columns (`grid-cols-7 divide-x divide-border`), stacking each day's time-sorted slots vertically.
3. **Global Subject Catalog:**
   - `Subject` is a global catalog surfaced as a peer tab (`Cohorts | Subject Catalog`) inside the unified **Academics** workspace (`/classes`), plus inline quick-creation inside the Cohort drawer.
4. **Check-In Past/Today Date Clamp (`max={todayStr}`):**
   - Campus gate check-in and manual roll views clamp date selection to `max={todayStr}` so future check-in logs cannot be created accidentally.
5. **Matrix `null` (Unmarked) vs `'absent'`:**
   - In lesson attendance matrices, a student with no `SessionAttendance` row for a session receives `null` (rendered as `—` / `UNMARKED`), never `'absent'`. Only explicit attendance records count toward attendance rate denominators.

---

## 4. V2 Design System Primitives ([`components/design-system/v2-primitives.tsx`](../components/design-system/v2-primitives.tsx))

### 4.1 Visual Anatomy of a V2 Workspace Screen (ASCII)

```text
+-----------------------------------------------------------------------------------+
| [▪] OPERATIONS // ATTENDANCE                                                      |
| Lesson Attendance                   [P: 18 | L: 2 | A: 1 | RATE: 95%]  [Export v] |
| --------------------------------------------------------------------------------- |
| [Daily Session Roll]   [Monthly & Subject Matrix]                                 |
+-----------------------------------------------------------------------------------+
| [ALL|IG|IAL|YR]  [ COHORT // IG K1 (24) v ] [<] [>]   ENROLLED: 24  [✨ AD-HOC] [↻]|
+-----------------------------------------------------------------------------------+
| [🔍 Search students...       ] [Subject Filter v]          COUNT: 24   [< Page 1 >]|
| --------------------------------------------------------------------------------- |
| CODE          | STUDENT NAME         | STATUS CONTROL       | REMARKS             |
| ------------- | -------------------- | -------------------- | ------------------- |
| [│HIS-26-101] | Aung Myint Myat      | [● PRESENT [P]  |v]  | On time             |
| [│HIS-26-102] | Su Su Khin           | [● LATE [L]     |v]  | +10m                |
| --------------------------------------------------------------------------------- |
| COUNT ALL // 24 STUDENTS                                       [Prev] 1 / 1 [Next]|
+-----------------------------------------------------------------------------------+
```

### 4.2 Component Specifications & Prop Contracts

#### 1. [`SystemHeader`](../components/design-system/v2-primitives.tsx)
Unified workspace header with monospace breadcrumb overline, title, inline telemetry metric strip, docked bottom tabs, and right-aligned action slot.
- **Props (`SystemHeaderProps`):**
  - `domain?: string` — Overline prefix (e.g., `"OPERATIONS"`, `"ACADEMICS"`, `"DIRECTORY"`).
  - `breadcrumb?: { label: string; onClick?: () => void }[] | string` — Path segments separated by `//`.
  - `title: string` — Main heading (`text-xl font-bold`).
  - `description?: string` — Optional subtitle (`text-xs text-muted-foreground`).
  - `metrics?: { label: string; value: string | number; tone?: "default" | "success" | "warning" | "destructive" }[]` — Divided monospace metric cells.
  - `tabs?: { id: string; label: string; count?: number }[]` — Docked bottom tab bar.
  - `activeTab?: string` & `onTabChange?: (id: string) => void` — Tab state handlers.
  - `actions?: React.ReactNode` — Right-aligned CTA buttons.

#### 2. [`DataModule`](../components/design-system/v2-primitives.tsx)
Zero-seam table and grid wrapper combining a docked command toolbar, bulk-selection action bar, horizontal scroll canvas, and pagination footer.
- **Props (`DataModuleProps`):**
  - `searchPlaceholder?: string`, `searchValue?: string`, `onSearchChange?: (val: string) => void`
  - `filters?: React.ReactNode` — Left toolbar slot right after the search box.
  - `toolbarRight?: React.ReactNode` — Right toolbar slot (hidden when `selectedCount > 0`).
  - `selectedCount?: number`, `onClearSelection?: () => void`, `bulkActions?: React.ReactNode` — Replaces right toolbar when rows are checked.
  - `totalCount?: number`, `countLabel?: string`, `page?: number`, `totalPages?: number`, `onPageChange?: (page: number) => void` — Footer pagination controls.

#### 3. [`CohortSwitcher`](../components/design-system/v2-primitives.tsx)
Full-width single-row cohort selection bar eliminating intermediate "pick a class" pages on Schedule, Attendance, and Check-In workspaces.
- **Props (`CohortSwitcherProps`):**
  - `value: string`, `onValueChange: (val: string) => void`
  - `cohorts?: CohortSwitcherOption[]` (`id`, `code`, `level`, `levelLabel`, `studentCount`, `subjectCount`)
  - `includeAdhoc?: boolean` — Renders the `AD-HOC` tutoring session toggle pill.
  - `actions?: React.ReactNode` — Right-hand slot (hosts the `Refresh` button and date/range pickers).
- **Behavior:**
  - **Segmented `LVL` Filter (`ALL | IG | IAL | YR`):** Levels with `0` cohorts dim to `text-muted-foreground/40`. Selecting an empty level clears the active cohort and renders `COHORT // NO {LVL} COHORTS` inside a dashed trigger.
  - **Fixed-Width Dropdown (`w-[260px] shrink-0`):** Prevents adjacent `<` `>` stepper buttons from shifting horizontally when switching between cohorts with different name lengths.

#### 4. [`RollStatusControl`](../components/design-system/v2-primitives.tsx)
Tactical spreadsheet dropdown (`h-7 min-w-[128px] rounded-sm border`) for marking student attendance (`present`, `late`, `absent`, `excused`).
- **Props (`RollStatusControlProps`):**
  - `value: "present" | "late" | "absent" | "excused"`
  - `onChange: (val: RollAttendanceStatus) => void`
- **Visuals:** Renders semantic border/fill tint, square status dot, uppercase status label, `1px` vertical divider, chevron, and dropdown items with shortcut hints (`[P]`, `[L]`, `[A]`, `[E]`).

#### 5. [`InspectorSheet`](../components/design-system/v2-primitives.tsx)
Standardized right-hand slide-over drawer (`w-full sm:w-[440px] sm:max-w-[520px] p-0 border-l border-border bg-card`).
- **Props (`InspectorSheetProps`):**
  - `open: boolean`, `onOpenChange: (open: boolean) => void`
  - `code?: string` — Rendered in an accented `CodeChip` in the top header.
  - `title: string`, `subtitle?: string`
  - `status?: { label: string; tone?: TelemetryStatus; variant?: TelemetryStatus | string }` — Rendered as a `TelemetryTag`.
  - `fields?: { label: string; value: React.ReactNode; mono?: boolean }[]` — 2-column key-value telemetry grid (`grid-cols-[130px_1fr]`).
  - `children?: React.ReactNode` — Main scrollable body (commonly hosts a 2-tab mode switcher).
  - `footerActions?: React.ReactNode` — Docked bottom action bar (`border-t border-border bg-muted/20 p-4`).

#### 6. [`CodeChip`](../components/design-system/v2-primitives.tsx) & [`TelemetryTag`](../components/design-system/v2-primitives.tsx)
- **`CodeChip`:** Monospace badge (`rounded-[2px] border border-border px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums`). When `accent={true}`, adds a `2px` solid foreground left bar (`border-l-2 border-l-foreground`).
- **`TelemetryTag`:** Square-corner status badge (`rounded-[2px] border px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider`) with a `6px` (`size-1.5 rounded-[1px]`) leading status dot. Supports `present`, `late`, `absent`, `excused`, `active`, `inactive`, `info`, `neutral`.

---

## 5. High-Density Attendance Matrix & Shared Components

### 5.1 [`AttendanceMatrixView`](../components/attendance/attendance-matrix-view.tsx)
Cross-session spreadsheet matrix used in `/attendance` (Monthly & Subject Matrix tab) for both Cohort sessions (`/api/v1/attendance/matrix/`) and Ad-Hoc sessions (`/api/v1/adhoc-attendance/matrix/`).

```text
+------------------------+-----------------+------------------+------------------+
| STICKY COL 1 (left-0)  | STICKY COL 2    | SESSION COL 1    | SESSION COL 2    |
| w-[230px] z-20 bg-card | left-[230px]    | w-[165px]        | w-[165px]        |
|                        | w-[150px] z-20  |                  |                  |
+------------------------+-----------------+------------------+------------------+
| Student Name & Code    | RANGE SUMMARY   | Mathematics [↗]  | Physics [↗]      |
|                        | Rate % · P/L/A  | Tr. Kyaw         | Tr. Su (Sub)     |
|                        |                 | Mon 10 Nov 09:00 | Tue 11 Nov 11:00 |
+------------------------+-----------------+------------------+------------------+
| Aung Myint Myat        | 92%  P:11 L:1 A:1| [● PRESENT  v]  | [● LATE *   v]   |
| [│HIS-26-1042]         |                 |                  | (Dirty = Amber)  |
+------------------------+-----------------+------------------+------------------+
```

- **Viewport-Bounded Scroll Container:** `relative max-h-[calc(100vh-310px)] min-h-[380px] w-full overflow-auto border-t border-border`.
- **Opaque Sticky Columns:** Uses `border-separate border-spacing-0` and solid `bg-card` (`group-hover:bg-muted`) on Sticky Column 1 (`left-0 w-[230px]`) and Sticky Column 2 (`left-[230px] w-[150px] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.25)]`) so scrolling session cells never bleed through.
- **Dirty Cell Tracking:** Modified cells get an amber ring (`ring-1 ring-amber-500 border-amber-500`) and pulsing dot (`bg-amber-500 animate-pulse`) until committed via **Save Changes**.
- **Summary Calculation:** `overallRate = Math.round(((totalPresent + totalLate) / totalRecorded) * 100)`. Rate badge is colored Emerald (`>=90%`), Amber (`75–89%`), or Rose (`<75%`).

### 5.2 Other Shared Components
- **[`StandardPageHeader`](../components/standard-page-header.tsx):** Used on entity detail hubs (`/students/[id]`, `/teachers/[id]`, `/classes/[id]`). Enforces `reloadActionLabel(hasLoaded)` (`"Load Data"` before initial load, `"Refresh"` thereafter; never `"Loading…"`).
- **[`StandardTablePagination`](../components/standard-table-pagination.tsx):** Interacts with `TableRevealProvider` to set directional row reveal (`placement="top"` → top-down; `placement="bottom"` → bottom-up).
- **[`QrCanvas`](../components/qr-canvas.tsx):** Dynamically imports `qrcode` (`import("qrcode")`) to render student check-in QR passes onto an HTML5 `<canvas>` without bloating initial JS bundles.
- **[`BulkImportModal`](../components/bulk-import-modal.tsx):** Client-side RFC-4180 CSV parser, fuzzy header mapper (`name`/`full_name`, `school_code`, `dob`, `contact`), date normalizer (`DD/MM/YYYY` → `YYYY-MM-DD`), inline cell editor for invalid rows, and batch uploader (`POST /students/bulk_create/` or `POST /teachers/bulk_create/`).
- **[`MarkdownEditor`](../components/markdown/markdown-editor.tsx):** `@mdxeditor/editor` wrapper with `EditorTitle`, `EditorSummary`, and floating formatting bar (`editor-floating-bar.tsx`) used for Announcements and Events.
- **[`ChartExportMenu`](../components/chart-export-menu.tsx):** Exports Recharts analytics panels to CSV (`downloadCsv`) or PNG (`exportContainerChartPng`).
- **[`SessionTeacherCell`](../components/session-teacher-cell.tsx):** Displays `actual_teacher` with a `Substitute` badge and tooltip revealing the originally assigned teacher.

---

## 6. GSAP Motion, Table Reveals & Skeleton Stability

### 6.1 Timing Tokens ([`lib/gsap/easings.ts`](../lib/gsap/easings.ts))

| Token | Value | Purpose |
| :--- | :--- | :--- |
| `durations.page` | `0.40s` | Route entrance in [`app/(app)/template.tsx`](../app/(app)/template.tsx) (disabled on `/check-in/terminal`) |
| `durations.enter` | `0.45s` | One-shot mount enter (`useGsapEnter`) |
| `durations.reveal` | `0.40s` | `StaggerItem` and `Card` cascade reveal |
| `durations.row` | `0.32s` | Table row opacity fade |
| `durations.presence` | `0.22s` | Icon swaps (`GsapPresence` in `ThemeToggle`), small panels |
| `durations.hover` | `0.18s` | Pointer micro-interactions |
| `staggers.section` | `0.07s` | Delay between `StaggerItem` / `Card` elements (`delay = 0.04 + index * 0.07`) |
| `staggers.row` | `0.045s` | Delay between table rows (capped at `TABLE_ROW_STAGGER_CAP = 24`) |
| `easeOutSoft` | `"power2.out"` | Standard entrance and row reveal curve |
| `easeOutSnap` | `"power3.out"` | Crisp icon/presence transitions |

### 6.2 Motion Rules & React Safety
1. **Zero-Latency Persistent Chrome:** [`SiteHeader`](../components/site-header.tsx) and [`AppSidebar`](../components/app-sidebar.tsx) do **not** run mount entrance animations so workspace switching feels instantaneous (`0ms` header latency).
2. **Never Use Inline `style={{ opacity: 0 }}`:** Elements waiting for GSAP use CSS attribute selectors (`[data-gsap-enter]:not([data-gsap-entered]) { opacity: 0; }`). Upon tween completion, GSAP sets `data-gsap-entered` and calls `clearProps: "opacity,transform"`.
3. **Directional Opacity-Only Table Reveals ([`components/animation/animated-table-body.tsx`](../components/animation/animated-table-body.tsx)):**
   - Table rows animate **`opacity` only** (never `translateY` or `translateX`) so scrollbars never flash during pagination.
   - Top pagination bar reveals rows `start -> end`; bottom pagination bar reveals rows `end -> start`.
   - Up to `TABLE_ROW_STAGGER_CAP` (`24`) rows stagger individually (`0.045s` each); any remaining rows fade in simultaneously as a single group.
   - When reloading while data is already on screen (`loading && hasData`), existing rows stay mounted and dim to `opacity: 0.55` instead of collapsing back to skeletons.
4. **Reduced Motion Support ([`lib/gsap/reduced-motion.ts`](../lib/gsap/reduced-motion.ts)):**
   - Controlled via the header `MotionToggle` (`localStorage.getItem("reduced-motion")` → `html[data-reduced-motion="true"]`) or OS `prefers-reduced-motion: reduce`.
   - When active, CSS overrides immediately force `opacity: 1` and disable `.skeleton-shimmer`, while all GSAP hooks bypass tweens and jump straight to completion.
5. **Skeleton Stability (`.skeleton-shimmer`):**
   - `animate-pulse` is banned. All skeletons use `.skeleton-shimmer` (`1.8s ease-in-out infinite` gradient sweep).
   - `AnimatedTableBody` reserves `TABLE_RESERVE_ROWS = 8` using invisible `<FillerRows>` so short pages keep a stable vertical footprint.

---

## 7. Frontend TypeScript Domain Contracts ([`lib/types.ts`](../lib/types.ts))

| Type / Interface | Key Fields | Backend Origin |
| :--- | :--- | :--- |
| `Role` | `"admin" \| "staff" \| "terminal" \| "teacher" \| "student" \| "pending"` | `people.User.role` |
| `SchoolCode` | `"HIS" \| "SPD" \| "SPN" \| "YWM"` | `people.Student.school_code` / `Teacher.school_code` |
| `EducationLevel` | `"IAL" \| "IG" \| "Year1" … "Year9"` | `academics.Class.education_level` |
| `Class` | `id`, `education_level`, `cohort_identifier`, `cohort_sub_category`, `full_cohort_identifier` | `/api/v1/classes/` |
| `Student` | `id`, `unique_code`, `name`, `dob`, `enrollment_date`, `school_code`, `contact`, `exam_candidate_number`, `user_id`, `check_in_token?`, `check_in_token_active?`, `class_labels?`, `class_ids?` | `/api/v1/students/` |
| `Teacher` | `id`, `unique_code`, `name`, `employment_type` (`"full_time" \| "tutor"`), `contact`, `school_code`, `join_date`, `user_id` | `/api/v1/teachers/` |
| `Subject` / `Course` | `Subject { id, name }` · `Course { id, class_obj, subject, default_teacher, cohort_identifier, course_label }` | `/api/v1/subjects/`, `/api/v1/courses/` |
| `TimetableSlot` | `id`, `class_obj`, `subject`, `teacher`, `day_of_week` (`0`–`6`), `start_time`, `end_time`, `room`, `course_id` | `/api/v1/timetable-slots/` |
| `Session` | `id`, `timetable_slot`, `teacher`, `actual_teacher`, `class_obj`, `start_time` (ISO), `end_time` (ISO), `status` | `/api/v1/sessions/` |
| `SessionAttendance` | `id`, `session`, `student`, `attended`, `status` (`"present" \| "late" \| "absent" \| "excused"`), `remarks` | `/api/v1/session-attendances/` |
| `AdHocSession` | `id`, `title`, `teacher`, `start_time`, `end_time`, `date`, `subject`, `status` | `/api/v1/adhoc-sessions/` |
| `CheckIn` / `CheckInLookup` | `id`, `student`, `student_name`, `date`, `timestamp`, `check_in_type` (`"qr" \| "manual"`), `checked_by` | `/api/v1/check-ins/` |
| `Announcement` | `id`, `title`, `slug`, `body`, `status`, `is_featured`, `is_pinned`, `published_at`, `author_name`, `tags` | `/api/v1/announcements/` |
| `SchoolEvent` / `EventRegistration` | `id`, `title`, `slug`, `summary`, `body`, `audience`, `registration_mode`, `status`, `starts_at`, `ends_at`, `location`, `capacity`, `registration_count`, `my_registration` | `/api/v1/events/` |
| `Paginated<T>` | `count: number`, `next: string \| null`, `previous: string \| null`, `results: T[]` | Standard DRF pagination envelope |
