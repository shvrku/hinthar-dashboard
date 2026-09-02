import { PageSkeleton, type PageSkeletonBlock } from "@/components/skeleton/page-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export function AnnouncementsListSkeleton() {
  const blocks: PageSkeletonBlock[] = [
    {
      type: "card",
      className: "p-4",
      body: { type: "enroll-row" },
    },
    {
      type: "card",
      header: { description: true },
      body: { type: "list-rows", rows: 5, variant: "session" },
    },
  ]
  return (
    <div className="w-full space-y-4">
      <PageSkeleton blocks={blocks} />
      <p className="text-center text-sm text-muted-foreground">Loading announcements…</p>
    </div>
  )
}

export function EventsManageListSkeleton() {
  return (
    <div className="w-full space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border border-border/80 px-4 py-4 sm:px-5"
        >
          <Skeleton className="size-11 shrink-0 rounded-[10px]" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <Skeleton className="hidden h-4 w-24 sm:block" />
          <Skeleton className="size-4 shrink-0 rounded" />
        </div>
      ))}
      <p className="text-center text-sm text-muted-foreground">Loading events…</p>
    </div>
  )
}

export function EditorPageSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <PageSkeleton
        className="w-full"
        blocks={[
          { type: "text-line", className: "h-10 w-2/3 max-w-md" },
          { type: "text-line", className: "h-6 w-1/2 max-w-xs" },
          {
            type: "card",
            className: "w-full",
            body: { type: "text-line", className: "h-64 w-full" },
          },
        ]}
      />
      <p className="text-center text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

/** Matches the Luma-style event compose screen layout. */
export function EventComposeSkeleton({ label = "Loading event…" }: { label?: string }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <Skeleton className="h-8 w-24 rounded-lg" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-10 w-3/4 max-w-sm rounded-lg" />
        <div className="grid gap-5 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-1.5">
          <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-2">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-3 w-24 rounded lg:col-start-2 lg:row-start-1" />
          <div className="flex flex-col gap-3 lg:col-start-2 lg:row-start-2">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

/** Matches the manage event dashboard layout. */
export function EventManageDashboardSkeleton() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/80 px-4 py-3 sm:px-6">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="overflow-hidden rounded-xl border border-border/80">
          <div className="grid md:grid-cols-[1.2fr_0.9fr]">
            <div className="space-y-4 border-b border-border/80 p-5 sm:p-6 md:border-r md:border-b-0">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-9 w-56 max-w-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6 max-w-full" />
                <Skeleton className="h-4 w-2/3 max-w-md" />
              </div>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <Skeleton className="h-4 w-28" />
              <div className="flex gap-3">
                <Skeleton className="size-11 rounded-[10px]" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <div className="flex gap-3">
                <Skeleton className="size-11 rounded-[10px]" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 max-w-sm min-w-0 flex-1 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">Loading event…</p>
      </div>
    </div>
  )
}
