# Hinthar Dashboard: Design System & UI Architecture Specification

This document provides a comprehensive design system and UI/UX specification for redefining the **Hinthar School Management Dashboard**. It standardizes layout structures around the **shadcn/ui `sidebar-08` (Inset Variant)** pattern, establishes dual Vercel Dark and Modern Clean Light color palettes, and outlines standard component layouts across all management views.

---

## 1. Executive Design Principles

1. **Inset Workspace Architecture (`sidebar-08`)**: Shift from top-bar dropdowns ("Management", "Check In") to a structured inset sidebar with a workspace switcher, collapsible nav groups, and persistent user controls.
2. **Standardized Component Layouts**: Eliminate bespoke layout variations across pages. Every management screen (Classes, Teachers, Students, Subjects, Sessions) follows a uniform layout template: **Header + KPI Bar + Search/Filter Toolbar + Data Table + Slide-over Sheet Details**.
3. **Dual Color System (Vercel Obsidian & Minimalist Clean Light)**:
   - **Dark Mode**: High-contrast, pitch-to-obsidian dark palette with crisp borders, subtle glassmorphism, and functional status accents.
   - **Light Mode**: High-legibility minimal off-white layout with pure white surface cards, soft zinc borders, and deep slate typography.
4. **Context-Driven Micro-Interactions**: Keyboard shortcuts (`Cmd + K` search, `Cmd + B` sidebar toggle), inline status editing, and dedicated drawer views for scanning and token management.

---

## 2. Color Scheme Specification & CSS Variables

### 2.1 CSS Variables Architecture (`globals.css`)

```css
@layer base {
  /* ==========================================================================
     LIGHT MODE — Minimalist Clean Slate Palette
     ========================================================================== */
  :root {
    /* Base Surfaces */
    --background: 210 20% 98%;          /* #f8fafc - Very light neutral blue-grey */
    --foreground: 222.2 84% 4.9%;       /* #020817 - Deep midnight text */
    
    /* Card & Surfaces */
    --card: 0 0% 100%;                  /* #ffffff - Pure white cards */
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    /* Brand & Actions */
    --primary: 221.2 83.2% 53.3%;       /* #2563eb - Cobalt blue accent */
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;         /* #f1f5f9 - Muted grey control fill */
    --secondary-foreground: 222.2 47.4% 11.2%;

    /* Muted Text & Backgrounds */
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%; /* #64748b - Slate secondary text */

    /* Accent & Selection */
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;

    /* Functional Indicators */
    --destructive: 0 84.2% 60.2%;       /* Crimson red */
    --destructive-foreground: 210 40% 98%;
    --success: 142.1 76.2% 36.3%;       /* Emerald green */
    --warning: 37.7 92.1% 50.2%;        /* Amber warning */

    /* Borders & Inputs */
    --border: 214.3 31.8% 91.4%;        /* #e2e8f0 - Crisp subtle line */
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;

    /* Sidebar Inset Theme Variables (Light) */
    --sidebar-background: 0 0% 100%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 240 5.9% 90%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }

  /* ==========================================================================
     DARK MODE — Vercel Industrial Obsidian Palette
     ========================================================================== */
  .dark {
    /* Base Surfaces */
    --background: 240 10% 3.9%;         /* #09090b - Deep Vercel Black */
    --foreground: 0 0% 98%;             /* #fafafa - Crisp off-white text */

    /* Card & Surfaces */
    --card: 240 10% 5.9%;               /* #0f0f12 - Slightly raised surface */
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 5.9%;
    --popover-foreground: 0 0% 98%;

    /* Brand & Actions */
    --primary: 0 0% 98%;                /* Pure white primary button/text */
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;        /* Dark muted control button */
    --secondary-foreground: 0 0% 98%;

    /* Muted Text & Backgrounds */
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;   /* #a1a1aa - Zinc secondary text */

    /* Accent & Selection */
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;

    /* Functional Status Tokens */
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --success: 142.1 70.6% 45.3%;
    --warning: 38 92% 50%;

    /* Borders & Inputs */
    --border: 240 3.7% 15.9%;           /* #27272a - Zinc dark border */
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;

    /* Sidebar Inset Theme Variables (Dark Vercel Style) */
    --sidebar-background: 240 10% 3.9%;  /* Matches root background for inset look */
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 224.3 76.3% 48%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }
}
```

---

## 3. `sidebar-08` (Inset Variant) Component Architecture

The `sidebar-08` component pattern features an **Inset Frame** (`SidebarInset`), where the sidebar acts as a clean outer container and the main application panel floats inside with rounded corners (`rounded-xl`) and distinct border separation.

### 3.1 Structural Tree Breakdown

