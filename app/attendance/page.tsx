"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { 
  Check, 
  X, 
  Clock, 
  Loader2, 
  Search, 
  Plus, 
  AlertCircle, 
  RefreshCw, 
  UserPlus, 
  Calendar,
  BookOpen,
  GraduationCap,
  Users,
  RotateCcw,
  LayoutGrid,
  ListFilter,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
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

  // Fetch all starting data
  const loadData = React.useCallback(async () => {
    if (!isLoaded || !isSignedIn) return
    setLoading(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

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
        api.listClassStudents(),
        api.listSessions(),
        api.listSessionAttendances(),
        api.listAdHocSessions(),
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

      // Set defaults based on mode if not already initialized
      if (classesData.length > 0) {
        setSelectedClassId((prev) => (prev === "all" ? classesData[0].id.toString() : prev))
      }
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      console.error(err)
      setError(err instanceof ApiError ? err.userMessage : "Failed to load attendance data")
    } finally {
      setLoading(false)
    }
  }, [getToken, isLoaded, isSignedIn])



  // Reset manually added students when filters change
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setManuallyAddedStudents([])
    }, 0)
    return () => clearTimeout(timer)
  }, [selectedClassId, selectedSubjectId, selectedTeacherId, attendanceMode])

  // Filter sessions based on Selected Month, Class, Subject, and Teacher
  const filteredSessions = React.useMemo(() => {
    if (attendanceMode === "class") {
      return sessions
        .filter((s) => {
          const date = parseBackendDateTime(s.start_time)
          if (isNaN(date.getTime())) return false

          // Month & Year Filter
          const matchesMonth = date.getMonth() + 1 === selectedMonth
          const matchesYear = date.getFullYear() === selectedYear
          if (!matchesMonth || !matchesYear) return false

          // Class Filter (required)
          if (selectedClassId === "all") return false
          if (s.class_obj?.id !== Number(selectedClassId)) return false

          // Subject Filter (optional)
          if (selectedSubjectId !== "all") {
            if (s.timetable_slot?.subject?.id !== Number(selectedSubjectId)) return false
          }

          // Teacher Filter (optional)
          if (selectedTeacherId !== "all") {
            if (s.teacher?.id !== Number(selectedTeacherId)) return false
          }

          return true
        })
        .sort((a, b) => {
          const da = parseBackendDateTime(a.start_time).getTime()
          const db = parseBackendDateTime(b.start_time).getTime()
          return da - db
        })
    } else {
      // adhoc mode
      return adhocSessions
        .filter((s) => {
          const date = new Date(`${s.date}T${s.start_time}`)
          if (isNaN(date.getTime())) return false

          // Month & Year Filter
          const matchesMonth = date.getMonth() + 1 === selectedMonth
          const matchesYear = date.getFullYear() === selectedYear
          if (!matchesMonth || !matchesYear) return false

          // Subject Filter (required)
          if (selectedSubjectId === "all" || selectedSubjectId === "adhoc") return false
          if (s.subject?.id !== Number(selectedSubjectId)) return false

          // Teacher Filter (required)
          if (selectedTeacherId === "all") return false
          if (s.teacher?.id !== Number(selectedTeacherId)) return false

          return true
        })
        .sort((a, b) => {
          const da = new Date(`${a.date}T${a.start_time}`).getTime()
          const db = new Date(`${b.date}T${b.start_time}`).getTime()
          return da - db
        })
    }
  }, [sessions, adhocSessions, attendanceMode, selectedClassId, selectedSubjectId, selectedTeacherId, selectedMonth, selectedYear])

  // Automatically select first session for roster view when sessions update
  React.useEffect(() => {
    if (filteredSessions.length > 0) {
      if (rosterSessionId === null || !filteredSessions.some((s) => s.id === rosterSessionId)) {
        setRosterSessionId(filteredSessions[0].id)
      }
    } else {
      setRosterSessionId(null)
    }
  }, [filteredSessions, rosterSessionId])

  // Selected session object for Roster View
  const selectedRosterSession = React.useMemo(() => {
    if (!rosterSessionId) return null
    return filteredSessions.find((s) => s.id === rosterSessionId) ?? null
  }, [filteredSessions, rosterSessionId])

  // Identify which students should show up as Rows
  const rowStudents = React.useMemo(() => {
    let baseStudents: Student[] = []

    if (attendanceMode === "adhoc") {
      // Ad-hoc tutoring: find students who have any attendance record in the filtered sessions
      const filteredSessionIds = filteredSessions.map((fs) => fs.id)
      const studentsWithAttendanceIds = adhocAttendances
        .filter((a) => a.ad_hoc_session && filteredSessionIds.includes(a.ad_hoc_session.id))
        .map((a) => a.student?.id)
      
      baseStudents = students.filter((s) => studentsWithAttendanceIds.includes(s.id))
    } else {
      if (selectedClassId === "all") {
        baseStudents = students
      } else {
        // Find students enrolled in the selected class
        const targetClassId = Number(selectedClassId)
        const studentIdsInClass = classStudents
          .filter((cs) => {
            const cId = typeof cs.class_obj === "object" ? cs.class_obj.id : cs.class_obj
            return cId === targetClassId
          })
          .map((cs) => {
            return typeof cs.student === "object" ? cs.student.id : cs.student
          })

        baseStudents = students.filter((s) => studentIdsInClass.includes(s.id))
      }
    }

    // Combine with manually added students (from the search) and remove duplicates
    const combined = [...baseStudents, ...manuallyAddedStudents]
    const seen = new Set<number>()
    const unique: Student[] = []
    
    for (const student of combined) {
      if (!seen.has(student.id)) {
        seen.add(student.id)
        unique.push(student)
      }
    }

    // Sort alphabetically by name
    return unique.sort((a, b) => a.name.localeCompare(b.name))
  }, [students, classStudents, selectedClassId, manuallyAddedStudents, filteredSessions, adhocAttendances, attendanceMode])

  // Update attendance status using the select dropdown or roster toggle
  const handleStatusChange = async (studentId: number, sessionId: number, newStatus: SessionAttendanceStatus) => {
    if (!isLoaded || !isSignedIn) {
      setError("Authentication state is loading or user is not signed in.")
      return
    }

    const cellKey = `${studentId}-${sessionId}`
    if (pendingCells[cellKey]) return

    setPendingCells((prev) => ({ ...prev, [cellKey]: true }))
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      if (attendanceMode === "class") {
        const existing = attendances.find((a) => a.student_id === studentId && a.session_id === sessionId)

        if (existing) {
          const updated = await api.updateSessionAttendance(existing.id, { status: newStatus })
          const updatedWithIds = {
            ...updated,
            session_id: sessionId,
            student_id: studentId,
          }
          setAttendances((prev) => prev.map((a) => (a.id === existing.id ? updatedWithIds : a)))
        } else {
          const newRecord = await api.createSessionAttendance({
            session_id: sessionId,
            student_id: studentId,
            status: newStatus,
          })
          const recordWithIds = {
            ...newRecord,
            session_id: sessionId,
            student_id: studentId,
          }
          setAttendances((prev) => [...prev, recordWithIds])
        }
      } else {
        // adhoc mode
        const existing = adhocAttendances.find((a) => a.student?.id === studentId && a.ad_hoc_session?.id === sessionId)

        if (existing) {
          const updated = await api.updateAdHocSessionAttendance(existing.id, { status: newStatus })
          const updatedWithIds = {
            ...updated,
            ad_hoc_session_id: sessionId,
            student_id: studentId,
            ad_hoc_session: updated.ad_hoc_session || existing.ad_hoc_session || { id: sessionId },
            student: updated.student || existing.student || { id: studentId },
          }
          setAdhocAttendances((prev) => prev.map((a) => (a.id === existing.id ? updatedWithIds : a)))
        } else {
          const newRecord = await api.createAdHocSessionAttendance({
            ad_hoc_session_id: sessionId,
            student_id: studentId,
            status: newStatus,
          })
          const recordWithIds = {
            ...newRecord,
            ad_hoc_session_id: sessionId,
            student_id: studentId,
            ad_hoc_session: newRecord.ad_hoc_session || { id: sessionId },
            student: newRecord.student || { id: studentId },
          }
          setAdhocAttendances((prev) => [...prev, recordWithIds])
        }
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof ApiError ? err.userMessage : "Failed to update attendance")
    } finally {
      setPendingCells((prev) => ({ ...prev, [cellKey]: false }))
    }
  }

  // Batch action: Mark All Present for a session
  const handleMarkAllPresent = async (sessionId: number) => {
    if (rowStudents.length === 0) return
    for (const student of rowStudents) {
      await handleStatusChange(student.id, sessionId, "present")
    }
  }

  // Handle manual creation of ad-hoc session
  const handleCreateAdHocSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || !isSignedIn) return
    if (!newSubjectId || !newTeacherId || !newDate || !newStartTime || !newEndTime) {
      setError("Please fill in all required fields.")
      return
    }

    setIsCreatingSession(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      // Format times to HH:MM:SS format
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

      // Append the newly created session to the list of ad-hoc sessions
      setAdhocSessions((prev) => [...prev, created])

      // Reset form states
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

  // Student Search filter results
  const searchResults = React.useMemo(() => {
    if (!searchQuery) return []
    const normalizedQuery = searchQuery.toLowerCase()
    
    // Don't show students already in the row list
    const currentStudentIds = rowStudents.map((s) => s.id)
    
    return students
      .filter((s) => s.name.toLowerCase().includes(normalizedQuery) && !currentStudentIds.includes(s.id))
      .slice(0, 5) // Limit to top 5 results
  }, [searchQuery, students, rowStudents])

  // Handle adding student from search to the row list
  const handleAddManualStudent = (student: Student) => {
    setManuallyAddedStudents((prev) => [...prev, student])
    setSearchQuery("")
    setShowSearchDropdown(false)
  }

  const classItems = React.useMemo(() => {
    return classes.map((c) => ({
      value: c.id.toString(),
      label: `${c.education_level} - ${c.cohort_identifier} ${c.cohort_sub_category ? `(${c.cohort_sub_category})` : ""}`.trim(),
    }))
  }, [classes])

  const subjectItems = React.useMemo(() => {
    const list = subjects.map((sub) => ({ value: sub.id.toString(), label: sub.name }))
    if (attendanceMode === "class") {
      return [{ value: "all", label: "All Subjects" }, ...list]
    }
    return list
  }, [subjects, attendanceMode])

  const teacherItems = React.useMemo(() => {
    const list = teachers.map((t) => ({ value: t.id.toString(), label: t.name }))
    if (attendanceMode === "class") {
      return [{ value: "all", label: "All Teachers" }, ...list]
    }
    return list
  }, [teachers, attendanceMode])

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

  const resolvedClassName = React.useMemo(() => {
    if (attendanceMode === "adhoc") return "Ad-Hoc / Tutoring Sessions (No Class)"
    const c = classes.find((cls) => cls.id === Number(selectedClassId))
    return c ? `${c.education_level} - ${c.cohort_identifier} ${c.cohort_sub_category ? `(${c.cohort_sub_category})` : ""}` : "Select a Class"
  }, [classes, selectedClassId, attendanceMode])

  const resolvedSubjectName = React.useMemo(() => {
    if (selectedSubjectId === "all") return "All Subjects"
    if (selectedSubjectId === "adhoc") return "Ad-Hoc"
    const s = subjects.find((sub) => sub.id === Number(selectedSubjectId))
    return s ? s.name : "Select a Subject"
  }, [subjects, selectedSubjectId])

  const resolvedTeacherName = React.useMemo(() => {
    if (selectedTeacherId === "all") return "All Teachers"
    const t = teachers.find((t) => t.id === Number(selectedTeacherId))
    return t ? t.name : "Select a Teacher"
  }, [teachers, selectedTeacherId])

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

  // Render Splash screen if not loaded yet
  if (!lastLoaded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center bg-background p-6 text-center"
      >
        <motion.div
          whileHover={{ scale: 1.08, rotate: 3 }}
          className="h-16 w-16 rounded-2xl bg-card border border-border flex items-center justify-center mb-4 shadow-sm"
        >
          <Users className="h-7 w-7 text-muted-foreground" />
        </motion.div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Attendance Dashboard</h2>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          Connect to the school management system API to load classes, subjects, teachers, and attendance sheets.
        </p>
        {error && (
          <div className="mb-4 max-w-md mx-auto text-sm text-destructive rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2">
            {error}
          </div>
        )}
        <Button onClick={loadData} disabled={loading} size="lg">
          {loading ? (
            <>
              <Loader2 className="mr-2 size-5 animate-spin" />
              Loading Attendance...
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 size-5" />
              Load Attendance Sheet
            </>
          )}
        </Button>
      </motion.div>
    )
  }

  // Filtered roster students for Session Roster View
  const rosterStudentsFiltered = rowStudents.filter((s) =>
    s.name.toLowerCase().includes(rosterSearch.toLowerCase()),
  )

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-7xl flex-1 space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Session Attendance</h1>
          <p className="text-muted-foreground">
            Track and log student attendance across monthly course sessions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {attendanceMode === "adhoc" && (
            <Button size="sm" onClick={() => {
              setIsAddSessionOpen(true)
              if (subjects.length > 0) setNewSubjectId(subjects[0].id.toString())
              if (teachers.length > 0) setNewTeacherId(teachers[0].id.toString())
              setNewStartTime("09:00:00")
              setNewEndTime("10:00:00")
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Ad-Hoc Session
            </Button>
          )}

          {/* DUAL VIEW SWITCHER: Matrix Grid vs Session Roster */}
          <div className="flex rounded-xl border border-border bg-muted/50 p-1">
            <button
              onClick={() => setViewLayout("matrix")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewLayout === "matrix"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="size-3.5" />
              <span>Matrix Grid</span>
            </button>
            <button
              onClick={() => setViewLayout("roster")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewLayout === "roster"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="size-3.5" />
              <span>Session Roster</span>
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Mode Switcher */}
      <div className="flex gap-2 border-b pb-4 border-neutral-200 dark:border-neutral-800">
        <Button
          variant={attendanceMode === "class" ? "default" : "outline"}
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
          className="shadow-xs"
        >
          <GraduationCap className="mr-2 h-4 w-4" />
          Class Attendance
        </Button>
        <Button
          variant={attendanceMode === "adhoc" ? "default" : "outline"}
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
          className="shadow-xs"
        >
          <BookOpen className="mr-2 h-4 w-4" />
          Ad-Hoc / Tutoring Sessions
        </Button>
      </div>

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
                items={subjects.map((s) => ({ value: s.id.toString(), label: s.name }))}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select Subject" />
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
                items={teachers.map((t) => ({ value: t.id.toString(), label: t.name }))}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select Teacher" />
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
          {/* Class Filter */}
          {attendanceMode === "class" && (
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" />
                Class
              </label>
              <Select 
                value={selectedClassId} 
                onValueChange={(val) => setSelectedClassId(val ?? "")}
                items={classItems}
              >
                <SelectTrigger className="w-full h-10 bg-background">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.education_level} - {c.cohort_identifier} {c.cohort_sub_category ? `(${c.cohort_sub_category})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Subject Filter */}
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Subject
            </label>
            <Select 
              value={selectedSubjectId} 
              onValueChange={(val) => setSelectedSubjectId(val ?? "")}
              items={subjectItems}
            >
              <SelectTrigger className="w-full h-10 bg-background">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {attendanceMode === "class" ? (
                  <>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id.toString()}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </>
                ) : (
                  <>
                    {subjects.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id.toString()}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Teacher Filter */}
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Teacher
            </label>
            <Select 
              value={selectedTeacherId} 
              onValueChange={(val) => setSelectedTeacherId(val ?? "")}
              items={teacherItems}
            >
              <SelectTrigger className="w-full h-10 bg-background">
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                {attendanceMode === "class" ? (
                  <>
                    <SelectItem value="all">All Teachers</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </>
                ) : (
                  <>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Month Filter */}
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Month
            </label>
            <Select 
              value={selectedMonth.toString()} 
              onValueChange={(val) => setSelectedMonth(Number(val))}
              items={monthItems}
            >
              <SelectTrigger className="w-full h-10 bg-background">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Filter */}
          <div className="w-32 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              Year
            </label>
            <Select 
              value={selectedYear.toString()} 
              onValueChange={(val) => setSelectedYear(Number(val))}
              items={yearItems}
            >
              <SelectTrigger className="w-full h-10 bg-background">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dynamic Student Adder Section */}
        {(attendanceMode === "adhoc" || selectedClassId !== "all") && (
          <div className="mt-4 pt-4 border-t border-border flex items-center gap-4">
            <div className="relative w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search & Add Student to view..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowSearchDropdown(true)
                }}
                onFocus={() => setShowSearchDropdown(true)}
                className="pl-9 h-10"
              />
              {showSearchDropdown && searchResults.length > 0 && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowSearchDropdown(false)} 
                  />
                  <div className="absolute left-0 right-0 mt-1 z-20 rounded-md border bg-popover text-popover-foreground shadow-md outline-hidden">
                    <div className="p-1">
                      {searchResults.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleAddManualStudent(s)}
                          className="relative flex w-full cursor-pointer select-none items-center rounded-xs px-2 py-1.5 text-sm outline-hidden hover:bg-accent hover:text-accent-foreground"
                        >
                          <UserPlus className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Use this to manually add students not enrolled in the selected class (essential for ad-hoc / tutoring sessions).
            </p>
          </div>
        )}
      </div>

      {/* ── MAIN ATTENDANCE DISPLAY (MATRIX vs ROSTER) ── */}
      {viewLayout === "roster" ? (
        /* ── SESSION ROSTER VIEW (Mobile 1-Tap Toggle List) ── */
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-6">
          {/* Session Switcher Bar */}
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

            {/* Session Selector & Bulk Action */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-64 sm:w-72">
                <Select
                  value={rosterSessionId?.toString() ?? ""}
                  onValueChange={(val) => setRosterSessionId(val ? Number(val) : null)}
                  items={rosterSessionItems}
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Select Session Date…" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSessions.map((session, idx) => {
                      const d = getSessionStartTime(session)
                      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })
                      const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
                      return (
                        <SelectItem key={session.id} value={session.id.toString()}>
                          #{idx + 1} • {dateStr} ({timeStr})
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedRosterSession && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkAllPresent(selectedRosterSession.id)}
                  disabled={rowStudents.length === 0}
                  className="gap-1.5 shadow-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30"
                >
                  <CheckCircle2 className="size-4" />
                  <span>Mark All Present</span>
                </Button>
              )}
            </div>
          </div>

          {/* Roster Controls & Search */}
          {selectedRosterSession ? (
            <>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search student roster..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="pl-9 bg-background"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Badge variant="secondary" className="px-3 py-1">
                    {rosterStudentsFiltered.length} student{rosterStudentsFiltered.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </div>

              {/* Roster Cards List */}
              {rosterStudentsFiltered.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                  <Users className="size-8 opacity-30 mb-2" />
                  <p className="text-sm font-semibold">No students found in this roster.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {rosterStudentsFiltered.map((student) => {
                    const cellKey = `${student.id}-${selectedRosterSession.id}`
                    const isPending = pendingCells[cellKey]
                    const record = attendanceMode === "class"
                      ? attendances.find((a) => a.student_id === student.id && a.session_id === selectedRosterSession.id)
                      : adhocAttendances.find((a) => a.student?.id === student.id && a.ad_hoc_session?.id === selectedRosterSession.id)
                    const status = record?.status ?? ""

                    return (
                      <motion.div
                        key={student.id}
                        whileHover={{ scale: 1.005 }}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${
                          status === "present"
                            ? "bg-emerald-500/5 border-emerald-500/30"
                            : status === "late"
                            ? "bg-amber-500/5 border-amber-500/30"
                            : "bg-card border-border"
                        }`}
                      >
                        {/* Student Name */}
                        <div className="flex items-center gap-3 mb-3 sm:mb-0">
                          <div className={`flex size-10 items-center justify-center rounded-lg font-bold text-sm ${
                            status === "present"
                              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : status === "late"
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{student.name}</p>
                            <p className="text-xs text-muted-foreground">ID: #{student.id}</p>
                          </div>
                        </div>

                        {/* 1-Tap Status Toggle Buttons */}
                        {isPending ? (
                          <div className="flex h-9 items-center justify-center px-4">
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
                            <motion.button
                              whileTap={{ scale: 0.93 }}
                              onClick={() => handleStatusChange(student.id, selectedRosterSession.id, "present")}
                              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                                status === "present"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                              }`}
                            >
                              <CheckCircle2 className="size-3.5" />
                              <span>Present</span>
                            </motion.button>

                            <motion.button
                              whileTap={{ scale: 0.93 }}
                              onClick={() => handleStatusChange(student.id, selectedRosterSession.id, "late")}
                              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                                status === "late"
                                  ? "bg-amber-500 text-white shadow-xs"
                                  : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                              }`}
                            >
                              <AlertTriangle className="size-3.5" />
                              <span>Late</span>
                            </motion.button>

                            <motion.button
                              whileTap={{ scale: 0.93 }}
                              onClick={() => handleStatusChange(student.id, selectedRosterSession.id, "absent")}
                              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                                status === "absent"
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                              }`}
                            >
                              <XCircle className="size-3.5" />
                              <span>Absent</span>
                            </motion.button>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              <Calendar className="size-8 opacity-30 mb-2" />
              <p className="text-sm font-semibold">No session selected.</p>
              <p className="text-xs mt-1">Please pick a class and date to load the attendance roster.</p>
            </div>
          )}
        </div>
      ) : (
        /* ── MATRIX GRID SPREADSHEET VIEW ── */
        <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
          {/* Info Header Bar */}
          <div className="p-4 bg-muted/30 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span><strong>Class:</strong> <span className="text-foreground">{resolvedClassName}</span></span>
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-primary" />
                <span><strong>Subject:</strong> <span className="text-foreground">{resolvedSubjectName}</span></span>
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                <span><strong>Teacher:</strong> <span className="text-foreground">{resolvedTeacherName}</span></span>
              </span>
            </div>
          </div>
          
          {loading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Calendar className="h-10 w-10 opacity-30 mb-2" />
              <p className="font-semibold text-sm">No Sessions Found</p>
              <p className="text-xs max-w-sm mt-1">
                No tutoring or class sessions were scheduled for this Class, Subject, and Teacher combination in the selected month.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-none hinthar-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-60 min-w-60 sticky left-0 z-10 bg-card border-r rounded-none">
                      Student Name
                    </TableHead>
                    {filteredSessions.map((session, index) => {
                      const d = getSessionStartTime(session)
                      const dateStr = d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit" })
                      const dayStr = d.toLocaleDateString("en-US", { weekday: "short" })
                      const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
                      
                      return (
                        <TableHead key={session.id} className="text-center min-w-40 py-4 border-r">
                          <div className="flex flex-col items-center relative">
                            {/* Column index / Session Number */}
                            <span className="absolute -top-2 left-1 text-[9px] font-bold text-muted-foreground bg-muted border border-border rounded-full h-4 w-5 flex items-center justify-center">
                              #{index + 1}
                            </span>
                            
                            <span className="font-bold text-sm text-foreground mt-2">{dateStr}</span>
                            <span className="text-xs font-semibold text-muted-foreground">{dayStr} ({timeStr})</span>
                            
                            <div className="flex flex-col gap-1 mt-1.5 items-center">
                              {"timetable_slot" in session && session.timetable_slot ? (
                                <span className="text-[10px] uppercase font-extrabold text-primary px-1.5 py-0.5 bg-primary/10 rounded">
                                  {session.timetable_slot.subject.name}
                                </span>
                              ) : "subject" in session && session.subject ? (
                                <span className="text-[10px] uppercase font-extrabold text-amber-500 px-1.5 py-0.5 bg-amber-500/10 rounded">
                                  {session.subject.name}
                                </span>
                              ) : (
                                <span className="text-[10px] uppercase font-extrabold text-amber-500 px-1.5 py-0.5 bg-amber-500/10 rounded">
                                  Ad-Hoc
                                </span>
                              )}
                              <span className="text-[9px] font-semibold text-muted-foreground truncate max-w-28" title={session.teacher.name}>
                                T: {session.teacher.name}
                              </span>
                            </div>
                          </div>
                        </TableHead>
                      )
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={filteredSessions.length + 1} className="h-32 text-center text-muted-foreground text-sm">
                        No students found. Try adjusting your filters or use the search bar above to manually add students.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rowStudents.map((student) => (
                      <TableRow key={student.id} className="hover:bg-muted/30">
                        {/* Student details column sticky */}
                        <TableCell className="font-semibold sticky left-0 z-10 bg-card border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] rounded-none">
                          <div className="flex flex-col">
                            <span className="text-foreground">{student.name}</span>
                            <span className="text-[10px] text-muted-foreground">ID: #{student.id}</span>
                          </div>
                        </TableCell>
                        {/* Attendance Cells */}
                        {filteredSessions.map((session) => {
                          const cellKey = `${student.id}-${session.id}`
                          const isPending = pendingCells[cellKey]
                          const record = attendanceMode === "class"
                            ? attendances.find((a) => a.student_id === student.id && a.session_id === session.id)
                            : adhocAttendances.find((a) => a.student?.id === student.id && a.ad_hoc_session?.id === session.id)

                          return (
                            <TableCell key={session.id} className="text-center border-r">
                              {isPending ? (
                                <div className="mx-auto flex h-10 w-28 items-center justify-center">
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                              ) : (
                                <Select
                                  value={record ? record.status : "—"}
                                  onValueChange={(val) => handleStatusChange(student.id, session.id, val as SessionAttendanceStatus)}
                                >
                                  <SelectTrigger 
                                    className={`mx-auto flex h-9 w-28 items-center justify-between rounded-lg border px-2 py-1 text-xs font-semibold shadow-xs transition-all outline-hidden focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${getSelectStyles(record?.status)}`}
                                    size="sm"
                                  >
                                    <SelectValue placeholder="Absent" />
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
          )}
        </div>
      )}
    </div>
  )
}
