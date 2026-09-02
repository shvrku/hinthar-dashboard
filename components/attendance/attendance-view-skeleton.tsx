"use client"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Mirrors attendance matrix / roster chrome while the view chunk loads. */
export function AttendanceViewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <Card className="overflow-hidden rounded-2xl border border-border/80 bg-card p-0 shadow-xs">
        <div className="border-b border-border/80 bg-muted/30 px-4 py-3">
          <div className="flex gap-3 overflow-hidden">
            <Skeleton className="h-4 w-24 shrink-0" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-10 shrink-0" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-border/80">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-4 w-32 shrink-0" />
              <div className="flex flex-1 gap-2 overflow-hidden">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="size-7 shrink-0 rounded-md" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
