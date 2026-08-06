"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { SearchableSelect } from "@/components/searchable-select"
import { useAuth } from "@clerk/nextjs"
import {
  Loader2,
  Search,
  Plus,
  AlertCircle,
  Calendar,
  CalendarCheck,
  BookOpen,
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
  UserPlus,
} from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import {
  parseBackendDateTime,
  parseDateAndClock,
  toLocalDateString,
  toSessionDateString,
} from "@/lib/utils"
import {
  type Subject,
  type Student,
  type Teacher,
  type AttendanceMatrixSession,
  type AttendanceMatrixStudent,
  type AdHocSessionAttendance,
  type SessionAttendanceStatus,
} from "@/lib/types"
import { RequireRole } from "@/components/require-role"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { StandardPageHeader, buildReloadAction } from "@/components/standard-page-header"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

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
    return parseDateAndClock(session.date, session.start_time)
  }
  return parseBackendDateTime(session.start_time)
}

function formatSessionMeta(session: AttendanceMatrixSession) {
  const d = getSessionStartTime(session)
  const valid = !isNaN(d.getTime())
  return {
    subject: session.subject?.trim() || "—",
    teacher: session.teacher_name?.trim() || "—",
    dateStr: valid
      ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" })
      : "—",
    timeStr: valid
      ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })
      : "—",
  }
}

function getSelectStyles(status?: string): string {
  switch (status) {
    case "present":
      return "bg-attendance-present/15 text-attendance-present border-attendance-present/30 focus:ring-attendance-present/50 font-semibold"
    case "late":
      return "bg-attendance-late/15 text-attendance-late border-attendance-late/30 focus:ring-attendance-late/40 font-medium"
    case "absent":
      return "bg-muted text-muted-foreground border-border/80 focus:ring-ring font-medium"
    case "excused":
      return "bg-attendance-excused/15 text-attendance-excused border-attendance-excused/30 focus:ring-attendance-excused/40 font-medium"
    default:
      return "bg-card text-muted-foreground/70 border-border/50 focus:ring-ring/30 text-center font-normal"
  }
}

const PICKER_PAGE_SIZE = 25

const statusItems = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "excused", label: "Excused" },
]

