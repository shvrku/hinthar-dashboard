"use client"

import Link from "next/link"
import type { TimetableSlot } from "@/lib/types"
import { cn, formatSlotClock } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

type TimetableWeekSnippetProps = {
  slots: TimetableSlot[]
  classId: number
  className?: string
}

/** Compact read-only week grid for class hub (links out to full editor). */
export function TimetableWeekSnippet({ slots, classId, className }: TimetableWeekSnippetProps) {
  const byDay = DAYS.map((_, day) =>
    slots
      .filter((slot) => slot.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  )
  const hasSlots = slots.length > 0

  return (
    <div className={cn("space-y-3", className)}>
      {!hasSlots ? (
        <p className="text-sm text-muted-foreground">No timetable slots yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/80">
          <div className="grid min-w-[640px] grid-cols-7 divide-x divide-border/60">
            {DAYS.map((day, index) => (
              <div key={day} className="min-h-40 bg-card">
                <div className="border-b border-border/60 bg-muted/40 px-2 py-1.5 text-center text-[11px] font-semibold text-muted-foreground">
                  {day}
                </div>
                <div className="space-y-1.5 p-1.5">
                  {byDay[index].length === 0 ? (
                    <p className="px-1 py-3 text-center text-[10px] text-muted-foreground/70">—</p>
                  ) : (
                    byDay[index].map((slot) => (
                      <div
                        key={slot.id}
                        className="rounded-md border border-primary/20 bg-primary/10 px-1.5 py-1"
                      >
                        <p className="truncate text-[11px] font-semibold leading-tight text-foreground">
                          {slot.subject.name}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {formatSlotClock(slot.start_time)}–{formatSlotClock(slot.end_time)}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">{slot.teacher.name}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <Link
        href={`/timetable/${classId}/`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
      >
        Open full timetable
      </Link>
    </div>
  )
}
