import { formatEventDateTimeLocal } from "@/lib/communications-labels"
import type { SchoolEvent } from "@/lib/types"

export type EventLocationKind = "in_person" | "virtual"

export type EventDraft = {
  title: string
  description: string
  audience: "internal" | "external"
  registration_mode: "instant_waitlist" | "approval_required"
  starts_at: string
  ends_at: string
  location_kind: EventLocationKind
  location: string
  capacity: string
  tag_names: string
}

export const emptyEventDraft: EventDraft = {
  title: "",
  description: "",
  audience: "internal",
  registration_mode: "instant_waitlist",
  starts_at: "",
  ends_at: "",
  location_kind: "in_person",
  location: "",
  capacity: "",
  tag_names: "",
}

/** Fresh draft for creating an event — school-only, instant, unlimited, times set to now. */
export function createEmptyEventDraft(now = new Date()): EventDraft {
  const start = new Date(now)
  start.setSeconds(0, 0)
  const end = new Date(start)
  end.setHours(end.getHours() + 1)
  return {
    ...emptyEventDraft,
    audience: "internal",
    registration_mode: "instant_waitlist",
    capacity: "",
    starts_at: toDateTimeLocal(start),
    ends_at: toDateTimeLocal(end),
  }
}

function isVirtualLocation(location: string): boolean {
  const value = location.trim()
  return /^https?:\/\//i.test(value)
}

export function eventToDraft(event: SchoolEvent): EventDraft {
  const description = decodeMarkdownEntities(event.body.trim() || event.summary.trim())
  const location = event.location.trim()
  return {
    title: event.title,
    description,
    audience: event.audience,
    registration_mode: event.registration_mode,
    starts_at: formatEventDateTimeLocal(event.starts_at),
    ends_at: formatEventDateTimeLocal(event.ends_at),
    location_kind: isVirtualLocation(location) ? "virtual" : "in_person",
    location,
    capacity: event.capacity != null ? String(event.capacity) : "",
    tag_names: event.tags.map((tag) => tag.name).join(", "),
  }
}

export function draftToApiPayload(draft: EventDraft) {
  const description = decodeMarkdownEntities(draft.description.trim())
  const startsAt = draft.starts_at ? new Date(draft.starts_at) : new Date()
  const endsAt = draft.ends_at ? new Date(draft.ends_at) : null
  return {
    title: draft.title.trim(),
    summary: "",
    body: description,
    audience: draft.audience,
    registration_mode: draft.registration_mode,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt.toISOString() : null,
    location: draft.location.trim(),
    capacity: draft.capacity ? Number(draft.capacity) : null,
    cover_image_url: "",
    tag_names: draft.tag_names
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  }
}

export function parseDateTimeLocal(value: string): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function setDatePart(current: string, nextDate: Date): string {
  const base = parseDateTimeLocal(current) ?? new Date()
  base.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate())
  return toDateTimeLocal(base)
}

export function setTimePart(current: string, hours: number, minutes: number): string {
  const base = parseDateTimeLocal(current) ?? new Date()
  base.setHours(hours, minutes, 0, 0)
  return toDateTimeLocal(base)
}

export function decodeMarkdownEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
      const code = Number.parseInt(hex, 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : ""
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = Number.parseInt(dec, 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : ""
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

export function descriptionPreview(description: string): string {
  const text = decodeMarkdownEntities(description)
    .replace(/<\/?u>/gi, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/(`{1,3})([\s\S]*?)\1/g, "$2")
    .replace(/(\*{1,3}|_{1,3}|~~)(.*?)\1/g, "$2")
    .replace(/[#>*_`[\]()~-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  if (!text) return "Add event description"
  return text.length > 120 ? `${text.slice(0, 120)}…` : text
}
