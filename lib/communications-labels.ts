import type { EventAudience, EventRegistrationMode, EventRegistrationStatus, EventStatus } from "@/lib/types"
import { capitalizeMeridiem } from "@/lib/utils"

export type CommTagScope = "announcement" | "event"

export const EVENT_AUDIENCE_LABELS: Record<EventAudience, string> = {
  internal: "School only",
  external: "Public",
}

export const EVENT_REGISTRATION_MODE_LABELS: Record<EventRegistrationMode, string> = {
  instant_waitlist: "Instant sign-up + waitlist",
  approval_required: "Staff approval required",
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  published: "Published",
  closed: "Closed",
  cancelled: "Cancelled",
}

export const EVENT_REGISTRATION_STATUS_LABELS: Record<EventRegistrationStatus, string> = {
  confirmed: "Confirmed",
  waitlisted: "Waitlisted",
  pending: "Pending approval",
  cancelled: "Cancelled",
}

export function formatEventDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function summarizeEventSchedule(startsAt: string, endsAt: string): string {
  if (!startsAt) return "Set date & time"
  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime())) return "Set date & time"
  const datePart = start.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  const timePart = capitalizeMeridiem(
    start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  )
  if (!endsAt) return `${datePart} · ${timePart}`
  const end = new Date(endsAt)
  if (Number.isNaN(end.getTime())) return `${datePart} · ${timePart}`
  const endTime = capitalizeMeridiem(
    end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  )
  return `${datePart} · ${timePart} – ${endTime}`
}
