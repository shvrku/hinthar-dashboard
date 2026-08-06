/**
 * Semantic status classes — always use design tokens from `app/globals.css`.
 * Prefer these over ad-hoc Tailwind palette colors (emerald/amber/rose).
 */

export const feedbackBanner = {
  success:
    "rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success",
  warning:
    "rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning",
  destructive:
    "rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive",
} as const

export const feedbackIcon = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
} as const

/** Soft chip / badge surfaces for lesson attendance statuses. */
export const attendanceSurface = {
  present: "bg-attendance-present/15 text-attendance-present border-attendance-present/30",
  late: "bg-attendance-late/15 text-attendance-late border-attendance-late/30",
  absent: "bg-attendance-absent/15 text-attendance-absent border-attendance-absent/30",
  excused: "bg-attendance-excused/15 text-attendance-excused border-attendance-excused/30",
} as const

/** Solid selected toggle for roster mark buttons. */
export const attendanceSolid = {
  present: "bg-attendance-present text-white border-attendance-present shadow-xs",
  late: "bg-attendance-late text-white border-attendance-late shadow-xs",
  absent: "bg-attendance-absent text-white border-attendance-absent shadow-xs",
  excused: "bg-attendance-excused text-white border-attendance-excused shadow-xs",
} as const

export const attendanceHover = {
  present: "hover:text-attendance-present hover:bg-attendance-present/10",
  late: "hover:text-attendance-late hover:bg-attendance-late/10",
  absent: "hover:text-attendance-absent hover:bg-attendance-absent/10",
  excused: "hover:text-attendance-excused hover:bg-attendance-excused/10",
} as const

export const attendanceRowTint = {
  present: "bg-attendance-present/5 border-attendance-present/30",
  late: "bg-attendance-late/5 border-attendance-late/30",
  absent: "bg-attendance-absent/5 border-attendance-absent/30",
  excused: "bg-attendance-excused/5 border-attendance-excused/30",
} as const

export const attendanceText = {
  present: "text-attendance-present",
  late: "text-attendance-late",
  absent: "text-attendance-absent",
  excused: "text-attendance-excused",
} as const
