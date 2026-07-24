"use client"

import * as React from "react"
import { SearchableSelect } from "@/components/searchable-select"
import { useAuth } from "@clerk/nextjs"
import { 
  Check, 
  Clock, 
  Loader2, 
  Search, 
  Plus, 
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
  Filter,
  ArrowRight,
  TrendingUp,
  Percent,
  ChevronDown,
} from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { 
  type Class, 
  type Subject, 
  type Student, 
  type Teacher,
  type Session, 
  type SessionAttendance, 
  type SessionAttendanceStatus,
  type AdHocSession,
  type AdHocSessionAttendance
} from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { StandardPageHeader } from "@/components/standard-page-header"
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

function getSessionStartTime(session: Session | AdHocSession): Date {
  if ("start_time" in session && session.start_time && session.start_time.includes("T")) {
    return parseBackendDateTime(session.start_time)
  } else if ("date" in session && session.date) {
    return new Date(`${session.date}T${session.start_time}`)
  } else if ("start_time" in session) {
    return parseBackendDateTime(session.start_time)
  }
  return new Date()
}

function getSelectStyles(status?: string): string {
  switch (status) {
    case "present":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 focus:ring-emerald-500/50 font-semibold"
    case "late":
      return "bg-emerald-500/10 text-emerald-700/80 dark:text-emerald-400/80 border-emerald-500/20 focus:ring-emerald-500/30 font-medium"
    case "absent":
      return "bg-muted text-muted-foreground border-border/80 focus:ring-ring font-medium"
    default:
      return "bg-card text-muted-foreground/70 border-border/50 focus:ring-ring/30 text-center font-normal"
  }
}

const statusItems = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
]

