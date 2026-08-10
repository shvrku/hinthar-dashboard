import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { AttendanceOverviewSkeleton } from "@/components/skeleton/attendance-overview-skeleton"

/** Declarative block describing a loading placeholder region. */
export type PageSkeletonBlock =
  | { type: "back-link" }
  | {
      type: "profile-hero"
      badges?: number
      fields?: number
      action?: boolean
      titleClassName?: string
    }
  | {
      type: "card"
      className?: string
      header?: {
        tabs?: boolean
        action?: boolean
        titleBadge?: boolean
        description?: boolean
      }
      body: PageSkeletonBlock | PageSkeletonBlock[]
      bodyClassName?: string
    }
  | { type: "stack"; className?: string; blocks: PageSkeletonBlock[] }
  | { type: "grid"; className?: string; blocks: PageSkeletonBlock[] }
  | {
      type: "stat-grid"
      count: number
      cols?: 2 | 3 | 4
      itemClassName?: string
    }
  | {
      type: "stat-chart-row"
      statCount: number
      statCols?: 2 | 3
      chartClassName?: string
    }
  | { type: "charts-row"; count?: number; className?: string }
  | { type: "text-line"; className?: string }
  | { type: "list-rows"; rows?: number; variant?: "default" | "session" }
  | { type: "enroll-row" }
  | { type: "timetable-week" }
  | { type: "attendance-overview" }
  | { type: "media-panel" }
  | { type: "button"; className?: string }

function CardHeaderSkeleton({
  tabs,
  action,
  titleBadge,
  description,
}: NonNullable<Extract<PageSkeletonBlock, { type: "card" }>["header"]>) {
  return (
    <CardHeader
      className={cn(
        tabs && "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        action && !tabs && "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      )}
    >
      <div className="space-y-2">
        {titleBadge ? (
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
        ) : (
          <Skeleton className="h-5 w-40" />
        )}
        {description ? <Skeleton className="h-3 w-56 mt-2" /> : null}
      </div>
      {tabs ? <Skeleton className="h-9 w-56 rounded-lg" /> : null}
      {action && !tabs ? <Skeleton className="h-8 w-40 rounded-lg shrink-0" /> : null}
    </CardHeader>
  )
}

function renderBody(block: PageSkeletonBlock, key: string): ReactNode {
  switch (block.type) {
    case "stat-grid":
      return (
        <div
          key={key}
          className={cn(
            "grid gap-3",
            block.cols === 4 && "grid-cols-2 sm:grid-cols-4",
            block.cols === 3 && "grid-cols-2 sm:grid-cols-3",
            (!block.cols || block.cols === 2) && "grid-cols-2"
          )}
        >
          {Array.from({ length: block.count }).map((_, i) => (
            <Skeleton
              key={`${key}-stat-${i}`}
              className={cn("rounded-xl", block.itemClassName ?? "h-[68px]")}
            />
          ))}
        </div>
      )

    case "stat-chart-row":
      return (
        <div key={key} className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div
            className={cn(
              "grid gap-3",
              block.statCols === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"
            )}
          >
            {Array.from({ length: block.statCount }).map((_, i) => (
              <Skeleton key={`${key}-stat-${i}`} className="h-[76px] rounded-xl" />
            ))}
          </div>
          <Skeleton
            className={cn(
              "mx-auto h-56 w-full max-w-[280px] rounded-xl",
              block.chartClassName
            )}
          />
        </div>
      )

    case "charts-row":
      return (
        <div key={key} className={cn("grid gap-4 lg:grid-cols-2", block.className)}>
          {Array.from({ length: block.count ?? 2 }).map((_, i) => (
            <Skeleton key={`${key}-chart-${i}`} className="h-72 rounded-xl" />
          ))}
        </div>
      )

    case "text-line":
      return <Skeleton key={key} className={cn("h-4 w-64 max-w-full", block.className)} />

    case "list-rows":
      return (
        <div key={key} className="divide-y rounded-xl border">
          {Array.from({ length: block.rows ?? 3 }).map((_, i) =>
            block.variant === "session" ? (
              <div
                key={`${key}-row-${i}`}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            ) : (
              <div
                key={`${key}-row-${i}`}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="size-8 rounded-md" />
              </div>
            )
          )}
        </div>
      )

    case "enroll-row":
      return (
        <div key={key} className="flex flex-col gap-2 sm:flex-row">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg shrink-0" />
        </div>
      )

    case "timetable-week":
      return (
        <div key={key} className="overflow-hidden rounded-xl border border-border/80">
          <div className="grid min-w-[640px] grid-cols-7 divide-x divide-border/60">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={`${key}-day-${i}`} className="min-h-40 bg-card">
                <Skeleton className="h-8 w-full rounded-none" />
                <div className="space-y-1.5 p-1.5">
                  <Skeleton className="h-14 w-full rounded-md" />
                  <Skeleton className="h-14 w-full rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )

    case "attendance-overview":
      return <AttendanceOverviewSkeleton key={key} />

    case "media-panel":
      return (
        <div key={key} className="space-y-4">
          <Skeleton className="mx-auto size-[180px] rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1 rounded-lg" />
            <Skeleton className="h-8 flex-1 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      )

    case "stack":
      return (
        <div key={key} className={cn("space-y-6", block.className)}>
          {block.blocks.map((child, i) => renderBlock(child, `${key}-stack-${i}`))}
        </div>
      )

    case "grid":
      return (
        <div key={key} className={cn("grid gap-6", block.className)}>
          {block.blocks.map((child, i) => renderBlock(child, `${key}-grid-${i}`))}
        </div>
      )

    default:
      return null
  }
}

function renderBlock(block: PageSkeletonBlock, key: string): ReactNode {
  switch (block.type) {
    case "back-link":
      return <Skeleton key={key} className="h-8 w-28" />

    case "profile-hero":
      return (
        <Card key={key} className="border-border/80">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3 min-w-0 flex-1">
                {(block.badges ?? 0) > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: block.badges! }).map((_, i) => (
                      <Skeleton key={`${key}-badge-${i}`} className="h-5 w-12 rounded-full" />
                    ))}
                  </div>
                ) : null}
                <Skeleton className={cn("h-9 max-w-full", block.titleClassName ?? "w-56")} />
                {(block.fields ?? 0) > 0 ? (
                  <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                    {Array.from({ length: block.fields! }).map((_, i) => (
                      <div key={`${key}-field-${i}`} className="space-y-1">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              {block.action ? <Skeleton className="h-8 w-28 rounded-lg shrink-0" /> : null}
            </div>
          </CardContent>
        </Card>
      )

    case "card": {
      const bodyBlocks = Array.isArray(block.body) ? block.body : [block.body]
      return (
        <Card key={key} className={cn("border-border/80", block.className)}>
          {block.header ? <CardHeaderSkeleton {...block.header} /> : null}
          <CardContent className={cn("space-y-4", block.bodyClassName)}>
            {bodyBlocks.map((child, i) => renderBody(child, `${key}-body-${i}`))}
          </CardContent>
        </Card>
      )
    }

    case "button":
      return <Skeleton key={key} className={cn("h-9 w-28 rounded-lg", block.className)} />

    default:
      return renderBody(block, key)
  }
}

export function PageSkeleton({
  blocks,
  className,
}: {
  blocks: PageSkeletonBlock[]
  className?: string
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {blocks.map((block, i) => renderBlock(block, `page-skeleton-${i}`))}
    </div>
  )
}
