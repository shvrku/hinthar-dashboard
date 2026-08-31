"use client"

import * as React from "react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Loader2,
  LogIn,
  QrCode,
  Undo2,
  Users,
} from "lucide-react"

import { formatBackendTime } from "@/lib/utils"
import type { CheckInStatus, OverviewSearchResponse } from "@/lib/types"
import { useSortableData } from "@/lib/use-sortable-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeletonRows } from "@/components/page-skeletons"
import { AnimatedTableBody } from "@/components/animation/animated-table-body"
import {
  Table,
  TableCell,
  TableHead,
  TableHeadSortable,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface ClassRow {
  studentId: number
  studentCode: string | null
  studentName: string
  classLabel?: string | null
  checkIn: CheckInStatus | null
}

function formatCheckInTime(timestamp: string): string {
  return formatBackendTime(timestamp)
}

export function ClassStudentTable({
  rows,
  kind,
  loading = false,
  showClass = false,
  undoingId = null,
  checkingInId = null,
  onCheckInStudent,
  onUndoCheckIn,
}: {
  rows: ClassRow[]
  kind: "missing" | "checked-in" | "roster"
  loading?: boolean
  showClass?: boolean
  undoingId?: number | null
  checkingInId?: number | null
  onCheckInStudent: (row: ClassRow) => void
  onUndoCheckIn?: (row: ClassRow) => void
}) {
  const { items, requestSort, sortConfig } = useSortableData(
    rows,
    kind === "checked-in" ? "checkIn.timestamp" : "studentName",
    kind === "checked-in" ? "desc" : "asc"
  )
  const columnCount =
    (kind === "missing" ? 3 : kind === "roster" ? 4 : 4) + (showClass ? 1 : 0)

  return (
    <>
      <div className="hidden max-h-112 min-w-0 overflow-y-auto overflow-x-hidden md:block">
        <Table className="table-fixed" containerClassName="overflow-x-hidden">
          <TableHeader>
            <TableRow>
              <TableHeadSortable
                className="w-[22%]"
                sortKey="studentCode"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
              >
                Student Code
              </TableHeadSortable>
              <TableHeadSortable
                className="w-[28%]"
                sortKey="studentName"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
              >
                Name
              </TableHeadSortable>
              {showClass && (
                <TableHeadSortable
                  className="w-[18%]"
                  sortKey="classLabel"
                  currentSortKey={sortConfig.key}
                  currentSortOrder={sortConfig.order}
                  onSort={requestSort}
                >
                  Class
                </TableHeadSortable>
              )}
              {kind === "roster" ? (
                <>
                  <TableHead className="w-[20%]">Status</TableHead>
                  <TableHead className="w-[12%] text-right">Action</TableHead>
                </>
              ) : kind === "checked-in" ? (
                <>
                  <TableHeadSortable
                    className="w-[22%]"
                    sortKey="checkIn.timestamp"
                    currentSortKey={sortConfig.key}
                    currentSortOrder={sortConfig.order}
                    onSort={requestSort}
                  >
                    Arrival
                  </TableHeadSortable>
                  <TableHead className="w-[12%] text-right">Action</TableHead>
                </>
              ) : (
                <TableHead className="w-[14%] text-right">Action</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <AnimatedTableBody
            loading={loading}
            hasData={items.length > 0}
            rowCount={8}
            skeletonRowCount={8}
            colSpan={columnCount}
            skeleton={<TableSkeletonRows columns={columnCount} rows={8} />}
            emptyTitle="No students found"
            emptyDescription="Nothing to show for this view."
          >
            {items.map((row) => (
                <TableRow key={row.studentId}>
                  <TableCell className="truncate font-medium">
                    {row.studentCode || `#${row.studentId}`}
                  </TableCell>
                  <TableCell className="truncate">{row.studentName}</TableCell>
                  {showClass && (
                    <TableCell className="truncate text-muted-foreground">
                      {row.classLabel || "—"}
                    </TableCell>
                  )}
                  {kind === "roster" ? (
                    <>
                      <TableCell>
                        {row.checkIn ? (
                          <Badge variant="success">
                            {formatCheckInTime(row.checkIn.timestamp)} ·{" "}
                            {row.checkIn.check_in_type === "qr"
                              ? "QR"
                              : "Manual"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Missing</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.checkIn ? (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            disabled={undoingId === row.checkIn.id}
                            onClick={() => onUndoCheckIn?.(row)}
                            aria-label="Undo check-in"
                          >
                            {undoingId === row.checkIn.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Undo2 className="size-3.5" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            disabled={checkingInId === row.studentId}
                            onClick={() => onCheckInStudent(row)}
                            aria-label="Check in"
                          >
                            {checkingInId === row.studentId ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <LogIn className="size-3.5" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </>
                  ) : kind === "checked-in" && row.checkIn ? (
                    <>
                      <TableCell>
                        <span className="tabular-nums text-muted-foreground">
                          {formatCheckInTime(row.checkIn.timestamp)}
                        </span>
                        <Badge variant="secondary" className="ml-2">
                          {row.checkIn.check_in_type === "qr" ? "QR" : "Manual"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          disabled={undoingId === row.checkIn.id}
                          onClick={() => onUndoCheckIn?.(row)}
                          aria-label="Undo check-in"
                        >
                          {undoingId === row.checkIn.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Undo2 className="size-3.5" />
                          )}
                        </Button>
                      </TableCell>
                    </>
                  ) : (
                    <TableCell className="text-right">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        disabled={checkingInId === row.studentId}
                        onClick={() => onCheckInStudent(row)}
                        aria-label="Check in"
                      >
                        {checkingInId === row.studentId ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <LogIn className="size-3.5" />
                        )}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
          </AnimatedTableBody>
        </Table>
      </div>

      <div className="max-h-112 overflow-y-auto md:hidden">
        {loading && <CardSkeletonList />}
        {!loading && (
          <div className="flex flex-col gap-2 px-4">
            {items.map((row) => (
              <Card key={row.studentId} size="sm">
                <CardHeader>
                  <CardTitle>{row.studentName}</CardTitle>
                  <CardDescription>
                    {row.studentCode || `#${row.studentId}`}
                    {showClass && row.classLabel ? ` · ${row.classLabel}` : ""}
                    {row.checkIn
                      ? ` · ${formatCheckInTime(row.checkIn.timestamp)}`
                      : ""}
                  </CardDescription>
                  <CardAction>
                    {row.checkIn ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {row.checkIn.check_in_type === "qr" ? "QR" : "Manual"}
                        </Badge>
                        <Button
                          size="icon-xs"
                          variant="outline"
                          disabled={undoingId === row.checkIn.id}
                          onClick={() => onUndoCheckIn?.(row)}
                          aria-label="Undo check-in"
                        >
                          {undoingId === row.checkIn.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Undo2 className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon-xs"
                        variant="outline"
                        disabled={checkingInId === row.studentId}
                        onClick={() => onCheckInStudent(row)}
                        aria-label="Check in"
                      >
                        {checkingInId === row.studentId ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <LogIn className="size-3.5" />
                        )}
                      </Button>
                    )}
                  </CardAction>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export function SearchResultsTable({
  data,
  loading = false,
  checkingInId = null,
  onCheckInStudent,
  onSelectClass,
}: {
  data: OverviewSearchResponse | null
  loading?: boolean
  checkingInId?: number | null
  onCheckInStudent: (row: {
    student_id: number
    unique_code: string | null
    name: string
    class_label: string
    check_in: CheckInStatus | null
  }) => void
  onSelectClass: (classId: number) => void
}) {
  return (
    <div className="max-h-140 overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Student Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Class</TableHead>
            <TableHead className="w-[170px]">Status</TableHead>
            <TableHead className="w-[130px] text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <AnimatedTableBody
          loading={loading}
          hasData={(data?.results ?? []).length > 0}
          rowCount={8}
          skeletonRowCount={8}
          colSpan={5}
          skeleton={
            <TableSkeletonRows
              columns={5}
              rows={8}
            />
          }
          emptyTitle="No students matched"
          emptyDescription="Try a different name or student code."
        >
          {(data?.results ?? []).map((row) => (
            <TableRow key={`${row.class_id}-${row.student_id}`}>
              <TableCell className="font-medium">
                {row.unique_code || `#${row.student_id}`}
              </TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {row.class_label}
              </TableCell>
              <TableCell>
                {row.check_in ? (
                  <Badge variant="success">
                    {formatCheckInTime(row.check_in.timestamp)} ·{" "}
                    {row.check_in.check_in_type === "qr" ? "QR" : "Manual"}
                  </Badge>
                ) : (
                  <Badge variant="outline">Missing</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {!row.check_in && (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      disabled={checkingInId === row.student_id}
                      onClick={() =>
                        onCheckInStudent({
                          student_id: row.student_id,
                          unique_code: row.unique_code,
                          name: row.name,
                          class_label: row.class_label,
                          check_in: row.check_in,
                        })
                      }
                      aria-label="Check in"
                    >
                      {checkingInId === row.student_id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <LogIn className="size-3.5" />
                      )}
                    </Button>
                  )}
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => onSelectClass(row.class_id)}
                    aria-label="View class"
                  >
                    <Eye className="size-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </AnimatedTableBody>
      </Table>
    </div>
  )
}

export function toClassRows(
  students: {
    id: number
    unique_code: string | null
    name: string
    class_label?: string | null
    check_in: CheckInStatus | null
  }[]
): ClassRow[] {
  return students.map((student) => ({
    studentId: student.id,
    studentCode: student.unique_code,
    studentName: student.name,
    classLabel: student.class_label ?? null,
    checkIn: student.check_in,
  }))
}

export function RosterPageFooter({
  page,
  numPages,
  count,
  loading,
  onPrevious,
  onNext,
}: {
  page: number
  numPages: number
  count: number
  loading: boolean
  onPrevious: () => void
  onNext: () => void
}) {
  if (numPages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-2 px-6 pt-3">
      <p className="text-xs text-muted-foreground">
        Page {page} of {numPages}
        {count > 0 ? ` · ${count} students` : ""}
      </p>
      <div className="flex gap-2">
        <Button
          size="icon-xs"
          variant="outline"
          disabled={page <= 1 || loading}
          onClick={onPrevious}
          aria-label="Previous page"
        >
          <ArrowLeft className="size-3.5" />
        </Button>
        <Button
          size="icon-xs"
          variant="outline"
          disabled={page >= numPages || loading}
          onClick={onNext}
          aria-label="Next page"
        >
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function GroupEmptyState({
  kind,
  hasEnrollments,
}: {
  kind: "missing" | "checked-in"
  hasEnrollments: boolean
}) {
  const isMissing = kind === "missing"
  if (!hasEnrollments) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users />
          </EmptyMedia>
          <EmptyTitle>No enrolled students</EmptyTitle>
          <EmptyDescription>
            There are no enrollments for this selection on the chosen date.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {isMissing ? <Check /> : <QrCode />}
        </EmptyMedia>
        <EmptyTitle>
          {isMissing ? "Everyone has checked in" : "No campus arrivals yet"}
        </EmptyTitle>
        <EmptyDescription>
          {isMissing
            ? "No enrolled students are missing for the selected date."
            : "No students in this selection have a campus check-in for the selected date."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  )
}


function CardSkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 px-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-16 w-full animate-pulse rounded-xl bg-muted"
        />
      ))}
    </div>
  )
}
