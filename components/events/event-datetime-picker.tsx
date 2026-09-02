"use client"

import * as React from "react"
import { Clock } from "lucide-react"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  parseDateTimeLocal,
  setDatePart,
  setTimePart,
  toDateTimeLocal,
} from "@/lib/event-draft"
import { cn } from "@/lib/utils"

/** 30-minute slots for the dropdown list. */
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2)
  const minutes = (i % 2) * 30
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
  return { value, label: formatClock(hours, minutes), hours, minutes }
})

function formatClock(hours: number, minutes: number) {
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
    .toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })
    .replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase())
}

function partsFromValue(value: string, fallbackHours = 9, fallbackMinutes = 0) {
  const date = parseDateTimeLocal(value)
  if (!date) return { hours: fallbackHours, minutes: fallbackMinutes }
  return { hours: date.getHours(), minutes: date.getMinutes() }
}

function timeKey(hours: number, minutes: number) {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function formatTimeLabel(value: string) {
  const { hours, minutes } = partsFromValue(value)
  return formatClock(hours, minutes)
}

/** Parse typed times like "4:05 pm", "16:00", "4pm", "4:30". */
function parseTimeInput(text: string): { hours: number; minutes: number } | null {
  const cleaned = text.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ")
  if (!cleaned) return null

  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/)
  if (!match) return null

  let hours = Number(match[1])
  const minutes = match[2] != null ? Number(match[2]) : 0
  const meridiem = match[3]

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes > 59) return null

  if (meridiem) {
    if (hours < 1 || hours > 12) return null
    if (meridiem === "pm" && hours < 12) hours += 12
    if (meridiem === "am" && hours === 12) hours = 0
  } else if (hours > 23) {
    return null
  }

  return { hours, minutes }
}

