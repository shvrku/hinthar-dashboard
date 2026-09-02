import type {
  EventAudience,
  EventRegistrationMode,
  EventRegistrationStatus,
  EventStatus,
  SchoolEvent,
} from "@/lib/types"
import { capitalizeMeridiem, parseBackendDateTime } from "@/lib/utils"

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

/** True when new registrations are still accepted for this event. */
export function isEventRegistrationOpen(event: Pick<
  SchoolEvent,
  "status" | "starts_at" | "ends_at" | "registration_opens_at" | "registration_closes_at"
>, now = new Date()): boolean {
  if (event.status !== "published") return false

  if (event.registration_opens_at) {
    const opens = parseBackendDateTime(event.registration_opens_at)
    if (!Number.isNaN(opens.getTime()) && now < opens) return false
  }

  if (event.registration_closes_at) {
    const closes = parseBackendDateTime(event.registration_closes_at)
    if (!Number.isNaN(closes.getTime()) && now > closes) return false
  }

  const cutoffIso = event.ends_at || event.starts_at
  const cutoff = parseBackendDateTime(cutoffIso)
  if (!Number.isNaN(cutoff.getTime()) && now >= cutoff) return false

  return true
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
