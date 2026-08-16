"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useAuth } from "@clerk/nextjs"
import {
  BookOpen,
  CalendarDays,
  Download,
  Loader2,
  QrCode,
  RotateCcw,
  User,
} from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { ATTENDANCE_STATUS_COLORS } from "@/lib/chart-colors"
import {
  type Student,
  type StudentAnalyticsRange,
  type StudentAttendanceSummary,
} from "@/lib/types"
import { downloadQrPng, qrDownloadFilename } from "@/lib/qr-download"
import { cn } from "@/lib/utils"
import { RequireRole } from "@/components/require-role"
import { QrCanvas } from "@/components/qr-canvas"
import { ChartChunkSkeleton } from "@/components/charts/chart-chunk-skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  AttendanceOverviewSkeleton,
  PageSkeleton,
  STUDENT_DETAIL_PAGE_LAYOUT,
} from "@/components/page-skeletons"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"

const StudentLessonCharts = dynamic(
  () =>
    import("@/components/charts/student-lesson-charts").then((m) => m.StudentLessonCharts),
  { ssr: false, loading: () => <ChartChunkSkeleton className="h-52 min-h-[13rem]" /> }
)

const RANGE_OPTIONS: { value: StudentAnalyticsRange; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "Since enrolled" },
]

const LESSON_STATUS_LABELS: Record<string, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  excused: "Excused",
}

function formatPercent(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return "—"
  return `${Math.round(rate * 100)}%`
}

function StudentPortalContent() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [student, setStudent] = React.useState<Student | null>(null)
  const [unlinked, setUnlinked] = React.useState(false)
  const [summary, setSummary] = React.useState<StudentAttendanceSummary | null>(null)
  const [range, setRange] = React.useState<StudentAnalyticsRange>("month")
  const [loading, setLoading] = React.useState(true)
  const [summaryLoading, setSummaryLoading] = React.useState(false)
  const [downloading, setDownloading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadStudent = React.useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setError(null)
    setUnlinked(false)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const data = await createApi(token).getMyStudent()
      setStudent(data)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setStudent(null)
        setUnlinked(true)
      } else if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to load your profile")
      }
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn])

  const loadSummary = React.useCallback(async () => {
    if (!isSignedIn || !student) return
    setSummaryLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const data = await createApi(token).getMyAttendanceSummary(range)
      setSummary(data)
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to load analytics")
    } finally {
      setSummaryLoading(false)
    }
  }, [getToken, isSignedIn, student, range])

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when auth is ready
    void loadStudent()
  }, [isLoaded, isSignedIn, loadStudent])

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn || !student) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch when range or student changes
    void loadSummary()
  }, [isLoaded, isSignedIn, student, range, loadSummary])

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

  const handleDownloadQr = async () => {
    if (!student?.check_in_token) return
    setDownloading(true)
    try {
      await downloadQrPng(student.check_in_token, qrDownloadFilename(student))
    } finally {
      setDownloading(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Please sign in to view your student page.
      </div>
    )
  }

  return (
    <StaggerContainer className="container mx-auto max-w-6xl px-4 py-6 md:py-8 space-y-6">
      {error ? (
        <StaggerItem>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        </StaggerItem>
      ) : null}

      {loading ? (
        <PageSkeleton blocks={STUDENT_DETAIL_PAGE_LAYOUT} />
      ) : unlinked ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <User />
            </EmptyMedia>
            <EmptyTitle>Account not matched yet</EmptyTitle>
            <EmptyDescription>
              Ask an administrator to match your login to your student record. You will see your QR
              code and attendance here after that.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : !student ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <User />
            </EmptyMedia>
            <EmptyTitle>Unable to load your profile</EmptyTitle>
            <EmptyDescription>Refresh the page or try again in a moment.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={() => void loadStudent()}>
            Retry
          </Button>
        </Empty>
      ) : (
        <>
          <Card className="overflow-hidden border-border/80">
            <CardContent className="p-6 md:p-8">
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
              <h1 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight">{student.name}</h1>
              <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Enrolled</dt>
                  <dd className="font-medium">{student.enrollment_date}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Date of birth</dt>
                  <dd className="font-medium">{student.dob ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Classes</dt>
                  <dd className="font-medium">
                    {student.class_labels?.length ? student.class_labels.join(", ") : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">UCI</dt>
                  <dd className="font-medium">{student.exam_candidate_number ?? "—"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="order-1 border-border/80 lg:order-2 lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <QrCode className="size-5 text-muted-foreground" />
                  Campus QR
                </CardTitle>
                <CardDescription>
                  Show this at the check-in terminal. Staff manage activation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {student.check_in_token ? (
                  <div className="flex flex-col items-center gap-3">
                    <QrCanvas value={student.check_in_token} />
                    {student.check_in_token_active === false ? (
                      <p className="text-xs text-destructive text-center">
                        This QR is inactive. Ask staff to turn it back on before scanning.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No token on file.</p>
                )}
                <Button
                  size="sm"
                  className="w-full gap-1.5"
                  disabled={!student.check_in_token || downloading}
                  onClick={() => void handleDownloadQr()}
                >
                  {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  Download QR
                </Button>
              </CardContent>
            </Card>

            <Card className="order-2 border-border/80 lg:order-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="size-5 text-muted-foreground" />
                  Enrolled classes
                </CardTitle>
                <CardDescription>Cohorts you belong to.</CardDescription>
              </CardHeader>
              <CardContent>
                {student.class_labels?.length ? (
                  <ul className="divide-y rounded-xl border">
                    {student.class_labels.map((label) => (
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
          </div>

          <Card className="border-border/80">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarDays className="size-5 text-muted-foreground" />
                  Attendance overview
                </CardTitle>
                <CardDescription>
                  Lesson roll is primary; campus check-in is supporting context only.
                  {summary && (
                    <span className="block mt-1 text-xs">
                      {summary.date_from} → {summary.date_to}
                    </span>
                  )}
                </CardDescription>
              </div>
              <Tabs value={range} onValueChange={(v) => setRange(v as StudentAnalyticsRange)}>
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
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        Campus check-in (supporting)
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        On-site presence — not the same as lesson roll.
                      </p>
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
                      <div className="rounded-lg border bg-background/60 p-3 sm:col-span-1 col-span-2">
                        <Progress value={(summary.campus.rate ?? 0) * 100} className="w-full mt-1">
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={summaryLoading}
                      onClick={() => void loadSummary()}
                    >
                      <RotateCcw className={cn("size-3.5", summaryLoading && "animate-spin")} />
                      Refresh
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </StaggerContainer>
  )
}

export default function StudentPortalPage() {
  return (
    <RequireRole mode="student">
      <StudentPortalContent />
    </RequireRole>
  )
}
