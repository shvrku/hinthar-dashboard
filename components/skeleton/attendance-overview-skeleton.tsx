import { Skeleton } from "@/components/ui/skeleton"

export function AttendanceOverviewSkeleton() {
  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <section className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-[76px] rounded-xl" />
          <Skeleton className="h-[76px] rounded-xl" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </section>
      <section className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`lesson-stat-${i}`} className="h-[68px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      </section>
    </div>
  )
}