```text
<SidebarProvider defaultOpen={true}>
  ├── <AppSidebar variant="inset" collapsible="icon">
  │     ├── <SidebarHeader>
  │     │     └── <WorkspaceSwitcher />  ── [Hinthar Academy / Campus Dropdown]
  │     ├── <SidebarContent>
  │     │     ├── <SidebarGroup label="Overview">
  │     │     │     └── <SidebarMenu> [Dashboard, Analytics]
  │     │     ├── <SidebarGroup label="Management">
  │     │     │     └── <SidebarMenu> [Classes, Teachers, Students, Subjects]
  │     │     ├── <SidebarGroup label="Operations">
  │     │     │     └── <SidebarMenu> [Sessions, Timetables, Session Attendance, Check-In]
  │     └── <SidebarFooter>
  │           └── <NavUser />  ── [User Profile, Theme Toggle, Logout]
  │
  └── <SidebarInset>  ── [Main Floating Canvas]
        ├── <SiteHeader>
        │     ├── <SidebarTrigger />  ── [Toggle Button (Cmd + B)]
        │     ├── <Separator orientation="vertical" />
        │     ├── <Breadcrumbs />  ── [Management / Classes / Year 6 - A]
        │     ├── <CommandSearch />  ── [Quick Search Input (Cmd + K)]
        │     └── <HeaderActions>  ── [Focus Mode, Notifications, Live Time]
        └── <main className="p-6">
              └── {PageContent}
```

---

## 4. Standardized Layout Visualizations & Wireframes

Below are textual diagrams illustrating how the UI components render across different operational views.

### 4.1 Overall Workspace Wireframe (`sidebar-08` Inset Layout)

```text
+---------------------------------------------------------------------------------------------------+
|  [H] Hinthar Academy  v |  (Cmd+B)  Management / Classes                      [Search Cmd+K] (*)  |
+-------------------------+-------------------------------------------------------------------------+
| [GROUP: OVERVIEW]       |  Classes Roster                                + Add Class  [Reload]    |
|  * Dashboard            |  Manage academic cohorts, schedules, and student assignments.           |
|  * Analytics            | +---------------------------------------------------------------------+ |
|                         | | Total Classes: 18  | Active Students: 94  | Completed Sessions: 1,023 | |
| [GROUP: MANAGEMENT]     | +---------------------------------------------------------------------+ |
|  # Classes        (18)  |                                                                         |
|  # Teachers       (31)  | [Search classes...]       [Filter: All Levels v] [Columns v] [Export]    |
|  # Students       (94)  | +----+-----------------+------------------+--------------+------------+ |
|  # Subjects       (22)  | | ID | EDUCATION LEVEL | COHORT IDENTIFIER| SUB CATEGORY | ACTIONS    | |
|                         | +----+-----------------+------------------+--------------+------------+ |
| [GROUP: OPERATIONS]     | | 01 | Year 6          | Cohort A         | --           | [Eye][Edit]| |
|  $ Sessions     (1023)  | | 02 | Year 6          | Cohort B         | --           | [Eye][Edit]| |
|  $ Timetables           | | 03 | Year 7          | Cohort C         | Science Pick | [Eye][Edit]| |
|  $ Check-In Terminal    | | 04 | Year 7          | Cohort D         | Language Pick| [Eye][Edit]| |
|  $ Attendance Matrix    | +----+-----------------+------------------+--------------+------------+ |
|                         | | Showing 1-4 of 18 items                     [< Prev] [1] 2 3 [Next >] |
| [Footer Profile]        | +---------------------------------------------------------------------+ |
|  (User) Alex Admin (v)  |                                                                         |
+-------------------------+-------------------------------------------------------------------------+
```

---

### 4.2 Standardized Data Table Layout (Used across all Management Pages)

To achieve strict visual consistency, **Classes, Teachers, Students, Subjects, and Sessions** will all share the exact same UI wrapper component (`<StandardPageContainer />`).

```text
+---------------------------------------------------------------------------------------------------+
| PAGE TITLE HEADER                                                                                 |
| Title: [Page Name]                                                 [ Secondary Action ] [ Primary ] |
| Subtitle: Contextual explanation of data scope.                                                   |
+---------------------------------------------------------------------------------------------------+
| METRIC HIGHLIGHT STRIP (3-4 KPI Cards)                                                            |
| +-------------------+ +-------------------+ +-------------------+ +-------------------+       |
| | Total Count       | | Active Rate       | | Weekly Change     | | Quick Alert       |       |
| | 94                | | 96.2%             | | +12% vs last m    | | 2 Pending      |       |
| +-------------------+ +-------------------+ +-------------------+ +-------------------+       |
+---------------------------------------------------------------------------------------------------+
| CONTROL TOOLBAR                                                                                   |
| [ Search input...                     ]  [ Dropdown Filter ]  [ Dropdown Status ]  [ View Mode ]  |
+---------------------------------------------------------------------------------------------------+
| UNIFIED DATA TABLE                                                                                |
| [x] | ID  | PRIMARY LABEL     | CATEGORY BADGE   | METRIC STATUS   | LAST ACTIVE   | ACTIONS   |
|-----+-----+-------------------+------------------+-----------------+---------------+-----------|
| [ ] | #01 | Zhongli           | Full-Time        | $30.00 / hr     | 10:22:39 PM   | [..]      |
| [ ] | #02 | Yae Miko          | Tutor            | $35.00 / hr     | 09:15:10 PM   | [..]      |
| [ ] | #03 | Albedo            | Full-Time        | $28.00 / hr     | 08:00:12 PM   | [..]      |
+---------------------------------------------------------------------------------------------------+
| PAGINATION FOOTER                                                                                 |
| 3 of 31 rows selected.                            Page 1 of 4      [Rows per page: 10 v] [<] [>]  |
+---------------------------------------------------------------------------------------------------+
```

