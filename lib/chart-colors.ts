/** Semantic attendance colors — distinct hues for charts and legends. */
export const ATTENDANCE_STATUS_COLORS = {
  present: "var(--attendance-present)",
  late: "var(--attendance-late)",
  absent: "var(--attendance-absent)",
  excused: "var(--attendance-excused)",
} as const

export const CAMPUS_CHECKIN_COLOR = "var(--attendance-campus)"

export type AttendanceStatusKey = keyof typeof ATTENDANCE_STATUS_COLORS