function formatDateChip(value: string) {
  const date = parseDateTimeLocal(value)
  if (!date) return "Pick date"
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

function ensureDefaultStart(): string {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return toDateTimeLocal(d)
}

function DateChip({
  value,
  onChange,
  placeholder = "Pick date",
}: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = React.useState(false)
  const selected = parseDateTimeLocal(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex h-9 min-w-[7.5rem] items-center justify-center rounded-lg bg-background/90 px-3 text-sm font-medium shadow-xs transition-colors hover:bg-background",
          !value && "text-muted-foreground"
        )}
      >
        {value ? formatDateChip(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (!date) return
            onChange(setDatePart(value || ensureDefaultStart(), date))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function TimeSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [text, setText] = React.useState(() => formatTimeLabel(value))
  const rootRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const textRef = React.useRef(text)
  const skipCommitRef = React.useRef(false)
  const { hours, minutes } = partsFromValue(value)
  const selected = timeKey(hours, minutes)

  textRef.current = text

  React.useEffect(() => {
    setText(formatTimeLabel(value))
  }, [value])

  React.useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      const el = listRef.current?.querySelector<HTMLElement>(`[data-time="${selected}"]`)
      el?.scrollIntoView({ block: "center" })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, selected])

  const commitText = React.useCallback(() => {
    const parsed = parseTimeInput(textRef.current)
    if (!parsed) {
      setText(formatTimeLabel(value))
      return false
    }
    const next = setTimePart(value || ensureDefaultStart(), parsed.hours, parsed.minutes)
    const current = parseDateTimeLocal(value)
    const same =
      current &&
      current.getHours() === parsed.hours &&
      current.getMinutes() === parsed.minutes
    if (!same) onChange(next)
    setText(formatClock(parsed.hours, parsed.minutes))
    return true
  }, [onChange, value])

  const closeAndCommit = React.useCallback(() => {
    if (skipCommitRef.current) {
      skipCommitRef.current = false
      setOpen(false)
      return
    }
    commitText()
    setOpen(false)
  }, [commitText])

  React.useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeAndCommit()
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open, closeAndCommit])

  const pickTime = (t: (typeof TIME_OPTIONS)[number]) => {
    const next = setTimePart(value || ensureDefaultStart(), t.hours, t.minutes)
    textRef.current = t.label
    setText(t.label)
    onChange(next)
    skipCommitRef.current = true
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cn(
          "inline-flex h-9 w-[9.5rem] items-center gap-1 rounded-lg bg-background/90 pl-2 pr-1 shadow-xs",
          open && "ring-2 ring-ring/40"
        )}
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              closeAndCommit()
              inputRef.current?.blur()
            }
            if (event.key === "Escape") {
              event.preventDefault()
              setText(formatTimeLabel(value))
              setOpen(false)
              inputRef.current?.blur()
            }
          }}
          onBlur={(event) => {
            const next = event.relatedTarget as Node | null
            if (rootRef.current?.contains(next)) return
            window.setTimeout(() => {
              if (!rootRef.current?.contains(document.activeElement)) {
                closeAndCommit()
              }
            }, 0)
          }}
          aria-label="Time"
          aria-expanded={open}
          aria-haspopup="listbox"
          className="min-w-0 flex-1 bg-transparent text-center text-sm font-medium tracking-wide outline-none"
        />
        <button
          type="button"
          tabIndex={-1}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          aria-label="Open time list"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setOpen((prev) => !prev)
            inputRef.current?.focus()
          }}
        >
          <Clock className="size-3.5" />
        </button>
      </div>

      {open ? (
        <div
          role="listbox"
          className="absolute top-[calc(100%+6px)] right-0 z-50 w-36 overflow-hidden rounded-md bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          <div ref={listRef} className="max-h-56 overflow-y-auto">
            {TIME_OPTIONS.map((t) => {
              const isActive = t.value === selected
              return (
                <button
                  key={t.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  data-time={t.value}
                  tabIndex={-1}
                  className={cn(
                    "flex w-full items-center justify-center rounded-md px-2 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-foreground hover:bg-muted/60"
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pickTime(t)}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ScheduleRow({
  label,
  value,
  onChange,
  rail,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  rail: "start" | "end"
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex w-4 shrink-0 justify-center self-stretch">
        {rail === "start" ? (
          <span className="absolute top-1/2 bottom-0 left-1/2 w-px -translate-x-1/2 border-l border-dashed border-border" />
        ) : (
          <span className="absolute top-0 bottom-1/2 left-1/2 w-px -translate-x-1/2 border-l border-dashed border-border" />
        )}
        <span className="relative z-10 mt-[0.7rem] size-2.5 rounded-full border-2 border-muted-foreground/50 bg-background" />
      </div>
      <div className="w-12 shrink-0 text-sm text-muted-foreground">{label}</div>
      <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
        <DateChip value={value} onChange={onChange} />
        <TimeSelect value={value} onChange={onChange} />
      </div>
    </div>
  )
}

export function EventDateTimePicker({
  startsAt,
  endsAt,
  onStartsAtChange,
  onEndsAtChange,
  className,
}: {
  startsAt: string
  endsAt: string
  onStartsAtChange: (value: string) => void
  onEndsAtChange: (value: string) => void
  className?: string
}) {
  React.useEffect(() => {
    if (!startsAt) onStartsAtChange(ensureDefaultStart())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-muted/30 p-4",
        className
      )}
    >
      <div className="flex flex-col gap-3">
        <ScheduleRow
          rail="start"
          label="Start"
          value={startsAt}
          onChange={(next) => {
            onStartsAtChange(next)
            if (endsAt) {
              const end = parseDateTimeLocal(endsAt)
              const start = parseDateTimeLocal(next)
              if (end && start && end < start) onEndsAtChange(next)
            }
          }}
        />
        <ScheduleRow
          rail="end"
          label="End"
          value={endsAt || startsAt}
          onChange={(next) => onEndsAtChange(next)}
        />
      </div>
    </div>
  )
}
