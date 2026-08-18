import { SESSION_STATUSES, type Session, type SessionStatus, type TimetableSlot, type AdHocSession } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { toLocalDateString, toSessionDateString, parseBackendDateTime } from "@/lib/utils"

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

export function formatSlotOption(s: TimetableSlot) {
  const day = DAY_SHORT[s.day_of_week] ?? String(s.day_of_week)
  const start = s.start_time.slice(0, 5)
  const end = s.end_time.slice(0, 5)
  const subject = s.subject?.name?.trim() || "No subject"
  const teacher = s.teacher?.name?.trim()
  const room = s.room?.trim()
  const details = [teacher, room ? `Room ${room}` : null].filter(Boolean).join(" · ")
  return {
    value: s.id.toString(),
    label: `${day} ${start}–${end} · ${subject}`,
    subLabel: details || undefined,
  }
}

export function compareSlots(a: TimetableSlot, b: TimetableSlot) {
  if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
  return a.start_time.localeCompare(b.start_time)
}

export const TIME_SLOTS = Array.from({ length: 29 }).map((_, i) => {
  const hour = Math.floor(7 + i / 2)
  const minute = i % 2 === 0 ? "00" : "30"
  const hourStr = hour.toString().padStart(2, "0")
  const value = `${hourStr}:${minute}:00`
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  const label = `${displayHour}:${minute} ${ampm}`
  return { value, label }
})

export const DURATIONS = [
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
  { value: "150", label: "2.5 hours" },
  { value: "180", label: "3 hours" },
  { value: "custom", label: "Custom End Time" },
]

/** Deep-link to class session attendance (roster for this session's date). */
export function takeRollHrefForSession(session: Session): string | null {
  if (!session.class_obj?.id || !session.start_time) return null
  const d = parseBackendDateTime(session.start_time)
  if (isNaN(d.getTime())) return null
  const qs = new URLSearchParams({
    date: toLocalDateString(d),
    layout: "roster",
    session_id: String(session.id),
  })
  return `/attendance/class/${session.class_obj.id}/?${qs.toString()}`
}

/** Deep-link to ad-hoc attendance for the session's day / id. */
export function takeRollHrefForAdHoc(session: AdHocSession): string {
  const date = session.date
    ? toSessionDateString(session.date)
    : session.start_time
      ? toSessionDateString(session.start_time)
      : toLocalDateString()
  const qs = new URLSearchParams({
    date: date === "—" ? toLocalDateString() : date,
    layout: "roster",
    session_id: String(session.id),
  })
  if (session.subject?.id) qs.set("subject_id", String(session.subject.id))
  if (session.teacher?.id) qs.set("teacher_id", String(session.teacher.id))
  return `/attendance/adhoc/?${qs.toString()}`
}

function statusLabel(value: SessionStatus | null): string {
  if (!value) return "—"
  return SESSION_STATUSES.find((s) => s.value === value)?.label ?? value
}

export function renderStatusBadge(status: SessionStatus | null) {
  if (!status) return <span className="text-muted-foreground">—</span>
  switch (status) {
    case "scheduled":
      return <Badge variant="secondary">{statusLabel(status)}</Badge>
    case "completed":
      return <Badge variant="success">{statusLabel(status)}</Badge>
    case "cancelled":
      return <Badge variant="destructive">{statusLabel(status)}</Badge>
    case "no_show":
      return <Badge variant="outline">{statusLabel(status)}</Badge>
    default:
      return <Badge variant="secondary">{statusLabel(status)}</Badge>
  }
}

