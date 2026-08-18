"use client"

import { CalendarDays } from "lucide-react"
import type { TimetableSlot } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TimetableWeekSnippet,
  type TimetableSlotLine,
} from "@/components/timetable-week-snippet"

/** Shared hub section: weekly TimetableSlot grid, not dated sessions. */
export function HubTimetableCard({
  slots,
  description,
  editorHref,
  slotLine = "teacher",
}: {
  slots: TimetableSlot[]
  description?: string
  editorHref?: string
  slotLine?: TimetableSlotLine
}) {
  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="size-5 text-muted-foreground" />
          Weekly timetable
        </CardTitle>
        <CardDescription>
          {description ?? "Assigned weekly slots — not dated session occurrences."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TimetableWeekSnippet slots={slots} editorHref={editorHref} slotLine={slotLine} />
      </CardContent>
    </Card>
  )
}
