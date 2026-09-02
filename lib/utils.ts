import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Date/time conventions (Hinthar):
 * - API DateTime fields: ISO-8601 (preferred). Legacy `dd/mm/yy HH:MM:SS` still parsed.
 * - API Date fields / query params: `YYYY-MM-DD`
 * - Timetable / ad-hoc clock times: `HH:MM:SS` or `HH:MM`
 * - UI date inputs: `YYYY-MM-DD` (local calendar day, Asia/Yangon)
 * - UI display: use formatBackend* helpers below (locale-aware)
 */

/**
 * YYYY-MM-DD for the calendar day the given date falls on locally.
 * Avoid `toISOString().slice(0, 10)` — Yangon UTC+6:30 can shift the day.
 */
export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** Last calendar day of the month containing `date` (local). */
export function toMonthEndDateString(date: Date = new Date()): string {
  return toLocalDateString(new Date(date.getFullYear(), date.getMonth() + 1, 0))
}

/**
 * Parse API session/check-in datetimes.
 * Accepts ISO-8601 and legacy SMS `dd/mm/yy HH:MM:SS` (day/month/year).
 */
export function parseBackendDateTime(str: string): Date {
  if (!str) return new Date(NaN)
  const trimmed = str.trim()

  // ISO-8601 / YYYY-MM-DD[ T]HH:MM…
  if (trimmed.includes("T") || (trimmed.includes("-") && !trimmed.includes("/"))) {
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) return d
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length >= 2) {
    const dateParts = parts[0].split("/")
    const timeParts = parts[1].split(":")
    if (dateParts.length === 3 && timeParts.length >= 2) {
      const day = parseInt(dateParts[0], 10)
      const month = parseInt(dateParts[1], 10) - 1
      let year = parseInt(dateParts[2], 10)
      if (year < 100) year += 2000
      const hours = parseInt(timeParts[0], 10)
      const minutes = parseInt(timeParts[1], 10)
      const seconds = parseInt(timeParts[2] ?? "0", 10)
      const date = new Date(year, month, day, hours, minutes, seconds)
      if (!isNaN(date.getTime())) return date
    }
  }

  // Bare dd/mm/yy
  const onlyDate = trimmed.split("/")
  if (onlyDate.length === 3) {
    const day = parseInt(onlyDate[0], 10)
    const month = parseInt(onlyDate[1], 10) - 1
    let year = parseInt(onlyDate[2], 10)
    if (year < 100) year += 2000
    const date = new Date(year, month, day)
    if (!isNaN(date.getTime())) return date
  }

  return new Date(trimmed)
}

/**
 * Local calendar date (YYYY-MM-DD) for a date-only or datetime API value.
 */
export function toSessionDateString(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim()
  const d = parseBackendDateTime(value)
  if (isNaN(d.getTime())) return "—"
  return toLocalDateString(d)
}

/** Combine API date (`YYYY-MM-DD`) + clock (`HH:MM[:SS]`) into a local Date. */
export function parseDateAndClock(date: string, clock: string): Date {
  const datePart = date.trim()
  const timePart = clock.trim().length === 5 ? `${clock.trim()}:00` : clock.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart) && /^\d{2}:\d{2}:\d{2}$/.test(timePart)) {
    return new Date(`${datePart}T${timePart}`)
  }
  return parseBackendDateTime(`${datePart} ${timePart}`)
}

/** Force AM/PM meridiems to uppercase in locale time strings. */
export function capitalizeMeridiem(value: string): string {
  return value.replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase())
}

/** Display datetime for tables (e.g. session start/end). */
export function formatBackendDateTime(value: string): string {
  const d = parseBackendDateTime(value)
  if (isNaN(d.getTime())) return value || "—"
  return capitalizeMeridiem(
    d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  )
}

/** Display date only (e.g. chart axis, check-in day). */
export function formatBackendDate(
  value: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const d = new Date(`${value.trim()}T12:00:00`)
    if (!isNaN(d.getTime())) return d.toLocaleDateString(undefined, options)
  }
  const d = parseBackendDateTime(value)
  if (isNaN(d.getTime())) return value || "—"
  return d.toLocaleDateString(undefined, options)
}

/** Display time only from a datetime or clock string. */
export function formatBackendTime(value: string): string {
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value.trim())) {
    return formatSlotClock(value)
  }
  const d = parseBackendDateTime(value)
  if (isNaN(d.getTime())) return value || "—"
  return capitalizeMeridiem(
    d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })
  )
}

/** Event schedule line with date + times (e.g. "Wed, Sep 2, 2026 · 11:00 PM – 12:00 AM"). */
export function formatEventSchedule(startsAt: string, endsAt?: string | null): string {
  const start = parseBackendDateTime(startsAt)
  if (isNaN(start.getTime())) return "—"

  const datePart = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const startTime = formatBackendTime(startsAt)
  if (!endsAt) return `${datePart} · ${startTime}`

  const end = parseBackendDateTime(endsAt)
  if (isNaN(end.getTime())) return `${datePart} · ${startTime}`

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()

  const endTime = formatBackendTime(endsAt)
  if (sameDay) return `${datePart} · ${startTime} – ${endTime}`

  const endDate = end.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  return `${datePart} · ${startTime} – ${endDate} · ${endTime}`
}

/** Compact relative time for activity feeds (e.g. "3h ago"). */
export function formatRelativeTime(value: string, now = new Date()): string {
  const d = parseBackendDateTime(value)
  if (isNaN(d.getTime())) return "—"
  const sec = Math.round((now.getTime() - d.getTime()) / 1000)
  if (sec < 45) return "just now"
  if (sec < 90) return "1m ago"
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`
  if (sec < 5400) return "1h ago"
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`
  if (sec < 172800) return "1d ago"
  if (sec < 604800) return `${Math.round(sec / 86400)}d ago`
  return formatBackendDateTime(value)
}

/** Normalize timetable / ad-hoc clock to `HH:MM`. */
export function formatSlotClock(value: string): string {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!m) return value || "—"
  return `${m[1].padStart(2, "0")}:${m[2]}`
}
