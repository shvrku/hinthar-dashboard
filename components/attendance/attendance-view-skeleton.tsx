"use client"

import { Card } from "@/components/ui/card"

export function AttendanceViewSkeleton() {
  return (
    <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-full animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </Card>
  )
}