---

### 4.3 Redefined Check-In & QR Scanner Interface (Split Terminal View)

Instead of a plain, disconnected scanner, the Check-in terminal utilizes a high-efficiency **Split-Screen Workspace** or a **Slide-Over Sheet Details Panel**.

```text
+---------------------------------------------------------------------------------------------------+
| Check-In Terminal & QR Scanner                                            [Focus Fullscreen Switch] |
+---------------------------------------------------+-----------------------------------------------+
| LIVE CAMERA SCANNER ENGINE                        | MANUAL LOOKUP & REAL-TIME CONFIRMATION        |
| Time: 22:24:38 | Wednesday, July 22, 2026         |                                               |
| +-----------------------------------------------+ | Search Student ID or Name:                    |
| |                                               | | [ Type ID e.g., 101                 ] [Search] |
| |              +-----------------+              | |                                               |
| |              |  SCAN TARGET    |              | | +-------------------------------------------+ |
| |              |  AUTOMATIC      |              | | | LATEST SCANNER CONFIRMATION               | |
| |              |  DETECTOR       |              | | |                                           | |
| |              +-----------------+              | | | Student: Charlotte (#5)                   | |
| |                                               | | | Class: Year 6 - Cohort A                  | |
| | Point student QR code at camera to log entry. | | | Time: 10:24:54 PM                         | |
| +-----------------------------------------------+ | | Status: [ VERIFIED & LOGGED SUCCESS ]     | |
|                                                   | +-------------------------------------------+ |
| [ Camera Device: Integrated WebCam (v) ]          |                                               |
| [ Audio Beep: ON ]  [ Auto Reset: 2 sec ]         | Recent Attendance Stream:                     |
|                                                   | * 10:24:54 PM - Charlotte (#5) - Year 6-A     |
|                                                   | * 10:22:12 PM - Yuanwu (#1) - Year 6-A        |
|                                                   | * 10:19:05 PM - Tribble (#2) - Year 6-B       |
+---------------------------------------------------+-----------------------------------------------+
```

---

### 4.4 Slide-Over Student QR Inspector (Sheet Component)

When clicking **"View QR"** on any student row, a `shadcn/ui` Sheet opens from the right edge without displacing the active data table page state.

```text
+--------------------------------------------------------------------------------+---------------+
| Main Table Page Content (Dimmed / Blurred in background)                       | STUDENT SHEET |
|                                                                                | Charlotte     |
|                                                                                | ID: #5        |
|                                                                                |---------------+
|                                                                                |  +----------+ |
|                                                                                |  |  QR CODE | |
|                                                                                |  |  VECTOR  | |
|                                                                                |  |  CANVAS  | |
|                                                                                |  +----------+ |
|                                                                                |               |
|                                                                                | Check-in Token|
|                                                                                | [ QGdHu12... ]|
|                                                                                |               |
|                                                                                | [Regenerate]  |
|                                                                                | [Download QR] |
+--------------------------------------------------------------------------------+---------------+
```

---

## 5. Component Standardization & Code Templates

### 5.1 Reusable `StandardPageHeader` Template (`components/standard-page-header.tsx`)

```tsx
import React from "react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function StandardPageHeader({
  title,
  description,
  primaryAction,
  secondaryAction,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 pb-4 md:flex-row md:items-center md:justify-between border-b border-border mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2 mt-4 md:mt-0">
        {secondaryAction && (
          <Button variant="outline" size="sm" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
        {primaryAction && (
          <Button size="sm" onClick={primaryAction.onClick} className="gap-1.5">
            {primaryAction.icon}
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
```

---

### 5.2 Unified App Layout Component (`app/layout.tsx`)

```tsx
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden transition-all duration-200">
          <SiteHeader />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
```

---

## 6. Implementation Checklist

- [ ] **Install Shadcn Sidebar**: Run `npx shadcn@latest add sidebar table dropdown-menu sheet avatar badge`.
- [ ] **Configure CSS Variables**: Update `globals.css` with the Vercel obsidian dark mode and clean light mode variables provided in Section 2.
- [ ] **Build `AppSidebar` Component**: Implement `sidebar-08` structure with `WorkspaceSwitcher`, collapsible nav items, and user profile footer.
- [ ] **Wrap Management Pages in `StandardPageHeader`**: Refactor Classes, Teachers, Students, Subjects, and Sessions to share uniform headers and metric cards.
- [ ] **Convert Floating Modals to Sheets**: Convert QR code popup views into slide-over `<Sheet />` components for seamless multi-tasking.
- [ ] **Implement Keyboard Shortcuts**: Hook up `Cmd + B` for sidebar toggle and `Cmd + K` for command search navigation.