export default function AttendancePage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  // Base Options Metadata
  const [classes, setClasses] = React.useState<Class[]>([])
  const [subjects, setSubjects] = React.useState<Subject[]>([])
  const [teachers, setTeachers] = React.useState<Teacher[]>([])

  // Main Datasets
  const [students, setStudents] = React.useState<Student[]>([])
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [attendances, setAttendances] = React.useState<SessionAttendance[]>([])
  
  const [adhocSessions, setAdhocSessions] = React.useState<AdHocSession[]>([])
  const [adhocAttendances, setAdhocAttendances] = React.useState<AdHocSessionAttendance[]>([])

  // UI state
  const [loading, setLoading] = React.useState(false)
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [editingCellKey, setEditingCellKey] = React.useState<string | null>(null)
  
  // Pending cell updates map: "studentId-sessionId" -> boolean
  const [pendingCells, setPendingCells] = React.useState<Record<string, boolean>>({})

  // Controls
  const [attendanceMode, setAttendanceMode] = React.useState<"class" | "adhoc">("class")
  const [viewLayout, setViewLayout] = React.useState<"matrix" | "roster">("matrix")
  const [rangeMode, setRangeMode] = React.useState<"session" | "month" | "custom">("session")

  // Single Day / Session Filter
  const [selectedDate, setSelectedDate] = React.useState<string>(new Date().toISOString().split("T")[0])

  // Roster View Selected Session ID
  const [rosterSessionId, setRosterSessionId] = React.useState<number | null>(null)
  const [rosterSearch, setRosterSearch] = React.useState("")
  const [studentSearch, setStudentSearch] = React.useState("")

  // Filters
  const [selectedClassId, setSelectedClassId] = React.useState<string>("")
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>("all")
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<string>("all")
  
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
  const [newDate, setNewDate] = React.useState<string>(new Date().toISOString().split("T")[0])
  const [newStartTime, setNewStartTime] = React.useState<string>("09:00:00")
  const [newEndTime, setNewEndTime] = React.useState<string>("10:00:00")
  const [isCreatingSession, setIsCreatingSession] = React.useState(false)

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
      const [classesData, subjectsData, teachersData] = await Promise.all([
        api.listClasses({ summary: "true" }),
        api.listSubjects({ summary: "true" }),
        api.listTeachers({ summary: "true" }),
      ])
      setClasses(classesData || [])
      setSubjects(subjectsData || [])
      setTeachers(teachersData || [])

      if (classesData && classesData.length > 0) {
        setSelectedClassId((prev) => (!prev || prev === "all" ? classesData[0].id.toString() : prev))
      }
    } catch {
      // silent options prefetch
    }
  }, [getAuthToken, isLoaded, isSignedIn])

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      prefetchOptions()
    }
  }, [isLoaded, isSignedIn, prefetchOptions])

  // Single-Pass Aggregated Ranged Matrix Data Fetcher
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

      if (attendanceMode === "class") {
        if (!selectedClassId || selectedClassId === "all") {
          setSessions([])
          setStudents([])
          setAttendances([])
          setLoading(false)
          return
        }

        filterParams.class_id = selectedClassId
        const matrixData = await api.getAttendanceMatrix(filterParams)

        setSessions(matrixData.sessions || [])
        setStudents(matrixData.students || [])
        setAttendances(matrixData.attendances || [])
        setAdhocSessions([])
        setAdhocAttendances([])
        setAdhocSessions([])
        setAdhocAttendances([])
      } else {
        // Ad-Hoc / Tutoring Sessions Mode
        const adhocMatrix = await api.getAdHocAttendanceMatrix(filterParams)

        setAdhocSessions(adhocMatrix.sessions || [])
        setStudents(adhocMatrix.students || [])
        setAdhocAttendances(adhocMatrix.attendances || [])
        setSessions([])
        setAttendances([])
      }

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
    attendanceMode,
    rangeMode,
    selectedClassId,
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

  // Filtered Sessions (with client-side subject & teacher filtering)
  const activeSessions = React.useMemo(() => {
    let list: any[] = attendanceMode === "adhoc" ? adhocSessions : sessions
    if (selectedSubjectId !== "all") {
      list = list.filter(
        (s: any) =>
          s.subject_id?.toString() === selectedSubjectId ||
          s.subject?.id?.toString() === selectedSubjectId ||
          s.timetable_slot?.subject_id?.toString() === selectedSubjectId ||
          s.timetable_slot?.subject?.id?.toString() === selectedSubjectId
      )
    }
    if (selectedTeacherId !== "all") {
      list = list.filter(
        (s: any) =>
          s.teacher_id?.toString() === selectedTeacherId ||
          s.teacher?.id?.toString() === selectedTeacherId
      )
    }
    return list
  }, [attendanceMode, adhocSessions, sessions, selectedSubjectId, selectedTeacherId])

  // Filtered Students by search input
  const rowStudents = React.useMemo(() => {
    if (!studentSearch.trim()) return students
    const query = studentSearch.toLowerCase().trim()
    return students.filter(
      (s) => s.name.toLowerCase().includes(query) || s.id.toString().includes(query)
    )
  }, [students, studentSearch])

  // Auto-select first session for Roster view if needed
  React.useEffect(() => {
    if (viewLayout === "roster" && activeSessions.length > 0) {
      if (rosterSessionId === null || !activeSessions.some((s) => s.id === rosterSessionId)) {
        setRosterSessionId(activeSessions[0].id)
      }
    }
  }, [viewLayout, activeSessions, rosterSessionId])

  // Selected session object for Roster view
  const selectedRosterSession = React.useMemo(() => {
    if (!rosterSessionId) return null
    return activeSessions.find((s) => s.id === rosterSessionId) ?? null
  }, [activeSessions, rosterSessionId])

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

  const adhocAttendanceMap = React.useMemo(() => {
    const map = new Map<string, AdHocSessionAttendance>()
    for (const a of adhocAttendances) {
      const sId = typeof a.student === "object" && a.student ? a.student.id : a.student_id ?? a.student
      const sessId = typeof a.adhoc_session === "object" && a.adhoc_session ? a.adhoc_session.id : (a.ad_hoc_session && typeof a.ad_hoc_session === "object" ? a.ad_hoc_session.id : (a.adhoc_session_id ?? a.ad_hoc_session_id ?? a.adhoc_session))
      map.set(`${sId}-${sessId}`, a)
    }
    return map
  }, [adhocAttendances])

  // Fast O(1) Map helper to find attendance record for a student and session
  const getAttendanceRecord = React.useCallback(
    (studentId: number, sessionId: number) => {
      const key = `${studentId}-${sessionId}`
      if (attendanceMode === "adhoc") {
        return adhocAttendanceMap.get(key)
      }
      return attendanceMap.get(key)
    },
    [attendanceMode, attendanceMap, adhocAttendanceMap]
  )

  // Attendance Status Change Handler (with bulk upsert single-call efficiency)
  const handleStatusChange = async (studentId: number, sessionId: number, newStatus: SessionAttendanceStatus) => {
    const key = `${studentId}-${sessionId}`
    setPendingCells((prev) => ({ ...prev, [key]: true }))

    try {
      const token = await getAuthToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      if (attendanceMode === "adhoc") {
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
      } else {
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
      }
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

      if (attendanceMode === "adhoc") {
        const records = rowStudents.map((st) => ({
          adhoc_session_id: sessionId,
          student_id: st.id,
          status: targetStatus,
          attended: targetStatus === "present" || targetStatus === "late",
        }))
        await api.bulkUpsertAdHocSessionAttendances(records)
      } else {
        const records = rowStudents.map((st) => ({
          session_id: sessionId,
          student_id: st.id,
          status: targetStatus,
        }))
        await api.bulkUpsertSessionAttendances(records)
      }

      await loadData()
    } catch (err) {
      console.error(err)
      setError("Failed to batch update attendance")
    } finally {
      setLoading(false)
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
      setNewDate(new Date().toISOString().split("T")[0])
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

  // Metric Summaries
  const stats = React.useMemo(() => {
    let presentCount = 0
    let lateCount = 0
    let absentCount = 0

    const currentAttList = attendanceMode === "adhoc" ? adhocAttendances : attendances
    currentAttList.forEach((a) => {
      if (a.status === "present") presentCount++
      else if (a.status === "late") lateCount++
      else if (a.status === "absent") absentCount++
    })

    const totalMarked = presentCount + lateCount + absentCount
    const attendanceRate = totalMarked > 0 ? Math.round(((presentCount + lateCount) / totalMarked) * 100) : 0

    return {
      totalStudents: students.length,
      totalSessions: activeSessions.length,
      presentCount,
      lateCount,
      absentCount,
      attendanceRate,
    }
  }, [attendanceMode, adhocAttendances, attendances, students, activeSessions])

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
    return activeSessions.map((session, idx) => {
      const d = getSessionStartTime(session)
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })
      const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
      return {
        value: session.id.toString(),
        label: `#${idx + 1} • ${dateStr} (${timeStr})`,
      }
    })
  }, [activeSessions])

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
    <div className="space-y-6">
      {/* Standard Header */}
      <StandardPageHeader
        title="Session Attendance"
        description="View and log attendance with high-performance ranged query filters."
        secondaryAction={{
          label: lastLoaded ? "Refresh" : "Load Data",
          onClick: loadData,
          icon: <RotateCcw className={`size-4 ${loading ? "animate-spin" : ""}`} />,
        }}
        primaryAction={
          attendanceMode === "adhoc"
            ? {
                label: "Add Ad-Hoc Session",
                onClick: () => {
                  setIsAddSessionOpen(true)
                  if (subjects.length > 0) setNewSubjectId(subjects[0].id.toString())
                  if (teachers.length > 0) setNewTeacherId(teachers[0].id.toString())
                  setNewStartTime("09:00:00")
                  setNewEndTime("10:00:00")
                },
                icon: <Plus className="size-4" />,
              }
            : undefined
        }
      />

      {/* Summary KPI Strip */}
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
            <span className="text-[11px] text-muted-foreground">Logged</span>
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

      {/* Main Unified Control Bar */}
      <Card className="p-4 border-border/80 bg-card shadow-xs space-y-4">
        {/* Top Control Bar: Mode Switchers */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-4">
          {/* Attendance Type Mode */}
          <div className="flex rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => {
                setAttendanceMode("class")
                if (classes.length > 0) setSelectedClassId(classes[0].id.toString())
                else setSelectedClassId("all")
              }}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                attendanceMode === "class"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="size-3.5 text-primary" />
              <span>Class Attendance</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAttendanceMode("adhoc")
                setSelectedClassId("adhoc")
              }}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                attendanceMode === "adhoc"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="size-3.5" />
              <span>Ad-Hoc / Tutoring Sessions</span>
            </button>
          </div>

          {/* Right Group: Layout Mode & Date Range Mode Switchers */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {/* Class Filter */}
          {attendanceMode === "class" && (
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <GraduationCap className="h-3 w-3" /> Class
              </label>
              <SearchableSelect
                options={classItems}
                value={selectedClassId}
                onValueChange={(val) => setSelectedClassId(val)}
                placeholder="Select Class..."
                searchPlaceholder="Search class..."
              />
            </div>
          )}

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
                          : "bg-muted/30 border-border"
                      }`}
                    >
                      <div className="grid gap-0.5">
                        <span className="font-semibold text-sm text-foreground">{student.name}</span>
                        <span className="text-[11px] text-muted-foreground">ID: #{student.id}</span>
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
                  {activeSessions.map((session, idx) => {
                    const d = getSessionStartTime(session)
                    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })
                    const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })

                    return (
                      <TableHead key={session.id} className="min-w-32 text-center text-xs">
                        <div className="flex flex-col items-center py-1">
                          <span className="font-bold text-foreground">#{idx + 1}</span>
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
                    <TableCell colSpan={activeSessions.length + 1} className="h-36 text-center text-muted-foreground">
                      No enrolled students found matching the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rowStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="sticky left-0 z-10 w-56 font-semibold text-foreground text-xs bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex flex-col">
                          <span>{student.name}</span>
                          <span className="text-[10px] font-normal text-muted-foreground">ID: #{student.id}</span>
                        </div>
                      </TableCell>

                      {activeSessions.map((session) => {
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
                                  <SelectValue placeholder="—">
                                    {record?.status
                                      ? (statusItems.find((st) => st.value === record.status)?.label ?? record.status)
                                      : "—"}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent align="center" className="min-w-28">
                                  <SelectItem value="present" className="text-emerald-600 dark:text-emerald-400 font-semibold">Present</SelectItem>
                                  <SelectItem value="late" className="text-amber-600 dark:text-amber-400 font-semibold">Late</SelectItem>
                                  <SelectItem value="absent" className="text-rose-600 dark:text-rose-400 font-semibold">Absent</SelectItem>
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
    </div>
  )
}
