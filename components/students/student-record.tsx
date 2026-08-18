"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { BookOpen, CalendarDays, Download, Loader2, QrCode, RotateCcw } from "lucide-react"
import { ATTENDANCE_STATUS_COLORS } from "@/lib/chart-colors"
import { downloadQrPng, qrDownloadFilename } from "@/lib/qr-download"
import { cn } from "@/lib/utils"
import type { Student, StudentAnalyticsRange, StudentAttendanceSummary } from "@/lib/types"
import { QrCanvas } from "@/components/qr-canvas"
import { ChartChunkSkeleton } from "@/components/charts/chart-chunk-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AttendanceOverviewSkeleton } from "@/components/page-skeletons"

const StudentLessonCharts = dynamic(
  () =>
    import("@/components/charts/student-lesson-charts").then((m) => m.StudentLessonCharts),
  { ssr: false, loading: () => <ChartChunkSkeleton className="h-52 min-h-[13rem]" /> }
)

export const RANGE_OPTIONS: { value: StudentAnalyticsRange; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "Since enrolled" },
]

export const LESSON_STATUS_LABELS: Record<string, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  excused: "Excused",
}

export function formatPercent(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return "—"
  return `${Math.round(rate * 100)}%`
}

export function StudentIdentityCard({
  student,
  showContact = false,
  actions,
}: {
  student: Student
  showContact?: boolean
  actions?: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden border-border/80">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{student.school_code}</Badge>
              <Badge variant="outline" className="font-mono text-xs">
                {student.unique_code}
              </Badge>
              {student.check_in_token_active === false ? (
                <Badge variant="destructive">QR inactive</Badge>
              ) : (
                <Badge variant="success">QR active</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{student.name}</h1>
            <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Enrolled</dt>
                <dd className="font-medium">{student.enrollment_date}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Date of birth</dt>
                <dd className="font-medium">{student.dob ?? "—"}</dd>
              </div>
              {showContact ? (
                <div>
                  <dt className="text-muted-foreground">Contact</dt>
                  <dd className="break-words font-medium">{student.contact ?? "—"}</dd>
                </div>
              ) : (
                <div>
                  <dt className="text-muted-foreground">Classes</dt>
                  <dd className="font-medium">
                    {student.class_labels?.length ? student.class_labels.join(", ") : "—"}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">UCI</dt>
                <dd className="font-medium">{student.exam_candidate_number ?? "—"}</dd>
              </div>
            </dl>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function StudentClassLabelsCard({ labels }: { labels: string[] }) {
  return (
    <Card className="border-border/80 lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="size-5 text-muted-foreground" />
          Enrolled classes
        </CardTitle>
        <CardDescription>Cohorts you belong to.</CardDescription>
      </CardHeader>
      <CardContent>
        {labels.length ? (
          <ul className="divide-y rounded-xl border">
            {labels.map((label) => (
              <li key={label} className="px-4 py-3 font-medium">
                {label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Not enrolled in any class yet.</p>
        )}
      </CardContent>
    </Card>
  )
}

export function StudentQrCard({
  student,
  showSecret = false,
  actions,
}: {
  student: Student
  showSecret?: boolean
  actions?: React.ReactNode
}) {
  const [downloading, setDownloading] = React.useState(false)

  const handleDownload = async () => {
    if (!student.check_in_token) return
    setDownloading(true)
    try {
      await downloadQrPng(student.check_in_token, qrDownloadFilename(student))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <QrCode className="size-5 text-muted-foreground" />
          Campus QR
        </CardTitle>
        <CardDescription>
          {showSecret
            ? "Check-in token for terminal scanning."
            : "Show this at the check-in terminal. Staff manage activation."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {student.check_in_token ? (
          <div className="flex flex-col items-center gap-3">
            <QrCanvas value={student.check_in_token} />
            {showSecret ? (
              <p className="max-w-full break-all px-2 text-center font-mono text-[10px] text-muted-foreground">
                {student.check_in_token}
              </p>
            ) : student.check_in_token_active === false ? (
              <p className="text-center text-xs text-destructive">
                This QR is inactive. Ask staff to turn it back on before scanning.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No token on file.</p>
        )}
        {actions}
        <Button
          size="sm"
          className="w-full gap-1.5"
          disabled={!student.check_in_token || downloading}
          onClick={() => void handleDownload()}
        >
          {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Download QR
        </Button>
      </CardContent>
    </Card>
  )
}

export function StudentAttendanceOverview({
  summary,
  range,
  onRangeChange,
  summaryLoading,
  onRefresh,
  extraActions,
}: {
  summary: StudentAttendanceSummary | null
  range: StudentAnalyticsRange
  onRangeChange: (range: StudentAnalyticsRange) => void
  summaryLoading: boolean
  onRefresh: () => void
  extraActions?: React.ReactNode
}) {
  const filteredLessonStatusData = React.useMemo(() => {
    if (!summary) return []
    return summary.lesson.by_status
      .map((s) => ({
        name: LESSON_STATUS_LABELS[s.status] ?? s.status,
        value: s.count,
        status: s.status,
      }))
      .filter((d) => d.value > 0)
  }, [summary])

  const lessonClassData = React.useMemo(() => {
    if (!summary) return []
    return summary.lesson.by_class.map((c) => ({
      name: c.class_label,
      present: c.present,
      late: c.late,
      absent: c.absent,
      excused: c.excused,
    }))
  }, [summary])

  const lessonSubjectData = React.useMemo(() => {
    if (!summary?.lesson.by_subject?.length) return []
    return summary.lesson.by_subject.map((s) => ({
      name: s.subject_label,
      present: s.present,
      late: s.late,
      absent: s.absent,
      excused: s.excused,
    }))
  }, [summary])

  return (
    <Card className="border-border/80">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="size-5 text-muted-foreground" />
            Attendance overview
          </CardTitle>
          <CardDescription>
            Lesson roll is primary; campus check-in is supporting context only.
            {summary ? (
              <span className="mt-1 block text-xs">
                {summary.date_from} → {summary.date_to}
              </span>
            ) : null}
          </CardDescription>
        </div>
        <Tabs value={range} onValueChange={(v) => onRangeChange(v as StudentAnalyticsRange)}>
          <TabsList>
            {RANGE_OPTIONS.map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value} disabled={summaryLoading}>
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {summaryLoading ? (
          <AttendanceOverviewSkeleton />
        ) : !summary ? (
          <p className="text-sm text-muted-foreground">No analytics available.</p>
        ) : (
          <div className="space-y-8">
            <section className="space-y-4">
              <div>
                <h3 className="font-semibold">Lesson roll</h3>
                <p className="text-xs text-muted-foreground">
                  Present / late / absent / excused across class and ad-hoc sessions.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-xl border bg-muted/30 p-3 text-center">
                  <p className="text-xl font-bold">{formatPercent(summary.lesson.rate_attended)}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Attended</p>
                </div>
                {(["present", "late", "absent", "excused"] as const).map((key) => (
                  <div
                    key={key}
                    className="rounded-xl border bg-muted/30 p-3 text-center"
                    style={{
                      borderColor: `color-mix(in oklch, ${ATTENDANCE_STATUS_COLORS[key]} 35%, transparent)`,
                    }}
                  >
                    <p className="text-xl font-bold" style={{ color: ATTENDANCE_STATUS_COLORS[key] }}>
                      {summary.lesson[key]}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {LESSON_STATUS_LABELS[key]}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {summary.lesson.present + summary.lesson.late} of{" "}
                {summary.lesson.total_sessions - summary.lesson.excused} countable sessions
                {summary.lesson.total_sessions ? ` (${summary.lesson.total_sessions} total marks)` : ""}
              </p>
              <StudentLessonCharts
                statusData={filteredLessonStatusData}
                subjectData={lessonSubjectData}
                classData={lessonClassData}
                totalSessions={summary.lesson.total_sessions}
              />
            </section>

            <section className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">Campus check-in (supporting)</h3>
                <p className="text-xs text-muted-foreground">On-site presence — not the same as lesson roll.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-background/60 p-3">
                  <p className="text-lg font-bold">{summary.campus.days_checked_in}</p>
                  <p className="text-[10px] text-muted-foreground">days checked in</p>
                </div>
                <div className="rounded-lg border bg-background/60 p-3">
                  <p className="text-lg font-bold">{formatPercent(summary.campus.rate)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    of {summary.campus.days_in_range} days
                  </p>
                </div>
                <div className="col-span-2 rounded-lg border bg-background/60 p-3 sm:col-span-1">
                  <Progress value={(summary.campus.rate ?? 0) * 100} className="mt-1 w-full">
                    <div className="flex w-full items-center justify-between text-[10px]">
                      <ProgressLabel>Campus</ProgressLabel>
                      <ProgressValue />
                    </div>
                  </Progress>
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                <span>
                  {summary.date_from} → {summary.date_to}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={summaryLoading}
                  onClick={onRefresh}
                >
                  <RotateCcw className={cn("size-3.5", summaryLoading && "animate-spin")} />
                  Refresh
                </Button>
                {extraActions}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
