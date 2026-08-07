import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

/** Table body rows that mirror real column widths to avoid layout shift. */
export function TableSkeletonRows({
  rows = 5,
  columns,
  cellClassNames,
}: {
  rows?: number
  columns: number
  /** Per-column skeleton sizing; cycles when shorter than `columns`. */
  cellClassNames?: string[]
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={`skeleton-row-${rowIndex}`}>
          {Array.from({ length: columns }).map((_, cellIndex) => (
            <TableCell key={`skeleton-cell-${rowIndex}-${cellIndex}`}>
              <Skeleton
                className={cn(
                  "h-4 w-full",
                  cellClassNames?.[cellIndex % (cellClassNames.length || 1)]
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

const STUDENT_TABLE_CELLS = [
  "mx-auto size-4 shrink-0 rounded-sm",
  "h-4 w-full max-w-[3.5rem]",
  "h-5 w-full max-w-[2.5rem] rounded-full",
  "h-4 w-full max-w-[9rem]",
  "h-4 w-full max-w-[5rem]",
  "h-4 w-full max-w-[7rem]",
  "h-4 w-full max-w-[4rem]",
  "h-4 w-full max-w-[6rem]",
  "ml-auto h-8 w-full max-w-[6rem] rounded-lg",
]

const TEACHER_TABLE_CELLS = [
  "mx-auto size-4 shrink-0 rounded-sm",
  "h-4 w-full max-w-[3.5rem]",
  "h-5 w-full max-w-[2.5rem] rounded-full",
  "h-4 w-full max-w-[9rem]",
  "h-4 w-full max-w-[6rem]",
  "h-4 w-full max-w-[5rem]",
  "ml-auto h-8 w-full max-w-[6rem] rounded-lg",
]

const CLASS_TABLE_CELLS = [
  "mx-auto size-4 shrink-0 rounded-sm",
  "h-4 w-full max-w-[6rem]",
  "h-4 w-full max-w-[4rem]",
  "h-4 w-full max-w-[3rem]",
  "h-4 w-full max-w-[3rem]",
  "ml-auto h-8 w-full max-w-[7rem] rounded-lg",
]

const SUBJECT_TABLE_CELLS = [
  "mx-auto size-4 shrink-0 rounded-sm",
  "h-4 w-full max-w-[8rem]",
  "h-4 w-full max-w-[12rem]",
  "ml-auto h-8 w-full max-w-[6rem] rounded-lg",
]

/** Checkbox · ID · Teacher · Class · Start · End · Status · Actions */
const SESSION_TABLE_CELLS = [
  "mx-auto size-4 shrink-0 rounded-sm",
  "h-4 w-full max-w-[3rem]",
  "h-4 w-full max-w-[9rem]",
  "h-5 w-full max-w-[5rem] rounded-full",
  "h-4 w-full max-w-[7rem]",
  "h-4 w-full max-w-[7rem]",
  "mx-auto h-5 w-full max-w-[4.5rem] rounded-full",
  "ml-auto h-8 w-full max-w-[6rem] rounded-lg",
]

/** Checkbox · ID · Teacher · Subject · Date · Start · End · Status · Actions */
const ADHOC_SESSION_TABLE_CELLS = [
  "mx-auto size-4 shrink-0 rounded-sm",
  "h-4 w-full max-w-[3rem]",
  "h-4 w-full max-w-[8rem]",
  "h-4 w-full max-w-[6rem]",
  "h-4 w-full max-w-[5rem]",
  "h-4 w-full max-w-[4rem]",
  "h-4 w-full max-w-[4rem]",
  "mx-auto h-5 w-full max-w-[4.5rem] rounded-full",
  "ml-auto h-8 w-full max-w-[6rem] rounded-lg",
]

/** ID · Date · Start · End · Teacher · Status · Actions (find-slot occurrence table) */
const SESSION_OCCURRENCE_TABLE_CELLS = [
  "h-4 w-full max-w-[3rem]",
  "h-4 w-full max-w-[5rem]",
  "h-4 w-full max-w-[7rem]",
  "h-4 w-full max-w-[7rem]",
  "h-4 w-full max-w-[9rem]",
  "mx-auto h-5 w-full max-w-[4.5rem] rounded-full",
  "ml-auto h-8 w-full max-w-[5rem] rounded-lg",
]

export function StudentTableSkeletonRows({ rows = 5 }: { rows?: number }) {
  return <TableSkeletonRows rows={rows} columns={9} cellClassNames={STUDENT_TABLE_CELLS} />
}

export function TeacherTableSkeletonRows({ rows = 5 }: { rows?: number }) {
  return <TableSkeletonRows rows={rows} columns={7} cellClassNames={TEACHER_TABLE_CELLS} />
}

export function ClassTableSkeletonRows({ rows = 5 }: { rows?: number }) {
  return <TableSkeletonRows rows={rows} columns={6} cellClassNames={CLASS_TABLE_CELLS} />
}

export function SubjectTableSkeletonRows({ rows = 5 }: { rows?: number }) {
  return <TableSkeletonRows rows={rows} columns={4} cellClassNames={SUBJECT_TABLE_CELLS} />
}

export function SessionTableSkeletonRows({ rows = 5 }: { rows?: number }) {
  return <TableSkeletonRows rows={rows} columns={8} cellClassNames={SESSION_TABLE_CELLS} />
}

export function AdhocSessionTableSkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <TableSkeletonRows rows={rows} columns={9} cellClassNames={ADHOC_SESSION_TABLE_CELLS} />
  )
}

export function SessionOccurrenceTableSkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <TableSkeletonRows
      rows={rows}
      columns={7}
      cellClassNames={SESSION_OCCURRENCE_TABLE_CELLS}
    />
  )
}

export function DashboardStatGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={`stat-skeleton-${i}`} className="border border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-9 rounded-lg" />
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
            <Skeleton className="h-9 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

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

export function StudentDetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-28" />

      <Card className="overflow-hidden border-border/80">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3 min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-9 w-56 max-w-full" />
              <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`profile-field-${i}`} className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </div>
            <Skeleton className="h-8 w-28 rounded-lg shrink-0" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/80">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y rounded-xl border">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`enrollment-${i}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="size-8 rounded-md" />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-48 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="mx-auto size-[180px] rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-8 flex-1 rounded-lg" />
              <Skeleton className="h-8 flex-1 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-9 w-72 rounded-lg" />
        </CardHeader>
        <CardContent>
          <AttendanceOverviewSkeleton />
        </CardContent>
      </Card>
    </div>
  )
}