function AdHocAttendanceContent() {
  const searchParams = useSearchParams()
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const dateFromUrl = searchParams.get("date")
  const layoutFromUrl = searchParams.get("layout")
  const sessionIdFromUrl = searchParams.get("session_id")
  const subjectIdFromUrl = searchParams.get("subject_id")
  const teacherIdFromUrl = searchParams.get("teacher_id")

  // Base Options Metadata
  const [subjects, setSubjects] = React.useState<Subject[]>([])
  const [teachers, setTeachers] = React.useState<Teacher[]>([])

  // Main Datasets
  const [students, setStudents] = React.useState<AttendanceMatrixStudent[]>([])
  const [adhocSessions, setAdhocSessions] = React.useState<AttendanceMatrixSession[]>([])
  const [adhocAttendances, setAdhocAttendances] = React.useState<AdHocSessionAttendance[]>([])

  // UI state
  const [loading, setLoading] = React.useState(false)
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [editingCellKey, setEditingCellKey] = React.useState<string | null>(null)

  // Pending cell updates map: "studentId-sessionId" -> boolean
  const [pendingCells, setPendingCells] = React.useState<Record<string, boolean>>({})

  // Controls — seed from deep-link query params when present (e.g. Sessions → Take roll)
  const [viewLayout, setViewLayout] = React.useState<"matrix" | "roster">(
    layoutFromUrl === "roster" ? "roster" : "matrix"
  )
  const [rangeMode, setRangeMode] = React.useState<"session" | "month" | "custom">("session")

  // Single Day / Session Filter
  const [selectedDate, setSelectedDate] = React.useState<string>(
    dateFromUrl || toLocalDateString()
  )

  // Roster View Selected Session ID
  const [rosterSessionId, setRosterSessionId] = React.useState<number | null>(
    sessionIdFromUrl ? Number(sessionIdFromUrl) : null
  )
  const [rosterSearch, setRosterSearch] = React.useState("")
  const [studentSearch, setStudentSearch] = React.useState("")

  // Filters
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>(
    subjectIdFromUrl || "all"
  )
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<string>(
    teacherIdFromUrl || "all"
  )

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [selectedYear, setSelectedYear] = React.useState<number>(currentYear)
  const [selectedMonth, setSelectedMonth] = React.useState<number>(currentMonth)

  // Custom Date Range Filters
  const [startDate, setStartDate] = React.useState<string>("")
  const [endDate, setEndDate] = React.useState<string>("")

  // Modal: Add Ad-Hoc Session Form State
  const [isAddSessionOpen, setIsAddSessionOpen] = React.useState(false)
  const [newSubjectId, setNewSubjectId] = React.useState<string>("")
  const [newTeacherId, setNewTeacherId] = React.useState<string>("")
  const [newDate, setNewDate] = React.useState<string>(toLocalDateString())
  const [newStartTime, setNewStartTime] = React.useState<string>("09:00:00")
  const [newEndTime, setNewEndTime] = React.useState<string>("10:00:00")
  const [isCreatingSession, setIsCreatingSession] = React.useState(false)

  // Modal: Add Students to an ad-hoc session (creates absent records they can then be marked from)
  const [isAddStudentsOpen, setIsAddStudentsOpen] = React.useState(false)
  const [targetSessionId, setTargetSessionId] = React.useState<string>("")
  const [pickerQuery, setPickerQuery] = React.useState("")
  const [pickerResults, setPickerResults] = React.useState<Student[]>([])
  const [pickerPage, setPickerPage] = React.useState(1)
  const [pickerTotal, setPickerTotal] = React.useState(0)
  const [pickerLoading, setPickerLoading] = React.useState(false)
  const [pickedStudentIds, setPickedStudentIds] = React.useState<number[]>([])
  const [isAddingStudents, setIsAddingStudents] = React.useState(false)

  // Hydration protection
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

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
      const [subjectsData, teachersData] = await Promise.all([
        api.listSubjects({ summary: "true" }),
        api.listTeachers({ summary: "true" }),
      ])
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

  // Single-Pass Aggregated Ranged Matrix Data Fetcher (ad-hoc / tutoring sessions only)
  const loadData = React.useCallback(async () => {
    if (!isLoaded || !isSignedIn) return
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
        if (selectedDate) {
          filterParams.date_from = selectedDate
          filterParams.date_to = selectedDate
        }
      } else if (rangeMode === "custom" && startDate && endDate) {
        filterParams.date_from = startDate
        filterParams.date_to = endDate
      } else {
        filterParams.month = selectedMonth
        filterParams.year = selectedYear
      }

      if (selectedSubjectId !== "all") filterParams.subject_id = selectedSubjectId
      if (selectedTeacherId !== "all") filterParams.teacher_id = selectedTeacherId

      const adhocMatrix = await api.getAdHocAttendanceMatrix(filterParams)

      setAdhocSessions(adhocMatrix.sessions || [])
      setStudents(adhocMatrix.students || [])
      setAdhocAttendances(adhocMatrix.attendances || [])
      setLastLoaded(new Date().toLocaleTimeString())
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
    rangeMode,
    selectedSubjectId,
    selectedTeacherId,
    selectedDate,
    selectedMonth,
    selectedYear,
    startDate,
    endDate,
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

  // Auto-select first session for Roster view if needed
  React.useEffect(() => {
    if (viewLayout === "roster" && adhocSessions.length > 0) {
      if (rosterSessionId === null || !adhocSessions.some((s) => s.id === rosterSessionId)) {
        setRosterSessionId(adhocSessions[0].id)
      }
    }
  }, [viewLayout, adhocSessions, rosterSessionId])

  // Selected session object for Roster view
  const selectedRosterSession = React.useMemo(() => {
    if (!rosterSessionId) return null
    return adhocSessions.find((s) => s.id === rosterSessionId) ?? null
  }, [adhocSessions, rosterSessionId])

  // Fast O(1) Map lookups for attendance records to avoid O(N*M) array.find scans
  const adhocAttendanceMap = React.useMemo(() => {
    const map = new Map<string, AdHocSessionAttendance>()
    for (const a of adhocAttendances) {
      const sId = typeof a.student === "object" && a.student ? a.student.id : a.student_id ?? a.student
      const sessId = typeof a.adhoc_session === "object" && a.adhoc_session ? a.adhoc_session.id : (a.ad_hoc_session && typeof a.ad_hoc_session === "object" ? a.ad_hoc_session.id : (a.adhoc_session_id ?? a.ad_hoc_session_id ?? a.adhoc_session))
      map.set(`${sId}-${sessId}`, a)
    }
    return map
  }, [adhocAttendances])

  const getAttendanceRecord = React.useCallback(
    (studentId: number, sessionId: number) => adhocAttendanceMap.get(`${studentId}-${sessionId}`),
    [adhocAttendanceMap]
  )

  // Attendance Status Change Handler (with bulk upsert single-call efficiency)
  const handleStatusChange = async (studentId: number, sessionId: number, newStatus: SessionAttendanceStatus) => {
    const key = `${studentId}-${sessionId}`
    setPendingCells((prev) => ({ ...prev, [key]: true }))

    try {
      const token = await getAuthToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      await api.bulkUpsertAdHocSessionAttendances([
        {
          adhoc_session_id: sessionId,
          student_id: studentId,
          status: newStatus,
          attended: newStatus === "present" || newStatus === "late",
        },
      ])
      setAdhocAttendances((prev) => {
        const idx = prev.findIndex((a) => {
          const sId = typeof a.student === "object" && a.student ? a.student.id : a.student_id ?? a.student
          const sessId = typeof a.adhoc_session === "object" && a.adhoc_session ? a.adhoc_session.id : (a.ad_hoc_session && typeof a.ad_hoc_session === "object" ? a.ad_hoc_session.id : (a.adhoc_session_id ?? a.ad_hoc_session_id ?? a.adhoc_session))
          return sId === studentId && sessId === sessionId
        })
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], status: newStatus, attended: newStatus === "present" || newStatus === "late" }
          return updated
        }
        return [
          ...prev,
          {
            id: Date.now(),
            adhoc_session: sessionId,
            ad_hoc_session: sessionId,
            adhoc_session_id: sessionId,
            ad_hoc_session_id: sessionId,
            student: studentId,
            student_id: studentId,
            status: newStatus,
            attended: newStatus === "present" || newStatus === "late",
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
        adhoc_session_id: sessionId,
        student_id: st.id,
        status: targetStatus,
        attended: targetStatus === "present" || targetStatus === "late",
      }))
      await api.bulkUpsertAdHocSessionAttendances(records)

      await loadData()
    } catch (err) {
      console.error(err)
      setError("Failed to batch update attendance")
    } finally {
      setLoading(false)
    }
  }

  // Server-side student search for the Add Students picker
  React.useEffect(() => {
    if (!isAddStudentsOpen) return
    let cancelled = false

    const handle = setTimeout(async () => {
      setPickerLoading(true)
      try {
        const token = await getAuthToken()
        if (!token) return
        const api = createApi(token)
        const data = await api.listStudentsPage({
          page: pickerPage,
          page_size: PICKER_PAGE_SIZE,
          q: pickerQuery.trim() || undefined,
        })
        if (cancelled) return
        setPickerTotal(data.count)
        setPickerResults((prev) => (pickerPage === 1 ? data.results || [] : [...prev, ...(data.results || [])]))
      } catch {
        if (!cancelled) {
          setPickerResults([])
          setPickerTotal(0)
        }
      } finally {
        if (!cancelled) setPickerLoading(false)
      }
    }, pickerPage === 1 ? 300 : 0)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [isAddStudentsOpen, pickerQuery, pickerPage, getAuthToken])

  const openAddStudents = () => {
    const defaultSessionId = rosterSessionId ?? adhocSessions[0]?.id ?? null
    setTargetSessionId(defaultSessionId ? defaultSessionId.toString() : "")
    setPickerQuery("")
    setPickerResults([])
    setPickerPage(1)
    setPickerTotal(0)
    setPickedStudentIds([])
    setIsAddStudentsOpen(true)
  }

  const handleAddStudentsToSession = async () => {
    const sessionId = Number(targetSessionId)
    if (!sessionId || pickedStudentIds.length === 0) return

    setIsAddingStudents(true)
    setError(null)

    try {
      const token = await getAuthToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      await api.bulkUpsertAdHocSessionAttendances(
        pickedStudentIds.map((studentId) => ({
          adhoc_session_id: sessionId,
          student_id: studentId,
          status: "absent",
          attended: false,
        }))
      )

      setIsAddStudentsOpen(false)
      setPickedStudentIds([])
      setPickerQuery("")
      await loadData()
    } catch (err) {
      console.error(err)
      setError(err instanceof ApiError ? err.userMessage : "Failed to add students to the session")
    } finally {
      setIsAddingStudents(false)
    }
  }

  // Handle Create Ad-Hoc Session Form Submit
  const handleCreateAdHocSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubjectId || !newTeacherId || !newDate || !newStartTime || !newEndTime) return

    setIsCreatingSession(true)
    setError(null)

    try {
      const token = await getAuthToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      const formattedStartTime = newStartTime.length === 5 ? `${newStartTime}:00` : newStartTime
      const formattedEndTime = newEndTime.length === 5 ? `${newEndTime}:00` : newEndTime

      await api.createAdHocSession({
        subject_id: Number(newSubjectId),
        teacher_id: Number(newTeacherId),
        date: newDate,
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        status: "scheduled",
      })

      setNewSubjectId("")
      setNewTeacherId("")
      setNewDate(toLocalDateString())
      setNewStartTime("09:00:00")
      setNewEndTime("10:00:00")
      setIsAddSessionOpen(false)
      await loadData()
    } catch (err) {
      console.error(err)
      setError(err instanceof ApiError ? err.userMessage : "Failed to create ad-hoc session")
    } finally {
      setIsCreatingSession(false)
    }
  }

  // Metric Summaries — exclude future sessions (pregenerated absent defaults)
  const stats = React.useMemo(() => {
    let presentCount = 0
    let lateCount = 0
    let absentCount = 0
    let excusedCount = 0
    const today = toLocalDateString()

    const countableSessionIds = new Set(
      adhocSessions
        .filter((s) => {
          const day = s.date ? toSessionDateString(s.date) : toSessionDateString(s.start_time)
          return day <= today
        })
        .map((s) => s.id)
    )

    adhocAttendances.forEach((a) => {
      const sessId =
        typeof a.adhoc_session === "object" && a.adhoc_session
          ? a.adhoc_session.id
          : a.ad_hoc_session && typeof a.ad_hoc_session === "object"
            ? a.ad_hoc_session.id
            : (a.adhoc_session_id ?? a.ad_hoc_session_id ?? a.adhoc_session)
      if (!countableSessionIds.has(Number(sessId))) return
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
      totalSessions: countableSessionIds.size,
      presentCount,
      lateCount,
      absentCount,
      excusedCount,
      attendanceRate,
    }
  }, [adhocAttendances, students, adhocSessions])

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
    return adhocSessions.map((session) => {
      const { subject, teacher, dateStr, timeStr } = formatSessionMeta(session)
      return {
        value: session.id.toString(),
        label: `${subject} · ${teacher} · ${dateStr} (${timeStr})`,
      }
    })
  }, [adhocSessions])

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
          title="Ad-Hoc / Tutoring Attendance"
          description="View and log attendance for one-off sessions not tied to a class timetable."
          back={{ href: "/attendance/", label: "Attendance" }}
          secondaryAction={buildReloadAction({
            hasLoaded: !!lastLoaded,
            loading,
            onClick: loadData,
          })}
          primaryAction={{
            label: "Add Ad-Hoc Session",
            onClick: () => {
              setIsAddSessionOpen(true)
              if (subjects.length > 0) setNewSubjectId(subjects[0].id.toString())
              if (teachers.length > 0) setNewTeacherId(teachers[0].id.toString())
              setNewDate(toLocalDateString())
              setNewStartTime("09:00:00")
              setNewEndTime("10:00:00")
            },
            icon: <Plus className="size-4" />,
          }}
        >
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={openAddStudents}
            disabled={adhocSessions.length === 0}
          >
            <UserPlus className="size-4" />
            Add Students
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
              <span className="text-xs font-semibold text-attendance-present uppercase tracking-wider">Present</span>
              <CheckCircle2 className="size-4 text-attendance-present" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-attendance-present">{stats.presentCount}</span>
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
        {/* Top Control Bar: Layout Mode & Date Range Mode Switchers */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-end gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Range Mode Switcher */}
            <div className="flex rounded-lg border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setRangeMode("session")}
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
                onClick={() => setRangeMode("month")}
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
                onClick={() => setRangeMode("custom")}
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
                onClick={() => setViewLayout("matrix")}
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
                onClick={() => setViewLayout("roster")}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/* Subject Filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <BookOpen className="h-3 w-3" /> Subject
            </label>
            <SearchableSelect
              options={subjectItems}
              value={selectedSubjectId}
              onValueChange={(val) => setSelectedSubjectId(val)}
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
              onValueChange={(val) => setSelectedTeacherId(val)}
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
                onChange={(e) => setSelectedDate(e.target.value)}
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
                  onValueChange={(val) => setSelectedMonth(Number(val))}
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
                  onValueChange={(val) => setSelectedYear(Number(val))}
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
                  onChange={(e) => setStartDate(e.target.value)}
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
                  onChange={(e) => setEndDate(e.target.value)}
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

      {/* Add Students to Ad-Hoc Session Dialog */}
      <Dialog open={isAddStudentsOpen} onOpenChange={setIsAddStudentsOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add Students to Session</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Session</label>
              <Select value={targetSessionId} onValueChange={(val) => setTargetSessionId(val ?? "")}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select Session">
                    {rosterSessionItems.find((s) => s.value === targetSessionId)?.label ?? "Select Session"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {rosterSessionItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Students</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name or identifier..."
                  value={pickerQuery}
                  onChange={(e) => {
                    setPickerQuery(e.target.value)
                    setPickerPage(1)
                  }}
                  className="pl-9 bg-background text-xs h-9"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto hinthar-scrollbar rounded-xl border border-border/80 divide-y divide-border/60">
              {pickerLoading && pickerPage === 1 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Searching…
                </div>
              ) : pickerResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">No students found.</div>
              ) : (
                <>
                  {pickerResults.map((student) => {
                    const alreadyAdded = adhocAttendanceMap.has(`${student.id}-${Number(targetSessionId)}`)
                    const isPicked = pickedStudentIds.includes(student.id)

                    return (
                      <div key={student.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={isPicked}
                            disabled={alreadyAdded}
                            onCheckedChange={(checked) =>
                              setPickedStudentIds((prev) =>
                                checked ? [...prev, student.id] : prev.filter((id) => id !== student.id)
                              )
                            }
                          />
                          <div className="grid gap-0.5 min-w-0">
                            <span className="truncate text-sm font-medium text-foreground">{student.name}</span>
                            <span className="text-[11px] text-muted-foreground">{student.unique_code ?? "No ID"}</span>
                          </div>
                        </div>
                        {alreadyAdded && (
                          <span className="shrink-0 text-[11px] font-medium text-muted-foreground">Already added</span>
                        )}
                      </div>
                    )
                  })}

                  {pickerResults.length < pickerTotal && (
                    <div className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full gap-1.5 text-xs"
                        disabled={pickerLoading}
                        onClick={() => setPickerPage((prev) => prev + 1)}
                      >
                        {pickerLoading ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            Loading…
                          </>
                        ) : (
                          `Load ${Math.min(PICKER_PAGE_SIZE, pickerTotal - pickerResults.length)} more`
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
              <span>Added students start as absent so you can mark them present as they arrive.</span>
              {pickerTotal > 0 && (
                <span className="shrink-0">
                  {pickerResults.length} of {pickerTotal}
                </span>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddStudentsOpen(false)}
              disabled={isAddingStudents}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddStudentsToSession}
              disabled={isAddingStudents || !targetSessionId || pickedStudentIds.length === 0}
            >
              {isAddingStudents ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                `Add ${pickedStudentIds.length} Student${pickedStudentIds.length === 1 ? "" : "s"}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Ad-Hoc Session Dialog */}
      <Dialog open={isAddSessionOpen} onOpenChange={setIsAddSessionOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Ad-Hoc Session</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAdHocSession} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</label>
              <Select value={newSubjectId} onValueChange={(val) => setNewSubjectId(val ?? "")}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select Subject">
                    {subjects.find((s) => s.id.toString() === newSubjectId)?.name ?? "Select Subject"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id.toString()}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Teacher</label>
              <Select value={newTeacherId} onValueChange={(val) => setNewTeacherId(val ?? "")}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select Teacher">
                    {teachers.find((t) => t.id.toString() === newTeacherId)?.name ?? "Select Teacher"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                className="bg-background w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start Time</label>
                <Input
                  type="time"
                  step="1"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End Time</label>
                <Input
                  type="time"
                  step="1"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddSessionOpen(false)} disabled={isCreatingSession}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingSession}>
                {isCreatingSession ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Session"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                  onValueChange={(val) => setRosterSessionId(val ? Number(val) : null)}
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
                    className="h-9 text-xs font-semibold gap-1 text-attendance-present border-attendance-present/30 hover:bg-attendance-present/10 cursor-pointer"
                  >
                    <Sparkles className="size-3.5 text-attendance-present" />
                    <span>Mark All Present</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkMarkSession(selectedRosterSession.id, "absent")}
                    disabled={rowStudents.length === 0 || loading}
                    className="h-9 text-xs font-semibold gap-1 text-attendance-absent border-attendance-absent/30 hover:bg-attendance-absent/10 cursor-pointer"
                  >
                    <XCircle className="size-3.5 text-attendance-absent" />
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
                          ? "bg-attendance-present/5 border-attendance-present/30"
                          : currentStatus === "late"
                          ? "bg-attendance-late/5 border-attendance-late/30"
                          : currentStatus === "absent"
                          ? "bg-attendance-absent/5 border-attendance-absent/30"
                          : currentStatus === "excused"
                          ? "bg-attendance-excused/5 border-attendance-excused/30"
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
                                  ? "bg-attendance-present text-white border-attendance-present shadow-xs"
                                  : "border-border bg-background text-muted-foreground hover:text-attendance-present hover:bg-attendance-present/10"
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
                                  ? "bg-attendance-late text-white border-attendance-late shadow-xs"
                                  : "border-border bg-background text-muted-foreground hover:text-attendance-late hover:bg-attendance-late/10"
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
                                  ? "bg-attendance-absent text-white border-attendance-absent shadow-xs"
                                  : "border-border bg-background text-muted-foreground hover:text-attendance-absent hover:bg-attendance-absent/10"
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
                                  ? "bg-attendance-excused text-white border-attendance-excused shadow-xs"
                                  : "border-border bg-background text-muted-foreground hover:text-attendance-excused hover:bg-attendance-excused/10"
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
                  {adhocSessions.map((session) => {
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
                {loading ? (
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
                    <TableCell colSpan={adhocSessions.length + 1} className="h-36 text-center text-muted-foreground">
                      {adhocSessions.length === 0
                        ? "No students found matching the selected filters."
                        : "No students in these sessions yet — use Add Students to build the list."}
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

                      {adhocSessions.map((session) => {
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
                                  <SelectItem value="present" className="text-attendance-present font-semibold">Present</SelectItem>
                                  <SelectItem value="late" className="text-attendance-late font-semibold">Late</SelectItem>
                                  <SelectItem value="absent" className="text-attendance-absent font-semibold">Absent</SelectItem>
                                  <SelectItem value="excused" className="text-attendance-excused font-semibold">Excused</SelectItem>
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

export default function AdHocAttendancePage() {
  return (
    <RequireRole mode="staff">
      <AdHocAttendanceContent />
    </RequireRole>
  )
}
