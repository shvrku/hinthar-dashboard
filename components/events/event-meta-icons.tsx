import type { ReactNode } from "react"
import { MapPin } from "lucide-react"

import { cn, parseBackendDateTime } from "@/lib/utils"

export function EventMetaIconTile({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-border/70 bg-muted/55 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  )
}

export function EventDateIcon({ startsAt }: { startsAt: string }) {
  const start = parseBackendDateTime(startsAt)
  const monthShort = Number.isNaN(start.getTime())
    ? "—"
    : start.toLocaleDateString(undefined, { month: "short" }).toUpperCase()
  const dayNum = Number.isNaN(start.getTime()) ? "—" : String(start.getDate())

  return (
    <EventMetaIconTile>
      <div className="flex h-full w-full flex-col">
        <div className="flex h-[14px] items-center justify-center border-b border-border/60 bg-muted">
          <span className="text-[9px] font-bold tracking-[0.12em] text-muted-foreground">
            {monthShort}
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center bg-muted/30">
          <span className="text-[17px] font-semibold leading-none tracking-tight text-foreground">
            {dayNum}
          </span>
        </div>
      </div>
    </EventMetaIconTile>
  )
}

export function EventLocationIcon({ className }: { className?: string }) {
  return (
    <EventMetaIconTile className={className}>
      <MapPin className="size-[18px] text-foreground/85" strokeWidth={1.75} />
    </EventMetaIconTile>
  )
}
