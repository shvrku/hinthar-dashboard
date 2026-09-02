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

export function DashboardOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={`kpi-skeleton-${i}`}>
            <CardHeader className="flex flex-row items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-4 rounded-sm" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full rounded-xl" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-44" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={`activity-skeleton-${i}`} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/** Select + primary CTA inside Ops class-picker cards. */
export function ClassPickerCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
}

/** Week timetable / find-sessions grid chrome. */
export function WeekGridSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
      <div className="flex border-b border-border bg-muted/40">
        <div className="w-20 shrink-0 border-r border-border p-3">
          <Skeleton className="mx-auto h-3 w-10" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="min-w-0 flex-1 border-r border-border p-3 last:border-r-0">
            <Skeleton className="mx-auto h-3 w-12" />
          </div>
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex min-h-16">
            <div className="flex w-20 shrink-0 items-start justify-center border-r border-border p-3">
              <Skeleton className="h-3 w-10" />
            </div>
            {Array.from({ length: 5 }).map((_, col) => (
              <div key={col} className="min-w-0 flex-1 border-r border-border p-2 last:border-r-0">
                {row % 2 === col % 2 ? (
                  <Skeleton className="h-12 w-full rounded-md" />
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export { AttendanceOverviewSkeleton } from "@/components/skeleton/attendance-overview-skeleton"
export { PageSkeleton } from "@/components/skeleton/page-skeleton"
export type { PageSkeletonBlock } from "@/components/skeleton/page-skeleton"
export {
  CLASS_DETAIL_PAGE_LAYOUT,
  STUDENT_DETAIL_PAGE_LAYOUT,
  TEACHER_DETAIL_PAGE_LAYOUT,
} from "@/components/skeleton/detail-page-layouts"
