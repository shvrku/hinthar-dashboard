"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Eye,
  GraduationCap,
  Lock,
  Minus,
  RotateCcw,
  ShieldCheck,
  UserCheck,
} from "lucide-react"

import { ApiError, createApi } from "@/lib/api"
import { formatStudentIdentifier } from "@/lib/format-student-code"
import { isStaffOrAbove } from "@/lib/roles"
import type {
  ExamPassFailStatus,
  ParentPortalResponse,
  ParentPortalTermCell,
} from "@/lib/types"
import { useCurrentUser } from "@/components/current-user-provider"
import {
  CodeChip,
  DataModule,
  SystemHeader,
  TelemetryTag,
  type TelemetryStatus,
} from "@/components/design-system/v2-primitives"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useSyncedHorizontalScroll,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

function statusToTelemetry(status: ExamPassFailStatus): TelemetryStatus {
  if (status === "PASS") return "present"
  if (status === "FAIL") return "absent"
  if (status === "UNPUBLISHED") return "neutral"
  return "late"
}

function renderTermCell(
  cell: ParentPortalTermCell | null,
  isAdminPreview: boolean
) {
  if (!cell) {
    return (
      <span className="font-mono text-xs text-muted-foreground/70">
        NO EXAM
      </span>
    )
  }

  if (cell.status === "UNPUBLISHED" || (!cell.is_published && !isAdminPreview)) {
    return (
      <div className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
        <Lock className="size-3" />
        <span>PENDING RELEASE</span>
      </div>
    )
  }

  if (cell.status === "PENDING") {
    return (
      <div className="flex items-center gap-2">
        <TelemetryTag status="late">AWAITING MARKS</TelemetryTag>
        {isAdminPreview && !cell.is_published && (
          <span className="font-mono text-[10px] uppercase text-muted-foreground">
            [UNPUBLISHED]
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-xs font-bold tabular-nums text-foreground">
        {cell.is_absent ? "ABS" : cell.marks_obtained} / {cell.max_marks}
      </span>
      <CodeChip>{cell.grade ?? "—"}</CodeChip>
      {cell.percentage != null && (
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          ({cell.percentage}%)
        </span>
      )}
      {isAdminPreview && !cell.is_published && (
        <span className="rounded-[2px] border border-warning/40 bg-warning/10 px-1 py-0.2 font-mono text-[9px] font-semibold uppercase text-warning">
          HIDDEN FROM PARENT
        </span>
      )}
    </div>
  )
}

export function ParentPortalWorkspace({
  embedded = false,
}: {
  embedded?: boolean
}) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { role } = useCurrentUser()
  const isStaff = isStaffOrAbove(role)

  const [selectedStudentId, setSelectedStudentId] = React.useState<string>("")
  const [selectedYearId, setSelectedYearId] = React.useState<string>("")
  const [data, setData] = React.useState<ParentPortalResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [scheduleTermFilter, setScheduleTermFilter] = React.useState<
    "ALL" | "midterm" | "final"
  >("ALL")

  const lastRequestedKeyRef = React.useRef<string | null>(null)

  const loadPortal = React.useCallback(
    async (opts?: { force?: boolean }) => {
      if (!isSignedIn) return
      const reqKey = `${selectedStudentId}:${selectedYearId}`
      if (!opts?.force && lastRequestedKeyRef.current === reqKey) {
        return
      }
      lastRequestedKeyRef.current = reqKey
      setLoading(true)
      try {
        const token = await getToken()
        if (!token) return
        const api = createApi(token)
        const res = await api.getParentPortal({
          student_id: selectedStudentId ? Number(selectedStudentId) : undefined,
          academic_year_id: selectedYearId ? Number(selectedYearId) : undefined,
        })
        const resolvedStudentId = !selectedStudentId && res.student ? String(res.student.id) : selectedStudentId
        const resolvedYearId =
          !selectedYearId && res.selected_academic_year
            ? String(res.selected_academic_year.id)
            : selectedYearId
        lastRequestedKeyRef.current = `${resolvedStudentId}:${resolvedYearId}`
        setData(res)
        if (!selectedStudentId && res.student) {
          setSelectedStudentId(String(res.student.id))
        }
        if (!selectedYearId && res.selected_academic_year) {
          setSelectedYearId(String(res.selected_academic_year.id))
        }
      } catch (err) {
        lastRequestedKeyRef.current = null
        toast.add({
          title:
            err instanceof ApiError
              ? err.userMessage
              : "Failed to load parent results portal",
          type: "error",
        })
      } finally {
        setLoading(false)
      }
    },
    [getToken, isSignedIn, selectedStudentId, selectedYearId]
  )

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      void loadPortal()
    }
  }, [isLoaded, isSignedIn, loadPortal])

  const student = data?.student ?? null
  const isAdminPreview = Boolean(data?.is_admin_preview) && isStaff && role !== "parent"

  const assignedClassIds = React.useMemo(
    () => new Set(student?.class_ids ?? []),
    [student?.class_ids]
  )
  const assignedClassLabels = React.useMemo(
    () => new Set(student?.class_labels ?? []),
    [student?.class_labels]
  )

  const matchesStudentCohort = React.useCallback(
    (classId: number, cohortLabel: string) => {
      if (assignedClassIds.size > 0) {
        return assignedClassIds.has(classId)
      }
      if (assignedClassLabels.size > 0) {
        return assignedClassLabels.has(cohortLabel)
      }
      return true
    },
    [assignedClassIds, assignedClassLabels]
  )

  const filteredComparison = React.useMemo(() => {
    const rows = (data?.results_comparison ?? []).filter((r) =>
      matchesStudentCohort(r.class_id, r.cohort_label)
    )
    const q = searchQuery.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.subject_name.toLowerCase().includes(q) ||
        r.cohort_label.toLowerCase().includes(q)
    )
  }, [data?.results_comparison, searchQuery, matchesStudentCohort])

  const filteredSchedule = React.useMemo(() => {
    const rows = (data?.exam_schedule ?? []).filter((e) =>
      matchesStudentCohort(e.class_id, e.cohort_label)
    )
    return rows.filter((e) => {
      if (scheduleTermFilter !== "ALL" && e.term_type !== scheduleTermFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          e.subject_name.toLowerCase().includes(q) ||
          e.cohort_label.toLowerCase().includes(q) ||
          e.room.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [data?.exam_schedule, scheduleTermFilter, searchQuery, matchesStudentCohort])

  const midtermSummary = data?.term_summaries?.midterm ?? null
  const finalSummary = data?.term_summaries?.final_term ?? null
  const accessibleStudents = data?.accessible_students ?? []

  const comparisonScroll = useSyncedHorizontalScroll(900)
  const timetableScroll = useSyncedHorizontalScroll(900)

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-28 w-full rounded-sm border border-border skeleton-shimmer" />
        <div className="h-80 w-full rounded-sm border border-border skeleton-shimmer" />
      </div>
    )
  }

  return (
    <div className={cn("min-w-0 max-w-full space-y-4", !embedded && "p-4 sm:p-6")}>
      {!embedded && (
        <SystemHeader
          domain={isStaff ? "ACADEMICS // PREVIEW" : "PARENT PORTAL"}
          breadcrumb="EXAM RESULTS & SCHEDULE"
          title="Student Exam Progress & Term Comparison"
          description="Scoped view of enrolled subjects, Midterm and Final Term schedules, released marks, and teacher remarks."
          metrics={[
            {
              label: "ENROLLED SUBJECTS",
              value: filteredComparison.length || (data?.enrolled_subjects.length ?? 0),
            },
            {
              label: "MIDTERM AVG",
              value:
                midtermSummary &&
                (midtermSummary.is_published || isAdminPreview) &&
                midtermSummary.average_percentage != null
                  ? `${midtermSummary.average_percentage}% (${midtermSummary.letter_grade ?? "—"})`
                  : midtermSummary &&
                      (!midtermSummary.is_published && !isAdminPreview)
                    ? "LOCKED"
                    : "—",
              tone:
                midtermSummary &&
                (midtermSummary.is_published || isAdminPreview)
                  ? midtermSummary.pass_fail_status === "PASS"
                    ? "success"
                    : midtermSummary.pass_fail_status === "FAIL"
                      ? "destructive"
                      : "default"
                  : "default",
            },
            {
              label: "FINAL TERM AVG",
              value:
                finalSummary &&
                (finalSummary.is_published || isAdminPreview) &&
                finalSummary.average_percentage != null
                  ? `${finalSummary.average_percentage}% (${finalSummary.letter_grade ?? "—"})`
                  : finalSummary &&
                      (!finalSummary.is_published && !isAdminPreview)
                    ? "LOCKED"
                    : "—",
              tone:
                finalSummary &&
                (finalSummary.is_published || isAdminPreview)
                  ? finalSummary.pass_fail_status === "PASS"
                    ? "success"
                    : finalSummary.pass_fail_status === "FAIL"
                      ? "destructive"
                      : "default"
                  : "default",
            },
          ]}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadPortal({ force: true })}
              disabled={loading}
              className="shrink-0 rounded-sm font-mono text-xs uppercase"
            >
              <RotateCcw
                className={cn("mr-1.5 size-3.5", loading && "animate-spin")}
              />
              Refresh
            </Button>
          }
        />
      )}

      {/* Student & Academic Year Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-card px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {isStaff ? (
            <>
              <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Eye className="size-3.5 text-foreground" />
                ADMIN PREVIEW // STUDENT:
              </span>
              <Select
                value={selectedStudentId}
                onValueChange={(val) => {
                  if (val) setSelectedStudentId(val)
                }}
              >
                <SelectTrigger className="h-8 w-full min-w-[240px] shrink-0 rounded-sm border-border bg-background font-mono text-xs sm:w-[270px]">
                  <span className="truncate">
                    {student
                      ? `${formatStudentIdentifier(student.student_code ?? student.unique_code, student.id)} · ${student.name}${
                          student.class_labels.length > 0
                            ? ` (${student.class_labels.join(", ")})`
                            : ""
                        }`
                      : "Select student to preview..."}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {accessibleStudents.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)} className="font-mono text-xs">
                      {formatStudentIdentifier(s.student_code ?? s.unique_code, s.id)} · {s.name}
                      {s.class_labels.length > 0
                        ? ` (${s.class_labels.join(", ")})`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : accessibleStudents.length > 1 ? (
            <>
              <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <UserCheck className="size-3.5 text-foreground" />
                LINKED CHILDREN:
              </span>
              <div className="inline-flex flex-wrap items-center gap-1 rounded-[2px] border border-border bg-muted/40 p-0.5">
                {accessibleStudents.map((child) => {
                  const active = student?.id === child.id
                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => setSelectedStudentId(String(child.id))}
                      className={cn(
                        "shrink-0 whitespace-nowrap rounded-[2px] px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors",
                        active
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {formatStudentIdentifier(child.student_code ?? child.unique_code, child.id)} · {child.name}
                    </button>
                  )
                })}
              </div>
            </>
          ) : student ? (
            <div className="flex flex-wrap items-center gap-2">
              <CodeChip accent>
                {formatStudentIdentifier(student.student_code ?? student.unique_code, student.id)}
              </CodeChip>
              <span className="text-xs font-semibold text-foreground">
                {student.name}
              </span>
              {student.class_labels.map((lbl) => (
                <CodeChip key={lbl}>{lbl}</CodeChip>
              ))}
            </div>
          ) : (
            <span className="font-mono text-xs text-muted-foreground">
              NO LINKED STUDENT RECORD
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="shrink-0 whitespace-nowrap font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            ACADEMIC YEAR:
          </span>
          <Select
            value={selectedYearId}
            onValueChange={(val) => {
              if (val) setSelectedYearId(val)
            }}
          >
            <SelectTrigger className="h-8 w-44 shrink-0 rounded-sm border-border bg-background font-mono text-xs">
              <span className="truncate">
                {data?.selected_academic_year?.name ?? "Select Academic Year"}
              </span>
            </SelectTrigger>
            <SelectContent>
              {(data?.academic_years ?? []).map((yr) => (
                <SelectItem key={yr.id} value={String(yr.id)} className="font-mono text-xs">
                  {yr.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {embedded && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => void loadPortal({ force: true })}
              disabled={loading}
              className="h-8 shrink-0 rounded-sm font-mono text-[11px] uppercase"
            >
              <RotateCcw
                className={cn("mr-1 size-3", loading && "animate-spin")}
              />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Policy / Scope Banner */}
      <div className="flex items-start gap-2.5 rounded-sm border border-border bg-muted/25 px-3.5 py-2.5 font-mono text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-foreground" />
        <div className="leading-relaxed">
          <span className="font-semibold uppercase tracking-wider text-foreground">
            {data?.is_admin_preview ? "Parent Portal Preview Mode:" : "Parent Portal Scope:"}
          </span>{" "}
          Displays only{" "}
          <span className="font-semibold text-foreground">
            {student
              ? `${student.name} (${formatStudentIdentifier(student.student_code ?? student.unique_code, student.id)})`
              : "the selected child"}
          </span>
          &apos;s enrolled subjects and formal Midterm / Final Term assessments. Exam schedules remain
          visible ahead of results release; marks appear once the administration publishes each term.
        </div>
      </div>

      {loading && !data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="h-32 w-full rounded-sm border border-border skeleton-shimmer" />
            <div className="h-32 w-full rounded-sm border border-border skeleton-shimmer" />
          </div>
          <div className="h-64 w-full rounded-sm border border-border skeleton-shimmer" />
        </div>
      )}

      {!loading && !student && (
        <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border bg-card px-6 py-12 text-center">
          <AlertTriangle className="mb-2 size-6 text-warning" />
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
            No Student Linked To This Account
          </p>
          <p className="mt-1.5 max-w-md text-xs text-muted-foreground">
            No students linked to this parent account yet. Ask an administrator to link your account under Users → Match parents.
          </p>
        </div>
      )}

      {/* Term Summary Comparison Cards */}
      {student && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {[
            { label: "TERM 01 // MIDTERM", summary: midtermSummary },
            { label: "TERM 02 // FINAL TERM", summary: finalSummary },
          ].map(({ label, summary }) => {
            const unpublished =
              summary && !summary.is_published && !isAdminPreview
            return (
              <div
                key={label}
                className="rounded-sm border border-border bg-card p-3.5 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-1.5 shrink-0 rounded-[1px] bg-primary" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                      {label}
                    </span>
                  </div>
                  {summary ? (
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <TelemetryTag status={summary.is_published ? "present" : "neutral"}>
                        {summary.is_published ? "PUBLISHED" : "UNPUBLISHED"}
                      </TelemetryTag>
                      {!unpublished && summary.pass_fail_status !== "UNPUBLISHED" && (
                        <TelemetryTag status={statusToTelemetry(summary.pass_fail_status)}>
                          {summary.pass_fail_status}
                        </TelemetryTag>
                      )}
                    </div>
                  ) : (
                    <TelemetryTag status="neutral" className="shrink-0">
                      NOT CONFIGURED
                    </TelemetryTag>
                  )}
                </div>

                {unpublished ? (
                  <div className="flex items-center gap-2 py-2 font-mono text-xs text-muted-foreground">
                    <Lock className="size-3.5 shrink-0" />
                    <span>
                      Results are currently withheld pending school publication.
                    </span>
                  </div>
                ) : summary ? (
                  <div className="grid grid-cols-2 gap-3 pt-0.5 sm:grid-cols-4">
                    <div className="min-w-0">
                      <div className="whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        TOTAL MARKS
                      </div>
                      <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-foreground">
                        {summary.total_marks_obtained ?? "—"}
                        {summary.total_max_marks ? ` / ${summary.total_max_marks}` : ""}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        AVERAGE %
                      </div>
                      <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-foreground">
                        {summary.average_percentage != null
                          ? `${summary.average_percentage}%`
                          : "—"}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        GRADE
                      </div>
                      <div className="mt-0.5">
                        <CodeChip accent>{summary.letter_grade ?? "—"}</CodeChip>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        CLASS RANK
                      </div>
                      <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-foreground">
                        {summary.class_rank != null
                          ? `#${summary.class_rank}${summary.cohort_size ? ` / ${summary.cohort_size}` : ""}`
                          : "—"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="font-mono text-xs text-muted-foreground">
                    No academic year selected.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Side-by-Side Midterm vs Final Term Comparison Table */}
      {student && (
        <DataModule
          searchPlaceholder="Filter enrolled subjects..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          toolbarRight={
            <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <GraduationCap className="size-3.5 shrink-0 text-foreground" />
              <span className="whitespace-nowrap">MIDTERM VS. FINAL TERM COMPARISON</span>
            </div>
          }
          totalCount={filteredComparison.length}
          countLabel="ENROLLED SUBJECTS"
        >
          <div
            ref={comparisonScroll.topBarRef}
            onScroll={comparisonScroll.onTopScroll}
            className="w-full max-w-full overflow-x-auto overflow-y-hidden custom-scrollbar h-3 border-b border-zinc-800/80 bg-zinc-950/80"
          >
            <div style={{ width: `${comparisonScroll.trackWidth}px`, height: "1px" }} />
          </div>

          <div
            ref={comparisonScroll.containerRef}
            onScroll={comparisonScroll.onMainScroll}
            className="w-full max-w-full max-h-[62vh] overflow-auto custom-scrollbar relative"
          >
            <Table noWrapper className="min-w-[900px]">
            <TableHeader className="sticky top-0 z-20 bg-zinc-950 border-b border-zinc-800">
              <TableRow className="h-9 bg-zinc-950 hover:bg-zinc-950">
                <TableHead className="px-3.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Subject
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Cohort
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Midterm Marks & Grade
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Midterm Status
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Final Term Marks & Grade
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Final Status
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Term Delta
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Teacher Remarks
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i} className="h-11">
                    <TableCell colSpan={8} className="px-3.5">
                      <div className="h-4 w-full rounded-sm skeleton-shimmer" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredComparison.length === 0 ? (
                <TableRow className="h-24">
                  <TableCell
                    colSpan={8}
                    className="text-center font-mono text-xs text-muted-foreground"
                  >
                    No enrolled subjects or exam records found for this academic year.
                  </TableCell>
                </TableRow>
              ) : (
                filteredComparison.map((row) => {
                  const midVisible = Boolean(row.midterm && (row.midterm.is_published || isAdminPreview))
                  const finVisible = Boolean(row.final_term && (row.final_term.is_published || isAdminPreview))
                  const midStatus: ExamPassFailStatus | null = row.midterm
                    ? midVisible
                      ? row.midterm.status
                      : "UNPUBLISHED"
                    : null
                  const finStatus: ExamPassFailStatus | null = row.final_term
                    ? finVisible
                      ? row.final_term.status
                      : "UNPUBLISHED"
                    : null
                  const deltaNum =
                    midVisible &&
                    finVisible &&
                    row.delta_percentage != null
                      ? Number(row.delta_percentage)
                      : null
                  const remarkText =
                    (finVisible ? row.final_term?.remarks : "") ||
                    (midVisible ? row.midterm?.remarks : "") ||
                    "—"

                  return (
                    <TableRow
                      key={`${row.class_id}-${row.subject_id}`}
                      className="h-11 hover:bg-muted/30"
                    >
                      <TableCell className="px-3.5 text-xs font-semibold text-foreground">
                        {row.subject_name}
                      </TableCell>
                      <TableCell>
                        <CodeChip>{row.cohort_label}</CodeChip>
                      </TableCell>
                      <TableCell>
                        {renderTermCell(row.midterm, isAdminPreview)}
                      </TableCell>
                      <TableCell>
                        {midStatus ? (
                          <TelemetryTag status={statusToTelemetry(midStatus)}>
                            {midStatus}
                          </TelemetryTag>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {renderTermCell(row.final_term, isAdminPreview)}
                      </TableCell>
                      <TableCell>
                        {finStatus ? (
                          <TelemetryTag status={statusToTelemetry(finStatus)}>
                            {finStatus}
                          </TelemetryTag>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {deltaNum === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : deltaNum > 0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-success">
                            <ArrowUpRight className="size-3.5" />+{deltaNum.toFixed(2)}%
                          </span>
                        ) : deltaNum < 0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-destructive">
                            <ArrowDownRight className="size-3.5" />{deltaNum.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Minus className="size-3" />0.00%
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">
                        {remarkText}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          </div>
        </DataModule>
      )}

      {/* Exam Schedule for Enrolled Subjects */}
      {student && (
        <DataModule
          filters={
            <div className="inline-flex shrink-0 items-center gap-0.5 rounded-[2px] border border-border bg-muted/40 p-0.5">
              {(
                [
                  { id: "ALL", label: "ALL EXAMS" },
                  { id: "midterm", label: "MIDTERM" },
                  { id: "final", label: "FINAL TERM" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setScheduleTermFilter(opt.id)}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-[2px] px-2 py-0.5 font-mono text-[11px] font-semibold uppercase transition-colors",
                    scheduleTermFilter === opt.id
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          }
          toolbarRight={
            <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <Calendar className="size-3.5 shrink-0 text-foreground" />
              <span className="whitespace-nowrap">PERSONAL EXAM TIMETABLE</span>
            </div>
          }
          totalCount={filteredSchedule.length}
          countLabel="SCHEDULED EXAMS"
        >
          <div
            ref={timetableScroll.topBarRef}
            onScroll={timetableScroll.onTopScroll}
            className="w-full max-w-full overflow-x-auto overflow-y-hidden custom-scrollbar h-3 border-b border-zinc-800/80 bg-zinc-950/80"
          >
            <div style={{ width: `${timetableScroll.trackWidth}px`, height: "1px" }} />
          </div>

          <div
            ref={timetableScroll.containerRef}
            onScroll={timetableScroll.onMainScroll}
            className="w-full max-w-full max-h-[62vh] overflow-auto custom-scrollbar relative"
          >
            <Table noWrapper className="min-w-[900px]">
            <TableHeader className="sticky top-0 z-20 bg-zinc-950 border-b border-zinc-800">
              <TableRow className="h-9 bg-zinc-950 hover:bg-zinc-950">
                <TableHead className="px-3.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Exam Date
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Time Window
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Term
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Subject
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Cohort
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Room
                </TableHead>
                <TableHead className="text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Max / Pass
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i} className="h-10">
                    <TableCell colSpan={7} className="px-3.5">
                      <div className="h-4 w-full rounded-sm skeleton-shimmer" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredSchedule.length === 0 ? (
                <TableRow className="h-20">
                  <TableCell
                    colSpan={7}
                    className="text-center font-mono text-xs text-muted-foreground"
                  >
                    No exams scheduled for the selected filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSchedule.map((exam) => (
                  <TableRow key={exam.id} className="h-10 hover:bg-muted/30">
                    <TableCell className="px-3.5 font-mono text-xs font-semibold tabular-nums text-foreground">
                      {exam.exam_date}
                    </TableCell>
                    <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                      {exam.start_time} – {exam.end_time}
                    </TableCell>
                    <TableCell>
                      <TelemetryTag
                        status={exam.term_type === "midterm" ? "info" : "active"}
                      >
                        {exam.term_name}
                      </TelemetryTag>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">
                      {exam.subject_name}
                    </TableCell>
                    <TableCell>
                      <CodeChip>{exam.cohort_label}</CodeChip>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {exam.room || "TBA"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                      {exam.max_marks} / {exam.pass_marks}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </DataModule>
      )}
    </div>
  )
}
