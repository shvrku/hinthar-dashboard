"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation"
import { SearchableSelect } from "@/components/searchable-select"
import { useAuth } from "@clerk/nextjs"
import {
  Loader2,
  Search,
  AlertCircle,
  RotateCcw,
  Calendar,
  CalendarCheck,
  BookOpen,
  GraduationCap,
  Users,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Percent,
  ChevronDown,
  CalendarOff,
  Clock,
  ArrowLeft,
} from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { toLocalDateString } from "@/lib/utils"
import {
  type Class,
  type Subject,
  type Teacher,
  type AttendanceMatrixSession,
  type AttendanceMatrixStudent,
  type SessionAttendance,
  type SessionAttendanceStatus,
} from "@/lib/types"
import { RequireRole } from "@/components/require-role"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { StandardPageHeader } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const LAST_CLASS_KEY = "hinthar.attendance.lastClassId"

// Helper to parse dates from backend API
function parseBackendDateTime(str: string): Date {
  if (!str) return new Date(NaN)
  if (str.includes("T") || str.includes("-")) {
    const d = new Date(str)
    if (!isNaN(d.getTime())) return d
  }
  const parts = str.split(" ")
  if (parts.length === 2) {
    const dateParts = parts[0].split("/")
    const timeParts = parts[1].split(":")
    if (dateParts.length === 3 && timeParts.length === 3) {
      const day = parseInt(dateParts[0], 10)
      const month = parseInt(dateParts[1], 10) - 1
      const year = parseInt(dateParts[2], 10) + 2000
      const hours = parseInt(timeParts[0], 10)
      const minutes = parseInt(timeParts[1], 10)
      const seconds = parseInt(timeParts[2], 10)

      const date = new Date(year, month, day, hours, minutes, seconds)
      if (!isNaN(date.getTime())) return date
    }
  }
  return new Date(str)
}

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
]

function getSessionStartTime(session: AttendanceMatrixSession): Date {
  if (session.date) {
    return new Date(`${session.date}T${session.start_time}`)
  }
  return parseBackendDateTime(session.start_time)
}

function formatSessionMeta(session: AttendanceMatrixSession) {
  const d = getSessionStartTime(session)
  return {
    subject: session.subject?.trim() || "—",
    teacher: session.teacher_name?.trim() || "—",
    dateStr: d.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" }),
    timeStr: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
  }
}

function getSelectStyles(status?: string): string {
  switch (status) {
    case "present":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 focus:ring-emerald-500/50 font-semibold"
    case "late":
      return "bg-emerald-500/10 text-emerald-700/80 dark:text-emerald-400/80 border-emerald-500/20 focus:ring-emerald-500/30 font-medium"
    case "absent":
      return "bg-muted text-muted-foreground border-border/80 focus:ring-ring font-medium"
    case "excused":
      return "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30 focus:ring-sky-500/40 font-medium"
    default:
      return "bg-card text-muted-foreground/70 border-border/50 focus:ring-ring/30 text-center font-normal"
  }
}

const statusItems = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "excused", label: "Excused" },
]

type RangeMode = "session" | "month" | "custom"
type ViewLayout = "matrix" | "roster"

