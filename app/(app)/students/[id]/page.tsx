"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import QRCode from "qrcode"
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Download,
  Loader2,
  Monitor,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  ShieldOff,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { createApi, ApiError } from "@/lib/api"
import { ATTENDANCE_STATUS_COLORS, CAMPUS_CHECKIN_COLOR } from "@/lib/chart-colors"
import { formatClassLabel } from "@/lib/format-class"
import {
  SCHOOL_CODES,
  type Class,
  type ClassStudent,
  type Student,
  type StudentAnalyticsRange,
  type StudentAttendanceSummary,
  type StudentPayload,
} from "@/lib/types"
import { cn } from "@/lib/utils"
import { RequireRole } from "@/components/require-role"
import { SearchableSelect } from "@/components/searchable-select"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { AttendanceOverviewSkeleton, StudentDetailPageSkeleton } from "@/components/page-skeletons"

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

function QrCanvas({ value, size = 180 }: { value: string; size?: number }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  React.useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 2 })
    }
  }, [value, size])
  return <canvas ref={canvasRef} width={size} height={size} className="rounded-lg border bg-background" />
}

function formatPercent(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return "—"
  return `${Math.round(rate * 100)}%`
}

function shortDate(iso: string): string {
  const d = new Date(iso + "T12:00:00")
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function StudentDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const studentId = Number(params.id)

  const [student, setStudent] = React.useState<Student | null>(null)
  const [enrollments, setEnrollments] = React.useState<ClassStudent[]>([])
  const [allClasses, setAllClasses] = React.useState<Class[]>([])
  const [summary, setSummary] = React.useState<StudentAttendanceSummary | null>(null)
  const [range, setRange] = React.useState<StudentAnalyticsRange>("month")

  const [loading, setLoading] = React.useState(true)
  const [summaryLoading, setSummaryLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const [editOpen, setEditOpen] = React.useState(false)
  const [editSaving, setEditSaving] = React.useState(false)
  const [formName, setFormName] = React.useState("")
  const [formDob, setFormDob] = React.useState("")
  const [formContact, setFormContact] = React.useState("")
  const [formSchool, setFormSchool] = React.useState("")
  const [formUci, setFormUci] = React.useState("")

  const [enrollClassId, setEnrollClassId] = React.useState("")
  const [enrolling, setEnrolling] = React.useState(false)
  const [unenrollingId, setUnenrollingId] = React.useState<number | null>(null)

  const [qrLoading, setQrLoading] = React.useState(false)
  const [tokenLoading, setTokenLoading] = React.useState(false)

  const flashSuccess = React.useCallback((msg: string) => {
    setSuccess(msg)
    window.setTimeout(() => setSuccess(null), 3500)
  }, [])

  const loadCore = React.useCallback(async () => {
    if (!isSignedIn || !Number.isFinite(studentId)) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const [studentRes, enrollmentRes, classesRes] = await Promise.all([
        api.getStudent(studentId),
        api.listClassStudentsPage({ student_id: studentId, page_size: 200 }),
        api.listClasses(),
      ])
      setStudent(studentRes)
      setEnrollments(enrollmentRes.results)
      setAllClasses(classesRes)
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to load student")
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn, studentId])

  const loadSummary = React.useCallback(async () => {
    if (!isSignedIn || !Number.isFinite(studentId)) return
    setSummaryLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const data = await api.getStudentAttendanceSummary(studentId, range)
      setSummary(data)
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to load analytics")
    } finally {
      setSummaryLoading(false)
    }
  }, [getToken, isSignedIn, studentId, range])

  React.useEffect(() => {
    if (isLoaded && isSignedIn) void loadCore()
  }, [isLoaded, isSignedIn, loadCore])

  React.useEffect(() => {
    if (isLoaded && isSignedIn && student) void loadSummary()
  }, [isLoaded, isSignedIn, student, loadSummary])

  const openEdit = () => {
    if (!student) return
    setFormName(student.name)
    setFormDob(student.dob ?? "")
    setFormContact(student.contact ?? "")
    setFormSchool(student.school_code)
    setFormUci(student.exam_candidate_number ?? "")
    setEditOpen(true)
  }

  const saveProfile = async () => {
    if (!student) return
    setEditSaving(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const payload: StudentPayload = {
        name: formName.trim(),
        school_code: formSchool,
        dob: formDob || null,
        contact: formContact.trim() || null,
        exam_candidate_number: formUci.trim() || null,
      }
      const updated = await createApi(token).updateStudent(student.id, payload)
      setStudent(updated)
      setEditOpen(false)
      flashSuccess("Profile updated.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setEditSaving(false)
    }
  }

  const handleEnroll = async () => {
    if (!student || !enrollClassId) return
    setEnrolling(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const entry = await createApi(token).createClassStudent(Number(enrollClassId), student.id)
      setEnrollments((prev) => [...prev, entry])
      setEnrollClassId("")
      flashSuccess("Enrolled in class.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to enroll")
    } finally {
      setEnrolling(false)
    }
  }

  const handleUnenroll = async (classStudentId: number) => {
    setUnenrollingId(classStudentId)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      await createApi(token).deleteClassStudent(classStudentId)
      setEnrollments((prev) => prev.filter((e) => e.id !== classStudentId))
      flashSuccess("Removed from class.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to unenroll")
    } finally {
      setUnenrollingId(null)
    }
  }

  const refreshQrToken = async () => {
    if (!student) return
    setTokenLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const res = await createApi(token).regenerateCheckInToken(student.id)
      setStudent((prev) =>
        prev
          ? {
              ...prev,
              check_in_token: res.check_in_token,
              check_in_token_active: res.check_in_token_active ?? true,
            }
          : null
      )
      flashSuccess("QR token regenerated.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to regenerate token")
    } finally {
      setTokenLoading(false)
    }
  }

  const toggleQrActive = async (activate: boolean) => {
    if (!student) return
    setQrLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const res = activate
        ? await api.activateCheckInToken(student.id)
        : await api.deactivateCheckInToken(student.id)
      setStudent((prev) => (prev ? { ...prev, check_in_token_active: res.check_in_token_active } : null))
      flashSuccess(activate ? "QR check-in activated." : "QR check-in deactivated.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to update QR status")
    } finally {
      setQrLoading(false)
    }
  }

  const enrolledClassIds = React.useMemo(
    () =>
      new Set(
        enrollments.map((e) =>
          typeof e.class_obj === "object" && e.class_obj ? e.class_obj.id : e.class_obj_id ?? 0
        )
      ),
    [enrollments]
  )

  const classOptions = React.useMemo(
    () =>
      allClasses
        .filter((c) => !enrolledClassIds.has(c.id))
        .map((c) => ({ value: String(c.id), label: formatClassLabel(c) })),
    [allClasses, enrolledClassIds]
  )

  const campusChartData = React.useMemo(() => {
    if (!summary) return []
    return summary.campus.daily.map((d) => ({
      date: shortDate(d.date),
      present: d.checked_in ? 1 : 0,
    }))
  }, [summary])

  const lessonStatusData = React.useMemo(() => {
    if (!summary) return []
    return summary.lesson.by_status.map((s) => ({
      name: LESSON_STATUS_LABELS[s.status] ?? s.status,
      value: s.count,
      status: s.status,
    }))
  }, [summary])

  const filteredLessonStatusData = React.useMemo(
    () => lessonStatusData.filter((d) => d.value > 0),
    [lessonStatusData]
  )

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
        Please sign in to view this student.
      </div>
    )
  }

  if (!Number.isFinite(studentId)) {
    return (
      <div className="container mx-auto max-w-3xl py-16 text-center">
        <p className="text-muted-foreground">Invalid student id.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 md:py-8 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/students/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 h-8 w-fit gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          )}
        >
          <ArrowLeft className="size-3.5" />
          Back to Students
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground">
          {success}
        </div>
      )}

      {loading ? (
        <StudentDetailPageSkeleton />
      ) : !student ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <User />
            </EmptyMedia>
            <EmptyTitle>Student not found</EmptyTitle>
            <EmptyDescription>This student may have been removed.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={() => router.push("/students/")}>
            Back to Students
          </Button>
        </Empty>
      ) : (
        <>
          {/* Identity */}
          <Card className="overflow-hidden border-border/80">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3 min-w-0">
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
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{student.name}</h1>
                  <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Enrolled</dt>
                      <dd className="font-medium">{student.enrollment_date}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Date of birth</dt>
                      <dd className="font-medium">{student.dob ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Contact</dt>
                      <dd className="font-medium break-words">{student.contact ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">UCI</dt>
                      <dd className="font-medium">{student.exam_candidate_number ?? "—"}</dd>
                    </div>
                  </dl>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={openEdit}>
                  <Pencil className="size-4" />
                  Edit profile
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Enrollments */}
            <Card className="lg:col-span-2 border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="size-5 text-muted-foreground" />
                  Enrolled classes
                </CardTitle>
                <CardDescription>Cohorts this student belongs to.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {enrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not enrolled in any class yet.</p>
                ) : (
                  <ul className="divide-y rounded-xl border">
                    {enrollments.map((entry) => {
                      const cls =
                        typeof entry.class_obj === "object" && entry.class_obj
                          ? (entry.class_obj as Class)
                          : allClasses.find((c) => c.id === entry.class_obj_id)
                      const label = cls ? formatClassLabel(cls) : `Class #${entry.class_obj_id ?? "?"}`
                      return (
                        <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div>
                            <p className="font-medium">{label}</p>
                            {cls && (
                              <Link
                                href={`/classes/`}
                                className="text-xs text-muted-foreground hover:text-primary"
                              >
                                View in classes
                              </Link>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            disabled={unenrollingId === entry.id}
                            onClick={() => void handleUnenroll(entry.id)}
                            aria-label={`Remove from ${label}`}
                          >
                            {unenrollingId === entry.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs text-muted-foreground mb-1.5 block">Add to class</label>
                    <SearchableSelect
                      options={classOptions}
                      value={enrollClassId}
                      onValueChange={setEnrollClassId}
                      placeholder="Select class…"
                      searchPlaceholder="Search classes…"
                    />
                  </div>
                  <Button
                    className="gap-1.5 shrink-0"
                    disabled={!enrollClassId || enrolling}
                    onClick={() => void handleEnroll()}
                  >
                    {enrolling ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Enroll
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* QR */}
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <QrCode className="size-5 text-muted-foreground" />
                  Campus QR
                </CardTitle>
                <CardDescription>Check-in token for terminal scanning.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {student.check_in_token ? (
                  <div className="flex flex-col items-center gap-3">
                    <QrCanvas value={student.check_in_token} />
                    <p className="text-[10px] font-mono text-muted-foreground break-all text-center max-w-full px-2">
                      {student.check_in_token}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No token on file.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 flex-1"
                    disabled={tokenLoading}
                    onClick={() => void refreshQrToken()}
                  >
                    {tokenLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Regenerate
                  </Button>
                  {student.check_in_token_active === false ? (
                    <Button
                      size="sm"
                      className="gap-1.5 flex-1"
                      disabled={qrLoading}
                      onClick={() => void toggleQrActive(true)}
                    >
                      {qrLoading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                      Activate
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1.5 flex-1"
                      disabled={qrLoading}
                      onClick={() => void toggleQrActive(false)}
                    >
                      {qrLoading ? <Loader2 className="size-4 animate-spin" /> : <ShieldOff className="size-4" />}
                      Deactivate
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-1.5"
                  disabled={!student.check_in_token}
                  onClick={() => {
                    const canvas = document.querySelector("canvas")
                    if (!canvas || !student) return
                    const link = document.createElement("a")
                    link.download = `check-in-${student.unique_code}.png`
                    link.href = canvas.toDataURL("image/png")
                    link.click()
                  }}
                >
                  <Download className="size-4" />
                  Download QR
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Analytics */}
          <Card className="border-border/80">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarDays className="size-5 text-muted-foreground" />
                  Attendance overview
                </CardTitle>
                <CardDescription>
                  Campus presence and lesson roll are measured separately.
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
                <div className="grid gap-8 xl:grid-cols-2">
                  {/* Campus */}
                  <section className="space-y-4">
                    <div>
                      <h3 className="font-semibold">Campus check-in</h3>
                      <p className="text-xs text-muted-foreground">On-site presence each day.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border bg-muted/30 p-4">
                        <p className="text-2xl font-bold">{summary.campus.days_checked_in}</p>
                        <p className="text-xs text-muted-foreground">days checked in</p>
                      </div>
                      <div className="rounded-xl border bg-muted/30 p-4">
                        <p className="text-2xl font-bold">{formatPercent(summary.campus.rate)}</p>
                        <p className="text-xs text-muted-foreground">of {summary.campus.days_in_range} days</p>
                      </div>
                    </div>
                    <Progress value={(summary.campus.rate ?? 0) * 100} className="w-full">
                      <div className="flex w-full items-center justify-between text-xs">
                        <ProgressLabel>Campus presence</ProgressLabel>
                        <ProgressValue />
                      </div>
                    </Progress>
                    <div className="h-48 w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={campusChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                          <YAxis allowDecimals={false} domain={[0, 1]} tick={{ fontSize: 10 }} />
                          <Tooltip
                            formatter={(v) => (Number(v) ? "Checked in" : "Missing")}
                            contentStyle={{ borderRadius: 12, fontSize: 12 }}
                          />
                          <Bar dataKey="present" fill={CAMPUS_CHECKIN_COLOR} radius={[4, 4, 0, 0]} name="Campus" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  {/* Lesson roll */}
                  <section className="space-y-4">
                    <div>
                      <h3 className="font-semibold">Lesson roll</h3>
                      <p className="text-xs text-muted-foreground">
                        Class sessions — may include auto-mark from campus check-in.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {(["present", "late", "absent", "excused"] as const).map((key) => (
                        <div
                          key={key}
                          className="rounded-xl border bg-muted/30 p-3 text-center"
                          style={{ borderColor: `color-mix(in oklch, ${ATTENDANCE_STATUS_COLORS[key]} 35%, transparent)` }}
                        >
                          <p className="text-xl font-bold" style={{ color: ATTENDANCE_STATUS_COLORS[key] }}>
                            {summary.lesson[key]}
                          </p>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{LESSON_STATUS_LABELS[key]}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Attended rate:{" "}
                      <span className="font-semibold text-foreground">
                        {formatPercent(summary.lesson.rate_attended)}
                      </span>{" "}
                      ({summary.lesson.present + summary.lesson.late} of{" "}
                      {summary.lesson.total_sessions - summary.lesson.excused} countable sessions)
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="h-44 min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={filteredLessonStatusData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={64}
                              paddingAngle={2}
                            >
                              {filteredLessonStatusData.map((entry) => (
                                <Cell
                                  key={entry.status}
                                  fill={ATTENDANCE_STATUS_COLORS[entry.status as keyof typeof ATTENDANCE_STATUS_COLORS]}
                                />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {lessonClassData.length > 0 && (
                        <div className="h-44 min-w-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={lessonClassData} layout="vertical" margin={{ left: 8, right: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                              <XAxis type="number" tick={{ fontSize: 10 }} />
                              <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 9 }} />
                              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                              <Legend wrapperStyle={{ fontSize: 10 }} />
                              <Bar dataKey="present" stackId="a" fill={ATTENDANCE_STATUS_COLORS.present} name="Present" />
                              <Bar dataKey="late" stackId="a" fill={ATTENDANCE_STATUS_COLORS.late} name="Late" />
                              <Bar dataKey="absent" stackId="a" fill={ATTENDANCE_STATUS_COLORS.absent} name="Absent" />
                              <Bar dataKey="excused" stackId="a" fill={ATTENDANCE_STATUS_COLORS.excused} name="Excused" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </section>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground">
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
                        onClick={() => void loadSummary()}
                      >
                        <RotateCcw className={cn("size-3.5", summaryLoading && "animate-spin")} />
                        Refresh
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => router.push("/check-in/terminal/")}
                      >
                        <Monitor className="size-3.5" />
                        Open terminal
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent onClose={() => setEditOpen(false)}>
          <DialogHeader>
            <DialogTitle>Edit student</DialogTitle>
            <DialogDescription>Update profile fields for {student?.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <label htmlFor="edit-name" className="text-sm font-medium">Name</label>
              <Input id="edit-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="edit-dob" className="text-sm font-medium">Date of birth</label>
              <Input id="edit-dob" type="date" value={formDob} onChange={(e) => setFormDob(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="edit-contact" className="text-sm font-medium">Contact</label>
              <Input id="edit-contact" value={formContact} onChange={(e) => setFormContact(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">School</span>
              <Select value={formSchool} onValueChange={(v) => setFormSchool(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="School" />
                </SelectTrigger>
                <SelectContent>
                  {SCHOOL_CODES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="edit-uci" className="text-sm font-medium">UCI</label>
              <Input id="edit-uci" value={formUci} onChange={(e) => setFormUci(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>
              Cancel
            </Button>
            <Button onClick={() => void saveProfile()} disabled={editSaving || !formName.trim()}>
              {editSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function StudentDetailPage() {
  return (
    <RequireRole mode="staff">
      <StudentDetailContent />
    </RequireRole>
  )
}
