import { Skeleton } from "@/components/ui/skeleton"

/** List: date → title → preview → tag chips. */
export function AnnouncementsListSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl divide-y divide-border/70">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2 py-8">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-[66%] max-w-md" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-4 w-[80%] max-w-lg" />
          <div className="flex gap-2 pt-1">
            {i === 0 ? <Skeleton className="h-5 w-16 rounded-full" /> : null}
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
      ))}
      <p className="pt-4 text-center text-sm text-muted-foreground">Loading announcements…</p>
    </div>
  )
}

/** Blog-style announcement detail. */
export function AnnouncementDetailSkeleton({ label = "Loading announcement…" }: { label?: string }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-36 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-[80%] max-w-md" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[83%]" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[66%]" />
      </div>
      <p className="text-center text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

/** Manage events list body (header rendered separately). */
export function EventsManageListSkeleton() {
  return (
    <div className="w-full space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border/80 px-4 py-4 last:border-b-0 sm:px-5"
          >
            <Skeleton className="size-11 shrink-0 rounded-[10px]" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3 w-40 max-w-full" />
            </div>
            <Skeleton className="hidden h-4 w-24 sm:block" />
            <Skeleton className="size-4 shrink-0 rounded" />
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">Loading events…</p>
    </div>
  )
}

/** Markdown / announcement editor page. */
export function EditorPageSkeleton({ label }: { label: string }) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-end justify-between gap-3 border-b border-border/50 pb-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-52 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
      <p className="text-center text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

/** Matches StandardPageHeader + event compose body. */
export function EventComposeSkeleton({ label = "Loading event…" }: { label?: string }) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-end justify-between gap-3 border-b border-border/50 pb-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-6">
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-10 w-[75%] max-w-sm rounded-lg" />
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

/** Matches manage event detail with StandardPageHeader + card. */
export function EventManageDashboardSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-end justify-between gap-3 border-b border-border/50 pb-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="overflow-hidden rounded-xl border border-border/80">
          <div className="grid md:grid-cols-[1.2fr_0.9fr]">
            <div className="space-y-4 border-b border-border/80 p-5 sm:p-6 md:border-r md:border-b-0">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[83%] max-w-full" />
                <Skeleton className="h-4 w-[66%] max-w-md" />
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
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-9 flex-1 rounded-lg" />
                <Skeleton className="h-9 flex-1 rounded-lg" />
              </div>
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

/** Public/signed-in events home timeline. */
export function EventsHomeSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[4.5rem_0.75rem_1fr] gap-x-3 sm:grid-cols-[5.5rem_1rem_1fr] sm:gap-x-4"
        >
          <div className="space-y-1.5 pt-1">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex justify-center pt-2">
            <Skeleton className="size-2.5 rounded-full" />
          </div>
          <div className="space-y-3 pb-8">
            <Skeleton className="h-28 w-full rounded-2xl" />
            {i === 0 ? <Skeleton className="h-28 w-full rounded-2xl" /> : null}
          </div>
        </div>
      ))}
      <p className="text-center text-sm text-muted-foreground">Loading events…</p>
    </div>
  )
}

/** Event public/detail blog column. */
export function EventDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <Skeleton className="h-8 w-24 rounded-lg" />
      <div className="space-y-5">
        <Skeleton className="h-10 w-[80%] max-w-md" />
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 shrink-0 rounded-[10px]" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 shrink-0 rounded-[10px]" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[66%]" />
      </div>
      <p className="text-center text-sm text-muted-foreground">Loading event…</p>
    </div>
  )
}

/** Full registrations page (header + roster chrome). */
export function EventRegistrationsSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-end justify-between gap-3 border-b border-border/50 pb-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-48 max-w-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-2xl">
        <EventRegistrationRosterSkeleton />
      </div>
      <p className="text-center text-sm text-muted-foreground">Loading registration roster…</p>
    </div>
  )
}

/** Roster body: search, filter chips, guest rows. */
export function EventRegistrationRosterSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-t border-border/80 px-4 py-3.5 first:border-t-0 sm:px-5"
          >
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-36 max-w-full" />
              <Skeleton className="h-3 w-48 max-w-full" />
            </div>
            <Skeleton className="h-8 w-24 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
