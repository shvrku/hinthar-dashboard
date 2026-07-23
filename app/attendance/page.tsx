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
  BookOpen,
  GraduationCap,
  Users,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
} from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { 
  type Class, 
  type Subject, 
  type Student, 
  type Teacher,
  type ClassStudent, 
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
  if ("timetable_slot" in session) {
    return parseBackendDateTime(session.start_time)
  } else {
    return new Date(`${session.date}T${session.start_time}`)
  }
}

function getSelectStyles(status?: string): string {
  switch (status) {
    case "present":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 focus:ring-emerald-500/50 font-semibold"
    case "late":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 focus:ring-amber-500/50 font-semibold"
    case "absent":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 focus:ring-rose-500/50 font-semibold"
    default:
      return "bg-background text-neutral-400 border-neutral-200 dark:border-neutral-800 focus:ring-neutral-400/50 text-center"
  }
}

const statusItems = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
]

export default function AttendancePage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  // Hydration protection
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Base Data from API
  const [classes, setClasses] = React.useState<Class[]>([])
  const [subjects, setSubjects] = React.useState<Subject[]>([])
  const [teachers, setTeachers] = React.useState<Teacher[]>([])
  const [students, setStudents] = React.useState<Student[]>([])
  const [classStudents, setClassStudents] = React.useState<ClassStudent[]>([])
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [attendances, setAttendances] = React.useState<SessionAttendance[]>([])
  const [adhocSessions, setAdhocSessions] = React.useState<AdHocSession[]>([])
  const [adhocAttendances, setAdhocAttendances] = React.useState<AdHocSessionAttendance[]>([])

  // UI state
  const [loading, setLoading] = React.useState(false)
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  
  // Cell update pending state map: "studentId-sessionId" -> boolean
  const [pendingCells, setPendingCells] = React.useState<Record<string, boolean>>({})

  // Mode Switcher: "class" or "adhoc"
  const [attendanceMode, setAttendanceMode] = React.useState<"class" | "adhoc">("class")

  // Dual View Layout Switcher: "matrix" or "roster"
  const [viewLayout, setViewLayout] = React.useState<"matrix" | "roster">("matrix")

  // Roster View Selected Session ID
  const [rosterSessionId, setRosterSessionId] = React.useState<number | null>(null)
  const [rosterSearch, setRosterSearch] = React.useState("")

  // Filters
  const [selectedClassId, setSelectedClassId] = React.useState<string>("all")
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>("all")
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<string>("all")
  
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1 // 1-indexed
  const [selectedYear, setSelectedYear] = React.useState<number>(currentYear)
  const [selectedMonth, setSelectedMonth] = React.useState<number>(currentMonth)

  // Student Search for manual adding (specifically for Ad-Hoc sessions)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [manuallyAddedStudents, setManuallyAddedStudents] = React.useState<Student[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = React.useState(false)

  // Manual Ad-Hoc Session Creator Form State
  const [isAddSessionOpen, setIsAddSessionOpen] = React.useState(false)
  const [newSubjectId, setNewSubjectId] = React.useState<string>("")
  const [newTeacherId, setNewTeacherId] = React.useState<string>("")
  const [newDate, setNewDate] = React.useState<string>(new Date().toISOString().split("T")[0])
  const [newStartTime, setNewStartTime] = React.useState<string>("09:00:00")
  const [newEndTime, setNewEndTime] = React.useState<string>("10:00:00")
  const [isCreatingSession, setIsCreatingSession] = React.useState(false)

  // Batch Session Generator State
  const [isGeneratingSessions, setIsGeneratingSessions] = React.useState(false)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  const handleGenerateSessions = async () => {
    if (selectedClassId === "all" || selectedClassId === "adhoc") return
    setIsGeneratingSessions(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const classId = Number(selectedClassId)
      const res = await api.generateSessionsForClass(classId)
      setSuccessMsg(`Successfully generated ${res.created_count} session(s) from timetable slots.`)
      const [sessionsData, attendancesData] = await Promise.all([
        api.listSessions({ class_id: classId }),
        api.listSessionAttendances(),
      ])
      setSessions(sessionsData)
      setAttendances(attendancesData)
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to generate sessions")
      }
    } finally {
      setIsGeneratingSessions(false)
    }
  }

  // Prefetch filter options (Classes, Subjects, Teachers) automatically on mount so combobox options are available before load data is clicked
  const prefetchOptions = React.useCallback(async () => {
    if (!isLoaded || !isSignedIn) return
    try {
      const token = await getToken()
      if (!token) return
      const api = createApi(token)
      const [classesData, subjectsData, teachersData] = await Promise.all([
        api.listClasses(),
        api.listSubjects(),
        api.listTeachers(),
      ])
      setClasses(classesData)
      setSubjects(subjectsData)
      setTeachers(teachersData)

      if (classesData.length > 0) {
        setSelectedClassId((prev) => (prev === "all" ? classesData[0].id.toString() : prev))
      }
    } catch {
      // silent
    }
  }, [getToken, isLoaded, isSignedIn])

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      prefetchOptions()
    }
  }, [isLoaded, isSignedIn, prefetchOptions])

  // Fetch full attendance data query
  const loadData = React.useCallback(async () => {
    if (!isLoaded || !isSignedIn) return
    setLoading(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      const sessionParams = {
        class_id: selectedClassId !== "all" && selectedClassId !== "adhoc" ? selectedClassId : undefined,
        subject_id: selectedSubjectId !== "all" ? selectedSubjectId : undefined,
        teacher_id: selectedTeacherId !== "all" ? selectedTeacherId : undefined,
      }

      const [
        classesData,
        subjectsData,
        teachersData,
        studentsData,
        classStudentsData,
        sessionsData,
        attendancesData,
        adhocSessionsData,
        adhocAttendancesData,
      ] = await Promise.all([
        api.listClasses(),
        api.listSubjects(),
        api.listTeachers(),
        api.listStudents(),
        api.listClassStudents(sessionParams.class_id ? { class_id: sessionParams.class_id } : undefined),
        api.listSessions(sessionParams),
        api.listSessionAttendances(),
        api.listAdHocSessions({ subject_id: sessionParams.subject_id, teacher_id: sessionParams.teacher_id }),
        api.listAdHocSessionAttendances(),
      ])

      setClasses(classesData)
      setSubjects(subjectsData)
      setTeachers(teachersData)
      setStudents(studentsData)
      setClassStudents(classStudentsData)
      setSessions(sessionsData)
      setAttendances(attendancesData)
      setAdhocSessions(adhocSessionsData)
      setAdhocAttendances(adhocAttendancesData)

      if (classesData.length > 0 && selectedClassId === "all") {
        setSelectedClassId(classesData[0].id.toString())
      }

      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to fetch attendance data")
      }
    } finally {
      setLoading(false)
    }
  }, [getToken, isLoaded, isSignedIn, selectedClassId])

  // Computed: Row Students based on mode & class selection
  const rowStudents = React.useMemo(() => {
    if (attendanceMode === "adhoc") {
      const map = new Map<number, Student>()
      students.forEach((s) => map.set(s.id, s))
      manuallyAddedStudents.forEach((s) => map.set(s.id, s))
      return Array.from(map.values())
    }

    if (selectedClassId === "all") return students

    const targetClassId = Number(selectedClassId)
    const activeClassStudentRelations = classStudents.filter((cs) => {
      const cId = typeof cs.class_obj === "object" && cs.class_obj ? cs.class_obj.id : cs.class_obj_id ?? (typeof cs.class_obj === "number" ? cs.class_obj : null)
      return cId === targetClassId
    })

    const studentIds = new Set(
      activeClassStudentRelations.map((cs) => {
        return typeof cs.student === "object" && cs.student ? cs.student.id : cs.student_id ?? (typeof cs.student === "number" ? cs.student : null)
      })
    )

    return students.filter((s) => studentIds.has(s.id))
  }, [attendanceMode, selectedClassId, students, classStudents, manuallyAddedStudents])

  // Filtered Sessions for Column Headers
  const filteredSessions = React.useMemo(() => {
    if (attendanceMode === "adhoc") {
      return adhocSessions.filter((s) => {
        const d = parseBackendDateTime(`${s.date}T${s.start_time}`)
        if (isNaN(d.getTime())) return true

        const matchYear = d.getFullYear() === Number(selectedYear)
        const matchMonth = d.getMonth() + 1 === Number(selectedMonth)
        const matchSubject = selectedSubjectId === "all" || (s.subject && s.subject.id.toString() === selectedSubjectId)
        const matchTeacher = selectedTeacherId === "all" || (s.teacher && s.teacher.id.toString() === selectedTeacherId)

        return matchYear && matchMonth && matchSubject && matchTeacher
      })
    }

    return sessions.filter((s) => {
      const d = parseBackendDateTime(s.start_time)
      if (isNaN(d.getTime())) return true

      const matchYear = d.getFullYear() === Number(selectedYear)
      const matchMonth = d.getMonth() + 1 === Number(selectedMonth)
      const matchClass = selectedClassId === "all" || (s.class_obj && s.class_obj.id.toString() === selectedClassId)
      const matchSubject = selectedSubjectId === "all" || (s.timetable_slot && s.timetable_slot.subject && s.timetable_slot.subject.id.toString() === selectedSubjectId)
      const matchTeacher = selectedTeacherId === "all" || (s.teacher && s.teacher.id.toString() === selectedTeacherId)

      return matchYear && matchMonth && matchClass && matchSubject && matchTeacher
    })
  }, [attendanceMode, adhocSessions, sessions, selectedYear, selectedMonth, selectedClassId, selectedSubjectId, selectedTeacherId])

  // Auto-select first session for Roster view if none selected
  React.useEffect(() => {
    if (viewLayout === "roster" && filteredSessions.length > 0) {
      if (rosterSessionId === null || !filteredSessions.some((s) => s.id === rosterSessionId)) {
        setRosterSessionId(filteredSessions[0].id)
      }
    }
  }, [viewLayout, filteredSessions, rosterSessionId])

  // Selected session object for Roster view
  const selectedRosterSession = React.useMemo(() => {
    if (!rosterSessionId) return null
    return filteredSessions.find((s) => s.id === rosterSessionId) ?? null
  }, [filteredSessions, rosterSessionId])

  // Status mapping helper
  const getAttendanceRecord = (studentId: number, sessionId: number) => {
    if (attendanceMode === "adhoc") {
      return adhocAttendances.find((a) => {
        const sId = typeof a.student === "object" && a.student ? a.student.id : a.student_id ?? (typeof a.student === "number" ? a.student : null)
        const sessId = typeof a.adhoc_session === "object" && a.adhoc_session ? a.adhoc_session.id : (a.ad_hoc_session && typeof a.ad_hoc_session === "object" ? a.ad_hoc_session.id : (a.adhoc_session_id ?? a.ad_hoc_session_id ?? (typeof a.adhoc_session === "number" ? a.adhoc_session : null)))
        return sId === studentId && sessId === sessionId
      })
    } else {
      return attendances.find((a) => {
        const sId = typeof a.student === "object" && a.student ? a.student.id : a.student_id ?? (typeof a.student === "number" ? a.student : null)
        const sessId = typeof a.session === "object" && a.session ? a.session.id : a.session_id ?? (typeof a.session === "number" ? a.session : null)
        return sId === studentId && sessId === sessionId
      })
    }
  }

  // Attendance Status Change Handler
  const handleStatusChange = async (studentId: number, sessionId: number, newStatus: SessionAttendanceStatus) => {
    const key = `${studentId}-${sessionId}`
    setPendingCells((prev) => ({ ...prev, [key]: true }))

    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      const existingRecord = getAttendanceRecord(studentId, sessionId)
      const isAttended = newStatus === "present" || newStatus === "late"

      if (attendanceMode === "adhoc") {
        if (existingRecord) {
          const updated = await api.updateAdHocSessionAttendance(existingRecord.id, {
            status: newStatus,
            attended: isAttended,
          })
          setAdhocAttendances((prev) =>
            prev.map((item) => (item.id === existingRecord.id ? { ...item, ...updated, status: newStatus } : item))
          )
        } else {
          const created = await api.createAdHocSessionAttendance({
            adhoc_session: sessionId,
            student: studentId,
            status: newStatus,
            attended: isAttended,
          })
          setAdhocAttendances((prev) => [...prev, { ...created, status: newStatus }])
        }
      } else {
        if (existingRecord) {
          const updated = await api.updateSessionAttendance(existingRecord.id, {
            status: newStatus,
            attended: isAttended,
          })
          setAttendances((prev) =>
            prev.map((item) => (item.id === existingRecord.id ? { ...item, ...updated, status: newStatus } : item))
          )
        } else {
          const created = await api.createSessionAttendance({
            session: sessionId,
            student: studentId,
            status: newStatus,
            attended: isAttended,
          })
          setAttendances((prev) => [...prev, { ...created, status: newStatus }])
        }
      }
    } catch (err) {
      console.error(err)
      setError("Failed to save attendance record")
    } finally {
      setPendingCells((prev) => ({ ...prev, [key]: false }))
    }
  }

  // 1-Tap Roster Quick Actions
  const handleMarkAllPresent = async (sessionId: number) => {
    for (const student of rowStudents) {
      await handleStatusChange(student.id, sessionId, "present")
    }
  }

  // Handle Create Ad-Hoc Session Form Submit
  const handleCreateAdHocSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubjectId || !newTeacherId || !newDate || !newStartTime || !newEndTime) return

    setIsCreatingSession(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      const formattedStartTime = newStartTime.length === 5 ? `${newStartTime}:00` : newStartTime
      const formattedEndTime = newEndTime.length === 5 ? `${newEndTime}:00` : newEndTime

      const created = await api.createAdHocSession({
        subject_id: Number(newSubjectId),
        teacher_id: Number(newTeacherId),
        date: newDate,
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        status: "scheduled",
      })

      setAdhocSessions((prev) => [...prev, created])

      setNewSubjectId("")
      setNewTeacherId("")
      setNewDate(new Date().toISOString().split("T")[0])
      setNewStartTime("09:00:00")
      setNewEndTime("10:00:00")
      setIsAddSessionOpen(false)
    } catch (err) {
      console.error(err)
      setError(err instanceof ApiError ? err.userMessage : "Failed to create ad-hoc session")
    } finally {
      setIsCreatingSession(false)
    }
  }

  const classItems = React.useMemo(() => {
    const list = classes.map((c) => ({
      value: c.id.toString(),
      label: `${c.education_level} - ${c.cohort_identifier} ${c.cohort_sub_category ? `(${c.cohort_sub_category})` : ""}`.trim(),
    }))
    return [{ value: "all", label: "All Classes" }, ...list]
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
    return filteredSessions.map((session, idx) => {
      const d = getSessionStartTime(session)
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })
      const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
      return {
        value: session.id.toString(),
        label: `#${idx + 1} • ${dateStr} (${timeStr})`,
      }
    })
  }, [filteredSessions])

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-7xl">
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
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-background">
        <p className="text-muted-foreground font-medium">Please sign in to view the attendance dashboard.</p>
      </div>
    )
  }

  // Filtered roster students for Session Roster View
  const rosterStudentsFiltered = rowStudents.filter((s) =>
    s.name.toLowerCase().includes(rosterSearch.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Standardized Header */}
      <StandardPageHeader
        title="Session Attendance"
        description="Track and log student attendance across monthly course sessions."
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

      {/* Metric Highlights Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Enrolled Students</p>
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{rowStudents.length}</h2>
            <span className="text-[11px] text-muted-foreground">{filteredSessions.length} Sessions loaded</span>
          </div>
        </Card>
      </div>

      {/* Standardized Combined Management Toolbar Card */}
      <Card className="p-4 shadow-2xs border-border/80 bg-card">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Mode Switcher */}
          <div className="flex rounded-lg border border-border bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => {
                setAttendanceMode("class")
                if (classes.length > 0) {
                  setSelectedClassId(classes[0].id.toString())
                } else {
                  setSelectedClassId("all")
                }
                setSelectedSubjectId("all")
                setSelectedTeacherId("all")
              }}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                attendanceMode === "class"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="size-3.5" />
              <span>Class Attendance</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAttendanceMode("adhoc")
                setSelectedClassId("adhoc")
                if (subjects.length > 0) {
                  setSelectedSubjectId(subjects[0].id.toString())
                } else {
                  setSelectedSubjectId("all")
                }
                if (teachers.length > 0) {
                  setSelectedTeacherId(teachers[0].id.toString())
                } else {
                  setSelectedTeacherId("all")
                }
              }}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                attendanceMode === "adhoc"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="size-3.5" />
              <span>Ad-Hoc / Tutoring Sessions</span>
            </button>
          </div>

          {/* DUAL VIEW SWITCHER */}
          <div className="flex rounded-lg border border-border bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => setViewLayout("matrix")}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
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
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
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
      </Card>

      {/* Add Ad-Hoc Session Dialog */}
      <Dialog open={isAddSessionOpen} onOpenChange={setIsAddSessionOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Manual Ad-Hoc Session</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAdHocSession} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</label>
              <Select 
                value={newSubjectId} 
                onValueChange={(val) => setNewSubjectId(val ?? "")}
              >
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
              <Select 
                value={newTeacherId} 
                onValueChange={(val) => setNewTeacherId(val ?? "")}
              >
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

      {/* Filters Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          {/* Class Filter Combobox */}
          {attendanceMode === "class" && (
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" />
                Class
              </label>
              <SearchableSelect
                options={classItems}
                value={selectedClassId}
                onValueChange={(val) => setSelectedClassId(val)}
                placeholder="Select class..."
                searchPlaceholder="Search class..."
              />
            </div>
          )}

          {/* Subject Filter Combobox */}
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Subject
            </label>
            <SearchableSelect
              options={subjectItems}
              value={selectedSubjectId}
              onValueChange={(val) => setSelectedSubjectId(val)}
              placeholder="Select subject..."
              searchPlaceholder="Search subject..."
            />
          </div>

          {/* Teacher Filter Combobox */}
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Teacher
            </label>
            <SearchableSelect
              options={teacherItems}
              value={selectedTeacherId}
              onValueChange={(val) => setSelectedTeacherId(val)}
              placeholder="Select teacher..."
              searchPlaceholder="Search teacher..."
            />
          </div>

          {/* Month Filter Combobox */}
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Month
            </label>
            <SearchableSelect
              options={monthItems}
              value={selectedMonth.toString()}
              onValueChange={(val) => setSelectedMonth(Number(val))}
              placeholder="Select month..."
              searchPlaceholder="Search month..."
            />
          </div>

          {/* Year Filter Combobox */}
          <div className="w-32 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Year
            </label>
            <SearchableSelect
              options={yearItems}
              value={selectedYear.toString()}
              onValueChange={(val) => setSelectedYear(Number(val))}
              placeholder="Select year..."
              searchPlaceholder="Search year..."
            />
          </div>

          {/* Generate Sessions Button */}
          {attendanceMode === "class" && (
            <div className="pt-2 sm:pt-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateSessions}
                disabled={isGeneratingSessions || selectedClassId === "all" || selectedClassId === "adhoc"}
                className="w-full sm:w-auto h-9 text-xs font-semibold gap-1.5"
              >
                {isGeneratingSessions ? (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <Sparkles className="size-3.5 text-primary" />
                )}
                <span>{isGeneratingSessions ? "Generating..." : "Generate Month Sessions"}</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <Button size="xs" variant="ghost" onClick={() => setSuccessMsg(null)}>
            Dismiss
          </Button>
        </div>
      )}

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

      {/* ── MAIN ATTENDANCE DISPLAY (MATRIX vs ROSTER) ── */}
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
                Select a specific session to record attendance with 1-tap buttons
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkAllPresent(selectedRosterSession.id)}
                  disabled={rowStudents.length === 0}
                  className="h-10 text-xs font-semibold gap-1.5"
                >
                  <Sparkles className="size-4 text-emerald-500" />
                  <span>Mark All Present</span>
                </Button>
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
                  {filteredSessions.map((session, idx) => {
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
                      <TableCell className="sticky left-0 z-10 w-56 bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"><div className="h-4 w-36 animate-pulse rounded bg-muted" /></TableCell>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <TableCell key={j}><div className="mx-auto h-8 w-24 animate-pulse rounded-lg bg-muted" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rowStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={filteredSessions.length + 1} className="h-36 text-center text-muted-foreground">
                      No enrolled students found for this class.
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

                      {filteredSessions.map((session) => {
                        const record = getAttendanceRecord(student.id, session.id)
                        const key = `${student.id}-${session.id}`
                        const isPending = pendingCells[key]

                        return (
                          <TableCell key={session.id} className="text-center p-2">
                            {isPending ? (
                              <div className="flex h-9 items-center justify-center">
                                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                              </div>
                            ) : (
                              <Select
                                value={record ? (record.status ?? "absent") : "absent"}
                                onValueChange={(val) => handleStatusChange(student.id, session.id, val as SessionAttendanceStatus)}
                              >
                                <SelectTrigger 
                                  className={`mx-auto flex h-9 w-28 items-center justify-between rounded-lg border px-2 py-1 text-xs font-semibold shadow-xs transition-all outline-hidden focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${getSelectStyles(record?.status ?? undefined)}`}
                                  size="sm"
                                >
                                  <SelectValue placeholder="Absent">
                                    {statusItems.find((st) => st.value === record?.status)?.label ?? (record?.status ? record.status : "Absent")}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent align="center" className="min-w-28">
                                  <SelectItem value="present" className="text-emerald-600 dark:text-emerald-400 font-semibold">Present</SelectItem>
                                  <SelectItem value="late" className="text-amber-600 dark:text-amber-400 font-semibold">Late</SelectItem>
                                  <SelectItem value="absent" className="text-rose-600 dark:text-rose-400 font-semibold">Absent</SelectItem>
                                </SelectContent>
                              </Select>
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