function ClassAttendanceContent() {
  const params = useParams()
  const classId = String(params.classId)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { getToken, isLoaded, isSignedIn } = useAuth()

  // Base Options Metadata
  const [classes, setClasses] = React.useState<Class[]>([])
  const [subjects, setSubjects] = React.useState<Subject[]>([])
  const [teachers, setTeachers] = React.useState<Teacher[]>([])

  // Main Datasets
  const [students, setStudents] = React.useState<AttendanceMatrixStudent[]>([])
  const [sessions, setSessions] = React.useState<AttendanceMatrixSession[]>([])
  const [attendances, setAttendances] = React.useState<SessionAttendance[]>([])

  // UI state
  const [loading, setLoading] = React.useState(false)
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [editingCellKey, setEditingCellKey] = React.useState<string | null>(null)

  // Pending cell updates map: "studentId-sessionId" -> boolean
  const [pendingCells, setPendingCells] = React.useState<Record<string, boolean>>({})

  const [rosterSearch, setRosterSearch] = React.useState("")
  const [studentSearch, setStudentSearch] = React.useState("")

  // Hydration protection
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const todayStr = React.useMemo(() => toLocalDateString(), [])

  // ── Filters are derived from the URL search params (single source of truth) ──
  const dateParam = searchParams.get("date")
  const dateFromParam = searchParams.get("date_from")
  const dateToParam = searchParams.get("date_to")
  const monthParam = searchParams.get("month")
  const yearParam = searchParams.get("year")
  const subjectIdParam = searchParams.get("subject_id")
  const teacherIdParam = searchParams.get("teacher_id")
  const layoutParam = searchParams.get("layout")
  const sessionIdParam = searchParams.get("session_id")

  const rangeMode: RangeMode = dateParam
    ? "session"
    : dateFromParam && dateToParam
    ? "custom"
    : "month"

  const selectedDate = dateParam || todayStr
  const startDate = dateFromParam || todayStr
  const endDate = dateToParam || todayStr
  const selectedMonth = monthParam ? Number(monthParam) : currentMonth
  const selectedYear = yearParam ? Number(yearParam) : currentYear
  const selectedSubjectId = subjectIdParam || "all"
  const selectedTeacherId = teacherIdParam || "all"
  const viewLayout: ViewLayout = layoutParam === "roster" ? "roster" : "matrix"
  const rosterSessionId = sessionIdParam ? Number(sessionIdParam) : null

  // Merge partial updates into the current query string and navigate,
  // preserving the class-scoped pathname and any untouched params.
  const updateQuery = React.useCallback(
    (
      updates: Record<string, string | number | null | undefined>,
      mode: "push" | "replace" = "replace"
    ) => {
      const query = new URLSearchParams(searchParams.toString())
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === undefined || val === "") {
          query.delete(key)
        } else {
          query.set(key, String(val))
        }
      }
      const qs = query.toString()
      const href = `${pathname}${qs ? `?${qs}` : ""}`
      if (mode === "push") router.push(href)
      else router.replace(href)
    },
    [searchParams, pathname, router]
  )

  const handleClassChange = React.useCallback(
    (newClassId: string) => {
      if (!newClassId || newClassId === classId) return
      const qs = searchParams.toString()
      router.push(`/attendance/class/${newClassId}/${qs ? `?${qs}` : ""}`)
    },
    [classId, searchParams, router]
  )

  const goToAdHoc = React.useCallback(() => {
    router.push("/attendance/adhoc/")
  }, [router])

  const handleRangeModeChange = (mode: RangeMode) => {
    if (mode === rangeMode) return
    if (mode === "session") {
      updateQuery({ date: selectedDate, date_from: null, date_to: null, month: null, year: null })
    } else if (mode === "month") {
      updateQuery({ month: selectedMonth, year: selectedYear, date: null, date_from: null, date_to: null })
    } else {
      updateQuery({ date_from: startDate, date_to: endDate, date: null, month: null, year: null })
    }
  }

  // Robust Auth Token Fetcher with retry handling for Clerk token renewals
  const getAuthToken = React.useCallback(async (): Promise<string | null> => {
    if (!isLoaded || !isSignedIn) return null
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const token = await getToken()
        if (token) return token
      } catch {
        // ignore and retry
      }
      await new Promise((resolve) => setTimeout(resolve, 400))
    }
    return null
  }, [getToken, isLoaded, isSignedIn])

  // Prefetch filter dropdown options on mount
  const prefetchOptions = React.useCallback(async () => {
    if (!isLoaded || !isSignedIn) return
    try {
      const token = await getAuthToken()
      if (!token) return
      const api = createApi(token)
      const [classesData, subjectsData, teachersData] = await Promise.all([
        api.listClasses({ summary: "true" }),
        api.listSubjects({ summary: "true" }),
        api.listTeachers({ summary: "true" }),
      ])
      setClasses(classesData || [])
      setSubjects(subjectsData || [])
      setTeachers(teachersData || [])
    } catch {
      // silent options prefetch
    }
  }, [getAuthToken, isLoaded, isSignedIn])

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      prefetchOptions()
    }
  }, [isLoaded, isSignedIn, prefetchOptions])

  // Single-Pass Aggregated Ranged Matrix Data Fetcher (this class only)
  const loadData = React.useCallback(async () => {
    if (!isLoaded || !isSignedIn) return
    if (!classId) return
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      if (!token) {
        setLoading(false)
        return
      }
      const api = createApi(token)

      const filterParams: Record<string, string | number> = {}

      if (rangeMode === "session") {
        filterParams.date_from = selectedDate
        filterParams.date_to = selectedDate
      } else if (rangeMode === "custom") {
        filterParams.date_from = startDate
        filterParams.date_to = endDate
      } else {
        filterParams.month = selectedMonth
        filterParams.year = selectedYear
      }

      if (selectedSubjectId !== "all") filterParams.subject_id = selectedSubjectId
      if (selectedTeacherId !== "all") filterParams.teacher_id = selectedTeacherId
      filterParams.class_id = classId

      const matrixData = await api.getAttendanceMatrix(filterParams)

      setSessions(matrixData.sessions || [])
      setStudents(matrixData.students || [])
      setAttendances(matrixData.attendances || [])
      setLastLoaded(new Date().toLocaleTimeString())

      if (typeof window !== "undefined") {
        localStorage.setItem(LAST_CLASS_KEY, classId)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to fetch attendance matrix")
      }
    } finally {
      setLoading(false)
    }
  }, [
    getAuthToken,
    isLoaded,
    isSignedIn,
    classId,
    rangeMode,
    selectedDate,
    startDate,
    endDate,
    selectedMonth,
    selectedYear,
    selectedSubjectId,
    selectedTeacherId,
  ])

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadData()
    }
  }, [isLoaded, isSignedIn, loadData])

  // Filtered Students by search input
  const rowStudents = React.useMemo(() => {
    if (!studentSearch.trim()) return students
    const query = studentSearch.toLowerCase().trim()
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        (s.unique_code ?? "").toLowerCase().includes(query)
    )
  }, [students, studentSearch])

  // Auto-select first session for Roster view if needed, persisted to the URL
  React.useEffect(() => {
    if (viewLayout === "roster" && sessions.length > 0) {
      if (rosterSessionId === null || !sessions.some((s) => s.id === rosterSessionId)) {
        updateQuery({ session_id: sessions[0].id })
      }
    }
  }, [viewLayout, sessions, rosterSessionId, updateQuery])

  // Selected session object for Roster view
  const selectedRosterSession = React.useMemo(() => {
    if (!rosterSessionId) return null
    return sessions.find((s) => s.id === rosterSessionId) ?? null
  }, [sessions, rosterSessionId])

  // Fast O(1) Map lookups for attendance records to avoid O(N*M) array.find scans
  const attendanceMap = React.useMemo(() => {
    const map = new Map<string, SessionAttendance>()
    for (const a of attendances) {
      const sId = typeof a.student === "object" && a.student ? a.student.id : a.student_id ?? a.student
      const sessId = typeof a.session === "object" && a.session ? a.session.id : a.session_id ?? a.session
      map.set(`${sId}-${sessId}`, a)
    }
    return map
  }, [attendances])

  const getAttendanceRecord = React.useCallback(
    (studentId: number, sessionId: number) => attendanceMap.get(`${studentId}-${sessionId}`),
    [attendanceMap]
  )

  // Attendance Status Change Handler (with bulk upsert single-call efficiency)
  const handleStatusChange = async (studentId: number, sessionId: number, newStatus: SessionAttendanceStatus) => {
    const key = `${studentId}-${sessionId}`
    setPendingCells((prev) => ({ ...prev, [key]: true }))

    try {
      const token = await getAuthToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      await api.bulkUpsertSessionAttendances([
        {
          session_id: sessionId,
          student_id: studentId,
          status: newStatus,
        },
      ])
      setAttendances((prev) => {
        const idx = prev.findIndex((a) => {
          const sId = typeof a.student === "object" && a.student ? a.student.id : a.student_id ?? a.student
          const sessId = typeof a.session === "object" && a.session ? a.session.id : a.session_id ?? a.session
          return sId === studentId && sessId === sessionId
        })
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], status: newStatus }
          return updated
        }
        return [
          ...prev,
          {
            id: Date.now(),
            session: sessionId,
            session_id: sessionId,
            student: studentId,
            student_id: studentId,
            status: newStatus,
            remarks: null,
          },
        ]
      })
    } catch (err) {
      console.error(err)
      setError("Failed to save attendance record")
    } finally {
      setPendingCells((prev) => ({ ...prev, [key]: false }))
    }
  }

  // 1-Tap Quick Actions: Mark All Present / Mark All Absent for a session (in 1 single atomic HTTP call!)
  const handleBulkMarkSession = async (sessionId: number, targetStatus: SessionAttendanceStatus) => {
    if (rowStudents.length === 0) return
    setLoading(true)

    try {
      const token = await getAuthToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      const records = rowStudents.map((st) => ({
        session_id: sessionId,
        student_id: st.id,
        status: targetStatus,
      }))
      await api.bulkUpsertSessionAttendances(records)

      await loadData()
    } catch (err) {
      console.error(err)
      setError("Failed to batch update attendance")
    } finally {
      setLoading(false)
    }
  }

  // Metric Summaries
  const stats = React.useMemo(() => {
    let presentCount = 0
    let lateCount = 0
    let absentCount = 0
    let excusedCount = 0

    attendances.forEach((a) => {
      if (a.status === "present") presentCount++
      else if (a.status === "late") lateCount++
      else if (a.status === "absent") absentCount++
      else if (a.status === "excused") excusedCount++
    })

    // Excused leave is tracked but excluded from the attendance-rate denominator.
    const rateBase = presentCount + lateCount + absentCount
    const attendanceRate = rateBase > 0 ? Math.round(((presentCount + lateCount) / rateBase) * 100) : 0

    return {
      totalStudents: students.length,
      totalSessions: sessions.length,
      presentCount,
      lateCount,
      absentCount,
      excusedCount,
      attendanceRate,
    }
  }, [attendances, students, sessions])

  const currentClass = React.useMemo(
    () => classes.find((c) => c.id.toString() === classId) ?? null,
    [classes, classId]
  )

  const currentClassLabel = React.useMemo(() => {
    if (!currentClass) return null
    return (
      `${currentClass.education_level || ""} - ${currentClass.cohort_identifier || ""} ${
        currentClass.cohort_sub_category ? `(${currentClass.cohort_sub_category})` : ""
      }`.trim() || `Class #${currentClass.id}`
    )
  }, [currentClass])

  const classItems = React.useMemo(() => {
    return classes.map((c) => {
      const nameStr = `${c.education_level || ""} - ${c.cohort_identifier || ""} ${c.cohort_sub_category ? `(${c.cohort_sub_category})` : ""}`.trim() || `Class #${c.id}`
      return {
        value: c.id.toString(),
        label: nameStr,
      }
    })
  }, [classes])

  const subjectItems = React.useMemo(() => {
    const list = subjects.map((sub) => ({ value: sub.id.toString(), label: sub.name }))
    return [{ value: "all", label: "All Subjects" }, ...list]
  }, [subjects])

  const teacherItems = React.useMemo(() => {
    const list = teachers.map((t) => ({ value: t.id.toString(), label: t.name }))
    return [{ value: "all", label: "All Teachers" }, ...list]
  }, [teachers])

  const monthItems = React.useMemo(() => {
    return MONTHS.map((m) => ({ value: m.value.toString(), label: m.label }))
  }, [])

  const yearItems = React.useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((y) => ({
      value: y.toString(),
      label: y.toString(),
    }))
  }, [currentYear])

  const rosterSessionItems = React.useMemo(() => {
    return sessions.map((session) => {
      const { subject, teacher, dateStr, timeStr } = formatSessionMeta(session)
      return {
        value: session.id.toString(),
        label: `${subject} · ${teacher} · ${dateStr} (${timeStr})`,
      }
    })
  }, [sessions])

  if (!mounted || !isLoaded) {
    return (
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-7xl" suppressHydrationWarning>
        <div className="mb-8 h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="mb-6 h-4 w-72 animate-pulse rounded-lg bg-muted" />
        <div className="rounded-xl border border-border p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-full animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center" suppressHydrationWarning>
        <p className="text-muted-foreground font-medium">Please sign in to view the attendance dashboard.</p>
      </div>
    )
  }

  // Filtered roster students for Session Roster View
  const rosterStudentsFiltered = rowStudents.filter((s) =>
    s.name.toLowerCase().includes(rosterSearch.toLowerCase())
  )

  return (
    <StaggerContainer className="space-y-6">
      {/* Standard Header */}
      <StaggerItem>
        <StandardPageHeader
          title={currentClassLabel ? `Attendance • ${currentClassLabel}` : "Class Attendance"}
          description="View and log attendance with high-performance ranged query filters."
          secondaryAction={{
            label: lastLoaded ? "Refresh" : "Load Data",
            onClick: loadData,
            icon: <RotateCcw className={`size-4 ${loading ? "animate-spin" : ""}`} />,
          }}
        >
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => router.push("/attendance/")}>
            <ArrowLeft className="size-4" />
            Change class
          </Button>
        </StandardPageHeader>
      </StaggerItem>

      {/* Summary KPI Strip */}
      <StaggerItem>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-4 bg-card border-border/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Students</span>
              <Users className="size-4 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-foreground">{stats.totalStudents}</span>
              <span className="text-[11px] text-muted-foreground">{stats.totalSessions} Sessions</span>
            </div>
          </Card>

          <Card className="p-4 bg-card border-border/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Present</span>
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">{stats.presentCount}</span>
              <span className="text-[11px] text-muted-foreground">{stats.lateCount} Late</span>
            </div>
          </Card>

          <Card className="p-4 bg-card border-border/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Absent</span>
              <XCircle className="size-4 text-muted-foreground/70" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-muted-foreground">{stats.absentCount}</span>
              <span className="text-[11px] text-muted-foreground">{stats.excusedCount} Excused</span>
            </div>
          </Card>

          <Card className="p-4 bg-card border-border/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attendance Rate</span>
              <Percent className="size-4 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-foreground">{stats.attendanceRate}%</span>
              <span className="text-[11px] text-muted-foreground">Average</span>
            </div>
          </Card>
        </div>
      </StaggerItem>

      {/* Main Unified Control Bar */}
      <StaggerItem>
        <Card className="p-4 border-border/80 bg-card shadow-xs space-y-4">
        {/* Top Control Bar: Range/Layout Mode Switchers + Ad-Hoc shortcut */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 w-fit"
            onClick={goToAdHoc}
          >
            <BookOpen className="size-3.5" />
            <span>Ad-Hoc / Tutoring Sessions</span>
          </Button>

          {/* Right Group: Layout Mode & Date Range Mode Switchers */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Range Mode Switcher */}
            <div className="flex rounded-lg border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => handleRangeModeChange("session")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                  rangeMode === "session"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarCheck className="size-3 text-primary" />
                <span>Target Day</span>
              </button>
              <button
                type="button"
                onClick={() => handleRangeModeChange("month")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                  rangeMode === "month"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="size-3" />
                <span>Monthly</span>
              </button>
              <button
                type="button"
                onClick={() => handleRangeModeChange("custom")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                  rangeMode === "custom"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Clock className="size-3" />
                <span>Custom Range</span>
              </button>
            </div>

            {/* Layout View Switcher */}
            <div className="flex rounded-lg border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => updateQuery({ layout: "matrix" })}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  viewLayout === "matrix"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="size-3.5" />
                <span>Matrix Grid</span>
              </button>
              <button
                type="button"
                onClick={() => updateQuery({ layout: "roster" })}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  viewLayout === "roster"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="size-3.5" />
                <span>Session Roster</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {/* Class Filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <GraduationCap className="h-3 w-3" /> Class
            </label>
            <SearchableSelect
              options={classItems}
              value={classId}
              onValueChange={handleClassChange}
              placeholder="Select Class..."
              searchPlaceholder="Search class..."
            />
          </div>

          {/* Subject Filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <BookOpen className="h-3 w-3" /> Subject
            </label>
            <SearchableSelect
              options={subjectItems}
              value={selectedSubjectId}
              onValueChange={(val) => updateQuery({ subject_id: val === "all" ? null : val })}
              placeholder="Select Subject..."
              searchPlaceholder="Search subject..."
            />
          </div>

          {/* Teacher Filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Teacher
            </label>
            <SearchableSelect
              options={teacherItems}
              value={selectedTeacherId}
              onValueChange={(val) => updateQuery({ teacher_id: val === "all" ? null : val })}
              placeholder="Select Teacher..."
              searchPlaceholder="Search teacher..."
            />
          </div>

          {/* Date Selector depending on rangeMode */}
          {rangeMode === "session" ? (
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <CalendarCheck className="h-3 w-3 text-primary" /> Target Session Date
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => updateQuery({ date: e.target.value })}
                className="bg-background text-xs h-9 font-medium"
              />
            </div>
          ) : rangeMode === "month" ? (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Month
                </label>
                <SearchableSelect
                  options={monthItems}
                  value={selectedMonth.toString()}
                  onValueChange={(val) => updateQuery({ month: val })}
                  placeholder="Select Month..."
                  searchPlaceholder="Search month..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Year
                </label>
                <SearchableSelect
                  options={yearItems}
                  value={selectedYear.toString()}
                  onValueChange={(val) => updateQuery({ year: val })}
                  placeholder="Select Year..."
                  searchPlaceholder="Search year..."
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => updateQuery({ date_from: e.target.value })}
                  className="bg-background text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => updateQuery({ date_to: e.target.value })}
                  className="bg-background text-xs h-9"
                />
              </div>
            </>
          )}
        </div>

        {/* Live Search Input for Student Name */}
        <div className="relative pt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search student by name or ID..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className="pl-9 bg-muted/20 text-xs h-9"
          />
        </div>
      </Card>
      </StaggerItem>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="xs" variant="ghost" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* ── MAIN CONTENT DISPLAY ── */}
      <StaggerItem>
        {viewLayout === "roster" ? (
        /* ── SESSION ROSTER VIEW ── */
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
            <div className="space-y-1">
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <Users className="size-5 text-primary" />
                Session Roster View
              </h2>
              <p className="text-xs text-muted-foreground">
                Target a single session and log attendance with 1-tap quick actions
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-64 sm:w-72">
                <SearchableSelect
                  options={rosterSessionItems}
                  value={rosterSessionId?.toString() ?? ""}
                  onValueChange={(val) => updateQuery({ session_id: val || null })}
                  placeholder="Select Session Date…"
                  searchPlaceholder="Search session date..."
                />
              </div>

              {selectedRosterSession && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkMarkSession(selectedRosterSession.id, "present")}
                    disabled={rowStudents.length === 0 || loading}
                    className="h-9 text-xs font-semibold gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                  >
                    <Sparkles className="size-3.5 text-emerald-500" />
                    <span>Mark All Present</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkMarkSession(selectedRosterSession.id, "absent")}
                    disabled={rowStudents.length === 0 || loading}
                    className="h-9 text-xs font-semibold gap-1 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <XCircle className="size-3.5 text-rose-500" />
                    <span>Mark All Absent</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {selectedRosterSession ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Filter student roster..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="pl-10 h-10 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {rosterStudentsFiltered.map((student) => {
                  const record = getAttendanceRecord(student.id, selectedRosterSession.id)
                  const currentStatus = record?.status ?? "unmarked"
                  const isPending = pendingCells[`${student.id}-${selectedRosterSession.id}`]

                  return (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                        currentStatus === "present"
                          ? "bg-emerald-500/5 border-emerald-500/30"
                          : currentStatus === "late"
                          ? "bg-amber-500/5 border-amber-500/30"
                          : currentStatus === "absent"
                          ? "bg-rose-500/5 border-rose-500/30"
                          : currentStatus === "excused"
                          ? "bg-sky-500/5 border-sky-500/30"
                          : "bg-muted/30 border-border"
                      }`}
                    >
                      <div className="grid gap-0.5">
                        <span className="font-semibold text-sm text-foreground">{student.name}</span>
                        <span className="text-[11px] text-muted-foreground">{student.unique_code ?? "No ID"}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {isPending ? (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, selectedRosterSession.id, "present")}
                              className={`flex size-8 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                                currentStatus === "present"
                                  ? "bg-emerald-500 text-white border-emerald-600 shadow-xs"
                                  : "border-border bg-background text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                              }`}
                              title="Present"
                            >
                              <CheckCircle2 className="size-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, selectedRosterSession.id, "late")}
                              className={`flex size-8 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                                currentStatus === "late"
                                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                                  : "border-border bg-background text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                              }`}
                              title="Late"
                            >
                              <AlertTriangle className="size-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, selectedRosterSession.id, "absent")}
                              className={`flex size-8 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                                currentStatus === "absent"
                                  ? "bg-rose-500 text-white border-rose-600 shadow-xs"
                                  : "border-border bg-background text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                              }`}
                              title="Absent"
                            >
                              <XCircle className="size-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, selectedRosterSession.id, "excused")}
                              className={`flex size-8 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                                currentStatus === "excused"
                                  ? "bg-sky-500 text-white border-sky-600 shadow-xs"
                                  : "border-border bg-background text-muted-foreground hover:text-sky-600 hover:bg-sky-500/10"
                              }`}
                              title="Excused"
                            >
                              <CalendarOff className="size-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <p>No session selected. Please select a session from the dropdown above.</p>
            </div>
          )}
        </div>
      ) : (
        /* ── MATRIX GRID VIEW ── */
        <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto hinthar-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="sticky left-0 z-20 w-56 font-bold text-foreground text-xs uppercase tracking-wider bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    Student Name
                  </TableHead>
                  {sessions.map((session) => {
                    const { subject, teacher, dateStr, timeStr } = formatSessionMeta(session)

                    return (
                      <TableHead key={session.id} className="min-w-40 text-center text-xs">
                        <div className="flex flex-col items-center gap-0.5 py-1">
                          <span
                            className="max-w-[9.5rem] truncate font-semibold text-foreground leading-tight"
                            title={subject}
                          >
                            {subject}
                          </span>
                          <span
                            className="max-w-[9.5rem] truncate text-[10px] text-muted-foreground"
                            title={teacher}
                          >
                            {teacher}
                          </span>
                          <span className="text-[11px] font-medium text-muted-foreground">{dateStr}</span>
                          <span className="text-[10px] text-muted-foreground/80">{timeStr}</span>
                        </div>
                      </TableHead>
                    )
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !lastLoaded ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="sticky left-0 z-10 w-56 bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                      </TableCell>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="mx-auto h-8 w-24 animate-pulse rounded-lg bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rowStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={sessions.length + 1} className="h-36 text-center text-muted-foreground">
                      No enrolled students found matching the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rowStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="sticky left-0 z-10 w-56 font-semibold text-foreground text-xs bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex flex-col">
                          <span>{student.name}</span>
                          <span className="text-[10px] font-normal text-muted-foreground">{student.unique_code ?? "No ID"}</span>
                        </div>
                      </TableCell>

                      {sessions.map((session) => {
                        const record = getAttendanceRecord(student.id, session.id)
                        const key = `${student.id}-${session.id}`
                        const isPending = pendingCells[key]
                        const isEditing = editingCellKey === key

                        return (
                          <TableCell key={session.id} className="text-center p-2">
                            {isPending ? (
                              <div className="flex h-9 items-center justify-center">
                                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                              </div>
                            ) : isEditing ? (
                              <Select
                                value={record?.status ?? undefined}
                                defaultOpen={true}
                                onOpenChange={(open) => {
                                  if (!open) setEditingCellKey(null)
                                }}
                                onValueChange={(val) => {
                                  setEditingCellKey(null)
                                  if (val) {
                                    handleStatusChange(student.id, session.id, val as SessionAttendanceStatus)
                                  }
                                }}
                              >
                                <SelectTrigger
                                  className={`mx-auto flex h-9 w-28 items-center justify-between rounded-lg border px-2 py-1 text-xs font-semibold shadow-xs transition-all outline-hidden focus:ring-2 focus:ring-offset-2 ${getSelectStyles(record?.status ?? undefined)}`}
                                  size="sm"
                                >
                                  <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent align="center" className="min-w-28">
                                  <SelectItem value="present" className="text-emerald-600 dark:text-emerald-400 font-semibold">Present</SelectItem>
                                  <SelectItem value="late" className="text-amber-600 dark:text-amber-400 font-semibold">Late</SelectItem>
                                  <SelectItem value="absent" className="text-rose-600 dark:text-rose-400 font-semibold">Absent</SelectItem>
                                  <SelectItem value="excused" className="text-sky-600 dark:text-sky-400 font-semibold">Excused</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                                <button
                                  type="button"
                                  onClick={() => setEditingCellKey(key)}
                                  className={`mx-auto flex h-9 w-28 items-center justify-between rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-2xs transition-all cursor-pointer hover:scale-105 active:scale-95 ${getSelectStyles(record?.status ?? undefined)}`}
                                >
                                  <span>
                                    {record?.status
                                      ? (statusItems.find((st) => st.value === record.status)?.label ?? record.status)
                                      : "—"}
                                  </span>
                                  <ChevronDown className="size-3 opacity-60" />
                                </button>
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </StaggerItem>
    </StaggerContainer>
  )
}

export default function ClassAttendancePage() {
  return (
    <RequireRole mode="staff">
      <ClassAttendanceContent />
    </RequireRole>
  )
}
