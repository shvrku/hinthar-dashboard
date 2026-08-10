import type { PageSkeletonBlock } from "@/components/skeleton/page-skeleton"

/** Student `/students/[id]` loading layout. */
export const STUDENT_DETAIL_PAGE_LAYOUT: PageSkeletonBlock[] = [
  { type: "back-link" },
  { type: "profile-hero", badges: 3, fields: 4, action: true },
  {
    type: "grid",
    className: "lg:grid-cols-3",
    blocks: [
      {
        type: "card",
        className: "lg:col-span-2",
        header: { description: true },
        body: [
          { type: "list-rows", rows: 3 },
          { type: "enroll-row" },
        ],
      },
      {
        type: "card",
        header: { description: true },
        body: { type: "media-panel" },
      },
    ],
  },
  {
    type: "card",
    header: { tabs: true, description: true },
    body: { type: "attendance-overview" },
  },
]

/** Class `/classes/[id]` loading layout. */
export const CLASS_DETAIL_PAGE_LAYOUT: PageSkeletonBlock[] = [
  { type: "profile-hero", badges: 1, fields: 2, action: true, titleClassName: "w-48" },
  {
    type: "stack",
    blocks: [
      {
        type: "card",
        header: { description: true },
        body: { type: "timetable-week" },
      },
      {
        type: "card",
        header: { titleBadge: true, description: true },
        body: [
          { type: "list-rows", rows: 3 },
          { type: "enroll-row" },
        ],
      },
    ],
  },
  {
    type: "card",
    header: { tabs: true, description: true },
    body: { type: "attendance-overview" },
  },
  { type: "button" },
]

/** Teacher `/teachers/[id]` loading layout. */
export const TEACHER_DETAIL_PAGE_LAYOUT: PageSkeletonBlock[] = [
  { type: "profile-hero", badges: 2, fields: 3, action: true },
  {
    type: "card",
    header: { tabs: true, description: true },
    body: [
      { type: "stat-grid", count: 4, cols: 4 },
      { type: "text-line", className: "w-80" },
      { type: "charts-row", count: 2 },
    ],
    bodyClassName: "space-y-6",
  },
  {
    type: "card",
    header: { description: true },
    body: { type: "stat-chart-row", statCount: 6, statCols: 3 },
  },
  {
    type: "card",
    header: { action: true, description: true },
    body: { type: "list-rows", rows: 3, variant: "session" },
  },
]
