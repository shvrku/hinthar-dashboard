"use client"

import * as React from "react"
import { MapPin, Video } from "lucide-react"

import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { EventLocationKind } from "@/lib/event-draft"
import { cn } from "@/lib/utils"

export function EventLocationField({
  kind,
  location,
  onKindChange,
  onLocationChange,
  className,
}: {
  kind: EventLocationKind
  location: string
  onKindChange: (kind: EventLocationKind) => void
  onLocationChange: (location: string) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-muted/30 px-4 py-3",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <MapPin className="mt-2.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium">Add Event Location</div>
              <div className="text-xs text-muted-foreground">
                {kind === "virtual" ? "Meeting link" : "Offline location or place"}
              </div>
            </div>
            <ToggleGroup
              variant="outline"
              size="sm"
              spacing={0}
              value={[kind]}
              onValueChange={(next) => {
                const selected = next[0] as EventLocationKind | undefined
                if (selected) onKindChange(selected)
              }}
            >
              <ToggleGroupItem value="in_person" aria-label="In person">
                In person
              </ToggleGroupItem>
              <ToggleGroupItem value="virtual" aria-label="Virtual">
                <Video className="mr-1 size-3.5" />
                Virtual
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Input
            id="event-location-input"
            value={location}
            onChange={(event) => onLocationChange(event.target.value)}
            placeholder={
              kind === "virtual"
                ? "https://meet.google.com/..."
                : "School auditorium, Room 204…"
            }
            className="h-10 rounded-xl border-transparent bg-background/80 shadow-xs"
          />
        </div>
      </div>
    </div>
  )
}
