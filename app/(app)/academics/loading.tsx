import { Skeleton } from "@/components/ui/skeleton"

export default function AcademicsLoading() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="rounded-sm border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-7 w-72" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-14 w-24 rounded-sm" />
            <Skeleton className="h-14 w-24 rounded-sm" />
            <Skeleton className="h-14 w-24 rounded-sm" />
            <Skeleton className="h-14 w-24 rounded-sm" />
          </div>
        </div>
      </div>

      <Skeleton className="h-10 w-full rounded-sm" />

      <div className="rounded-sm border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Skeleton className="h-8 w-80 max-w-full rounded-sm" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28 rounded-sm" />
            <Skeleton className="h-8 w-28 rounded-sm" />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          {Array.from({ length: 8 }).map((_, idx) => (
            <Skeleton key={idx} className="h-10 w-full rounded-sm" />
          ))}
        </div>
      </div>
    </div>
  )
}
