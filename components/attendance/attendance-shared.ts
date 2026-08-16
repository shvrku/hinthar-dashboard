import type { AttendanceMatrixSession, SessionAttendanceStatus } from "@/lib/types"
import { parseBackendDateTime, parseDateAndClock } from "@/lib/utils"
import { attendanceSurface } from "@/lib/status-styles"

export const ATTENDANCE_MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const

export const ATTENDANCE_STATUS_ITEMS: { value: SessionAttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "excused", label: "Excused" },
]

export type AttendanceKpiStats = {
  totalStudents: number
  totalSessions: number
  presentCount: number
  lateCount: number
  absentCount: number
  excusedCount: number
  attendanceRate: number
}

export type AttendanceStatusRecord = {
  status?: SessionAttendanceStatus | string | null
}

export function getSessionStartTime(session: AttendanceMatrixSession): Date {
  if (session.date) {
    return parseDateAndClock(session.date, session.start_time)
  }
  return parseBackendDateTime(session.start_time)
}

export function formatSessionMeta(session: AttendanceMatrixSession) {
  const d = getSessionStartTime(session)
  const valid = !isNaN(d.getTime())
  return {
    subject: session.subject?.trim() || "—",
    teacher: session.teacher_name?.trim() || "—",
    dateStr: valid
      ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" })
      : "—",
    timeStr: valid
      ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })
      : "—",
  }
}

export function getAttendanceSelectStyles(status?: string): string {
  switch (status) {
    case "present":
      return `${attendanceSurface.present} focus:ring-attendance-present/50 font-semibold`
    case "late":
      return `${attendanceSurface.late} focus:ring-attendance-late/40 font-medium`
    case "absent":
      return `${attendanceSurface.absent} focus:ring-attendance-absent/40 font-semibold`
    case "excused":
      return `${attendanceSurface.excused} focus:ring-attendance-excused/40 font-medium`
    default:
      return "bg-muted text-muted-foreground border-border/80 focus:ring-ring font-medium"
  }
}

export function rosterSessionSelectItems(sessions: AttendanceMatrixSession[]) {
  return sessions.map((session) => {
    const { subject, teacher, dateStr, timeStr } = formatSessionMeta(session)
    return {
      value: session.id.toString(),
      label: `${subject} · ${teacher} · ${dateStr} (${timeStr})`,
    }
  })
}

export function yearSelectItems(currentYear: number) {
  return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((y) => ({
    value: y.toString(),
    label: y.toString(),
  }))
}

export function monthSelectItems() {
  return ATTENDANCE_MONTHS.map((m) => ({ value: m.value.toString(), label: m.label }))
}
