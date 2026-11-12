"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import {
  CalendarCheck,
  CalendarDays,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  RefreshCw,
  Search,
  X,
  UserCheck,
  Users,
  BookOpen,
  ArrowRight,
  Save,
} from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type {
  Class,
  Subject,
  Teacher,
  Student,
  AttendanceMatrixSession,
  AttendanceMatrixStudent,
  SessionAttendance,
  AdHocSession,
  AdHocSessionAttendance,
  OverviewClassStudent,
  OverviewClassResponse,
} from "@/lib/types"
import { formatClassLabel, formatCohortIdentifier, educationLevelLabel } from "@/lib/format-class"
import { useClassesQuery, useSubjectsQuery, useTeachersSelectQuery } from "@/hooks/use-api-queries"
import {
  SystemHeader,
  CohortSwitcher,
  type CohortSwitcherOption,
  DataModule,
  RollStatusControl,
  type RollAttendanceStatus,
  InspectorSheet,
  CodeChip,
  TelemetryTag,
} from "@/components/design-system/v2-primitives"
import {
  AttendanceMatrixView,
  type MatrixSummaryStats,
} from "@/components/attendance/attendance-matrix-view"
import { toast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  cn,
  toLocalDateString,
  toSessionDateString,
  parseBackendDateTime,
  formatBackendTime,
  formatBackendDate,
} from "@/lib/utils"

interface AttendanceWorkspaceProps {
  initialClassId?: string | number
  initialSessionId?: string | number
  initialDate?: string
  initialAdhoc?: boolean
}

export function AttendanceWorkspace({
  initialClassId,
  initialSessionId,
  initialDate,
  initialAdhoc = false,
}: AttendanceWorkspaceProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getToken, isLoaded, isSignedIn } = useAuth()

  // Base Options Queries
  const classesQuery = useClassesQuery(!!isLoaded && !!isSignedIn)
  const teachersQuery = useTeachersSelectQuery(!!isLoaded && !!isSignedIn)
  const subjectsQuery = useSubjectsQuery(!!isLoaded && !!isSignedIn)

  const classes = React.useMemo(() => classesQuery.data ?? [], [classesQuery.data])
  const teachers = React.useMemo(() => teachersQuery.data ?? [], [teachersQuery.data])
  const subjects = React.useMemo(() => subjectsQuery.data ?? [], [subjectsQuery.data])

  // Map classes to CohortSwitcherOption
  const cohortOptions: CohortSwitcherOption[] = React.useMemo(() => {
    return classes.map((c) => ({
      id: c.id,
      code: formatCohortIdentifier(c),
      level: c.education_level,
      levelLabel: educationLevelLabel(c.education_level),
      studentCount: undefined,
      subjectCount: undefined,
    }))
  }, [classes])

  // Active Tab / View State
  const viewFromUrl = searchParams.get("view") || searchParams.get("tab")
  const [activeTab, setActiveTab] = React.useState<"roll" | "matrix">(
    viewFromUrl === "matrix" ? "matrix" : "roll"
  )

  const handleTabChange = (tabId: string) => {
    const nextTab = tabId as "roll" | "matrix"
    setActiveTab(nextTab)
    const sp = new URLSearchParams(window.location.search)
    sp.set("view", nextTab)
    router.replace(`?${sp.toString()}`, { scroll: false })
  }

  // Monthly Matrix Summary Stats & External Triggers
  const [matrixStats, setMatrixStats] = React.useState<MatrixSummaryStats>({
    totalSessions: 0,
    filteredSessionsCount: 0,
    subjectsCount: 0,
    overallRate: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    excusedCount: 0,
    dirtyCount: 0,
    saving: false,
  })
  const [matrixRefreshTrigger, setMatrixRefreshTrigger] = React.useState(0)
  const [matrixSaveTrigger, setMatrixSaveTrigger] = React.useState(0)

  // Selected Cohort & Date from URL or state
  const classIdParam = searchParams.get("classId") || (initialClassId ? String(initialClassId) : null)
  const isAdhocParam = searchParams.get("adhoc") === "true" || initialAdhoc
  const dateFromUrl = searchParams.get("date") || initialDate || toLocalDateString()
  const sessionIdFromUrl = searchParams.get("sessionId") || searchParams.get("session_id") || (initialSessionId ? String(initialSessionId) : null)

  const [selectedCohortCode, setSelectedCohortCode] = React.useState<string>(
    isAdhocParam ? "ADHOC" : ""
  )
  const [selectedDate, setSelectedDate] = React.useState<string>(dateFromUrl)
  const initializedRef = React.useRef(false)

  // Sync selected cohort with classes once loaded (only on mount / initial load)
  React.useEffect(() => {
    if (initializedRef.current || classes.length === 0) return
    initializedRef.current = true

    if (isAdhocParam) {
      setSelectedCohortCode("ADHOC")
      return
    }

    if (classIdParam) {
      const match = classes.find((c) => String(c.id) === classIdParam)
      if (match) {
        setSelectedCohortCode(formatCohortIdentifier(match))
        return
      }
    }

    if (!selectedCohortCode && classes.length > 0) {
      setSelectedCohortCode(formatCohortIdentifier(classes[0]))
    }
  }, [classes, classIdParam, selectedCohortCode, isAdhocParam])

  // Find active Class
  const activeClass = React.useMemo(() => {
    if (!classes.length || selectedCohortCode === "ADHOC" || !selectedCohortCode) return null
    return (
      classes.find(
        (c) =>
          formatCohortIdentifier(c) === selectedCohortCode ||
          String(c.id) === selectedCohortCode
      ) ?? null
    )
  }, [classes, selectedCohortCode])

  // Date Change Handler (clean URL replace without page scroll or state reset)
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate)
    const sp = new URLSearchParams(window.location.search)
    sp.set("date", newDate)
    router.replace(`?${sp.toString()}`, { scroll: false })
  }

  // Handle Cohort Switcher Value Change
  const handleCohortChange = (newCode: string) => {
    setSelectedCohortCode(newCode)
    const sp = new URLSearchParams(window.location.search)
    if (newCode === "ADHOC") {
      sp.set("adhoc", "true")
      sp.delete("classId")
      sp.delete("sessionId")
    } else {
      sp.delete("adhoc")
      const match = classes.find((c) => formatCohortIdentifier(c) === newCode)
      if (match) sp.set("classId", String(match.id))
      sp.delete("sessionId")
    }
    router.replace(`?${sp.toString()}`, { scroll: false })
  }

  // ---------------------------------------------------------------------------
  // Regular Session State
  // ---------------------------------------------------------------------------
  const [matrixSessions, setMatrixSessions] = React.useState<AttendanceMatrixSession[]>([])
  const [matrixStudents, setMatrixStudents] = React.useState<AttendanceMatrixStudent[]>([])
  const [matrixAttendances, setMatrixAttendances] = React.useState<SessionAttendance[]>([])
  const [gateStudents, setGateStudents] = React.useState<OverviewClassStudent[]>([])
  const [selectedSessionId, setSelectedSessionId] = React.useState<number | null>(
    sessionIdFromUrl ? Number(sessionIdFromUrl) : null
  )

  // Interactive Roll State: studentId -> status
  const [rollStatuses, setRollStatuses] = React.useState<Record<number, RollAttendanceStatus>>({})
  const [remarks, setRemarks] = React.useState<Record<number, string>>({})
  const [excludedStudentIds, setExcludedStudentIds] = React.useState<number[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)

  // Session Delete Confirmation State (Regular & Ad-Hoc)
  const [deleteSessionConfirmOpen, setDeleteSessionConfirmOpen] = React.useState(false)
  const [deletingActiveSession, setDeletingActiveSession] = React.useState(false)

  // UI status
  const [loading, setLoading] = React.useState(false)
  const [savingRoll, setSavingRoll] = React.useState(false)

  // Search in student roster
  const [studentSearch, setStudentSearch] = React.useState("")

  // Hydrate roll statuses for a chosen session from memory without network re-fetch
  const hydrateRollForSession = React.useCallback(
    (
      sessId: number | null,
      studentsList: AttendanceMatrixStudent[],
      attendancesList: SessionAttendance[]
    ) => {
      if (!sessId) {
        setRollStatuses({})
        setRemarks({})
        setExcludedStudentIds([])
        setHasUnsavedChanges(false)
        return
      }

      const sessionAttendances = attendancesList.filter((a) => {
        return (
          a.session_id === sessId ||
          (typeof a.session === "object" && a.session?.id === sessId) ||
          a.session === sessId
        )
      })
      const hasAnySavedAttendances = sessionAttendances.length > 0

      const statusMap: Record<number, RollAttendanceStatus> = {}
      const remarksMap: Record<number, string> = {}
      const excluded: number[] = []

      studentsList.forEach((stu) => {
        const att = sessionAttendances.find((a) => {
          return (
            a.student_id === stu.id ||
            (typeof a.student === "object" && a.student?.id === stu.id) ||
            a.student === stu.id
          )
        })

        if (att) {
          const raw = (att.status || (att.attended ? "present" : "absent")).toLowerCase()
          if (raw === "late") statusMap[stu.id] = "late"
          else if (raw === "absent") statusMap[stu.id] = "absent"
          else if (raw === "excused") statusMap[stu.id] = "excused"
          else statusMap[stu.id] = "present"

          if (att.remarks) remarksMap[stu.id] = att.remarks
        } else if (hasAnySavedAttendances) {
          // Student has no attendance record for this session (removed or enrolled later)
          excluded.push(stu.id)
        } else {
          statusMap[stu.id] = "present"
        }
      })

      setRollStatuses(statusMap)
      setRemarks(remarksMap)
      setExcludedStudentIds(excluded)
      setHasUnsavedChanges(false)
    },
    []
  )

  // Fetch Attendance Matrix & Gate Check-Ins for active cohort & date
  const fetchCohortRoll = React.useCallback(async () => {
    if (!activeClass || !isSignedIn) return
    setLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("Authentication token unavailable")
      const api = createApi(token)

      // Fetch matrix with date_from & date_to matching selectedDate
      const [matrixRes, gateRes] = await Promise.all([
        api.getAttendanceMatrix({
          class_id: activeClass.id,
          date_from: selectedDate,
          date_to: selectedDate,
        }),
        api.overviewClass(selectedDate, activeClass.id).catch(() => null),
      ])

      // Strictly isolate sessions for this specific date
      const daySessions = (matrixRes.sessions || []).filter(
        (s) => toSessionDateString(s.date || s.start_time) === selectedDate
      )
      const fetchedStudents = matrixRes.students || []
      const fetchedAttendances = matrixRes.attendances || []

      setMatrixSessions(daySessions)
      setMatrixStudents(fetchedStudents)
      setMatrixAttendances(fetchedAttendances)

      if (gateRes && "students" in gateRes) {
        setGateStudents((gateRes as OverviewClassResponse).students || [])
      } else {
        setGateStudents([])
      }

      // Pick selected session: prefer current valid selection, then URL param, then first session
      let activeSessId: number | null = null
      if (selectedSessionId && daySessions.some((s) => s.id === selectedSessionId)) {
        activeSessId = selectedSessionId
      } else if (sessionIdFromUrl && daySessions.some((s) => s.id === Number(sessionIdFromUrl))) {
        activeSessId = Number(sessionIdFromUrl)
      } else if (daySessions.length > 0) {
        activeSessId = daySessions[0].id
      }
      setSelectedSessionId(activeSessId)

      hydrateRollForSession(activeSessId, fetchedStudents, fetchedAttendances)
    } catch (err) {
      toast.add({
        title: "Error Loading Roll",
        description: err instanceof ApiError ? err.userMessage : "Failed to load attendance roll",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }, [activeClass, selectedDate, selectedSessionId, sessionIdFromUrl, isSignedIn, getToken, hydrateRollForSession])

  React.useEffect(() => {
    if (selectedCohortCode !== "ADHOC" && activeClass) {
      fetchCohortRoll()
    }
  }, [selectedCohortCode, activeClass, selectedDate])

  // Handle Session Selection Change (Switch session in-memory without resetting dropdown)
  const handleSessionChange = (sessId: number) => {
    setSelectedSessionId(sessId)
    hydrateRollForSession(sessId, matrixStudents, matrixAttendances)
    const sp = new URLSearchParams(window.location.search)
    sp.set("sessionId", String(sessId))
    router.replace(`?${sp.toString()}`, { scroll: false })
  }

  // Update a single student's status
  const handleStatusChange = (studentId: number, newStatus: RollAttendanceStatus) => {
    setRollStatuses((prev) => ({ ...prev, [studentId]: newStatus }))
    setHasUnsavedChanges(true)
  }

  // Update a student's remarks
  const handleRemarkChange = (studentId: number, text: string) => {
    setRemarks((prev) => ({ ...prev, [studentId]: text }))
    setHasUnsavedChanges(true)
  }

  // Active (non-excluded) students for the current regular session
  const activeRegularStudents = React.useMemo(() => {
    if (excludedStudentIds.length === 0) return matrixStudents
    const excludedSet = new Set(excludedStudentIds)
    return matrixStudents.filter((s) => !excludedSet.has(s.id))
  }, [matrixStudents, excludedStudentIds])

  const excludedRegularStudents = React.useMemo(() => {
    if (excludedStudentIds.length === 0) return []
    const excludedSet = new Set(excludedStudentIds)
    return matrixStudents.filter((s) => excludedSet.has(s.id))
  }, [matrixStudents, excludedStudentIds])

  // Bulk mark all active students present
  const handleMarkAllPresent = () => {
    const next: Record<number, RollAttendanceStatus> = { ...rollStatuses }
    activeRegularStudents.forEach((stu) => {
      next[stu.id] = "present"
    })
    setRollStatuses(next)
    setHasUnsavedChanges(true)
  }

  // Remove a student from the active regular session's attendance record
  const handleRemoveRegularStudent = async (studentId: number) => {
    if (!selectedSessionId || !isSignedIn) return
    try {
      const token = await getToken()
      if (!token) return
      const api = createApi(token)
      const att = matrixAttendances.find((a) => {
        const studentMatch =
          a.student_id === studentId ||
          (typeof a.student === "object" && a.student?.id === studentId) ||
          a.student === studentId
        const sessionMatch =
          a.session_id === selectedSessionId ||
          (typeof a.session === "object" && a.session?.id === selectedSessionId) ||
          a.session === selectedSessionId
        return studentMatch && sessionMatch
      })

      if (att && att.id) {
        await api.deleteSessionAttendance(att.id)
        setMatrixAttendances((prev) => prev.filter((item) => item.id !== att.id))
      }
      setExcludedStudentIds((prev) => (prev.includes(studentId) ? prev : [...prev, studentId]))
      toast.add({
        title: "Student Removed from Session",
        description: "Removed student from this session's attendance roll",
        type: "success",
      })
    } catch (err) {
      toast.add({
        title: "Removal Failed",
        description: err instanceof ApiError ? err.userMessage : "Failed to remove student from session",
        type: "error",
      })
    }
  }

  // Restore an excluded cohort student back into the active regular session
  const handleRestoreRegularStudent = async (studentId: number) => {
    if (!selectedSessionId || !isSignedIn) return
    try {
      const token = await getToken()
      if (!token) return
      const api = createApi(token)
      await api.bulkUpsertSessionAttendances([
        {
          session_id: selectedSessionId,
          student_id: studentId,
          status: "present",
        },
      ])
      setExcludedStudentIds((prev) => prev.filter((id) => id !== studentId))
      setRollStatuses((prev) => ({ ...prev, [studentId]: "present" }))
      await fetchCohortRoll()
      toast.add({
        title: "Student Restored",
        description: "Added student back to this session's roll",
        type: "success",
      })
    } catch (err) {
      toast.add({
        title: "Restore Failed",
        description: err instanceof ApiError ? err.userMessage : "Failed to restore student",
        type: "error",
      })
    }
  }

  // Save regular session roll (only active non-excluded students)
  const handleSaveRoll = async () => {
    if (!selectedSessionId || !isSignedIn) return
    setSavingRoll(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No token")
      const api = createApi(token)

      const records = activeRegularStudents.map((stu) => ({
        session_id: selectedSessionId,
        student_id: stu.id,
        status: rollStatuses[stu.id] || "present",
        remarks: remarks[stu.id] || undefined,
      }))

      await api.bulkUpsertSessionAttendances(records)
      setHasUnsavedChanges(false)
      await fetchCohortRoll()
      toast.add({
        title: "Roll Saved",
        description: "Attendance roll saved successfully",
        type: "success",
      })
    } catch (err) {
      toast.add({
        title: "Save Failed",
        description: err instanceof ApiError ? err.userMessage : "Failed to save roll",
        type: "error",
      })
    } finally {
      setSavingRoll(false)
    }
  }

  // Delete the currently selected Regular or Ad-Hoc session
  const handleConfirmDeleteActiveSession = async () => {
    if (!isSignedIn) return
    const isAdhoc = selectedCohortCode === "ADHOC"
    const targetId = isAdhoc ? selectedAdhocId : selectedSessionId
    if (!targetId) return

    setDeletingActiveSession(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No token")
      const api = createApi(token)

      if (isAdhoc) {
        await api.deleteAdHocSession(targetId)
        setSelectedAdhocId(null)
        await fetchAdhocData()
      } else {
        await api.deleteSession(targetId)
        setSelectedSessionId(null)
        await fetchCohortRoll()
      }

      setDeleteSessionConfirmOpen(false)
      toast.add({
        title: "Session Deleted",
        description: "The session and its attendance records have been deleted",
        type: "success",
      })
    } catch (err) {
      toast.add({
        title: "Delete Failed",
        description: err instanceof ApiError ? err.userMessage : "Failed to delete session",
        type: "error",
      })
    } finally {
      setDeletingActiveSession(false)
    }
  }

  // Create Quick Session for Selected Date
  const [creatingQuickSession, setCreatingQuickSession] = React.useState(false)
  const handleCreateTodaySession = async () => {
    if (!activeClass || !isSignedIn) return
    setCreatingQuickSession(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No token")
      const api = createApi(token)

      await api.generateSessionsForClass(activeClass.id, {
        start_date: selectedDate,
        end_date: selectedDate,
      })
      await fetchCohortRoll()
      toast.add({
        title: "Sessions Generated",
        description: `Session occurrences generated for ${selectedDate}`,
        type: "success",
      })
    } catch (err) {
      toast.add({
        title: "Generation Failed",
        description: err instanceof ApiError ? err.userMessage : "Failed to generate session for today",
        type: "error",
      })
    } finally {
      setCreatingQuickSession(false)
    }
  }

  // Filtered Students list (only active students in this session)
  const filteredStudents = React.useMemo(() => {
    const q = studentSearch.toLowerCase().trim()
    if (!q) return activeRegularStudents
    return activeRegularStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.unique_code && s.unique_code.toLowerCase().includes(q))
    )
  }, [activeRegularStudents, studentSearch])

  // Summary Metrics for Active Session
  const activeSession = React.useMemo(() => {
    return matrixSessions.find((s) => s.id === selectedSessionId) ?? null
  }, [matrixSessions, selectedSessionId])

  // ---------------------------------------------------------------------------
  // AD-HOC SESSIONS LOGIC
  // ---------------------------------------------------------------------------
  const [adhocSessions, setAdhocSessions] = React.useState<AttendanceMatrixSession[]>([])
  const [selectedAdhocId, setSelectedAdhocId] = React.useState<number | null>(null)
  const [adhocStudents, setAdhocStudents] = React.useState<AttendanceMatrixStudent[]>([])
  const [adhocAttendances, setAdhocAttendances] = React.useState<AdHocSessionAttendance[]>([])
  const [adhocRoll, setAdhocRoll] = React.useState<Record<number, RollAttendanceStatus>>({})
  const [adhocRemarks, setAdhocRemarks] = React.useState<Record<number, string>>({})
  const [adhocNewOpen, setAdhocNewOpen] = React.useState(false)

  // Add Students to Ad-Hoc session enrollment drawer
  const [addStudentsOpen, setAddStudentsOpen] = React.useState(false)
  const [studentSearchQuery, setStudentSearchQuery] = React.useState("")
  const [searchResultStudents, setSearchResultStudents] = React.useState<Student[]>([])
  const [searchingStudents, setSearchingStudents] = React.useState(false)
  const [selectedStudentIdsToAdd, setSelectedStudentIdsToAdd] = React.useState<number[]>([])
  const [enrollingStudents, setEnrollingStudents] = React.useState(false)

  // New Adhoc Form
  const [newAdhocSubjectId, setNewAdhocSubjectId] = React.useState<string>("")
  const [newAdhocTeacherId, setNewAdhocTeacherId] = React.useState<string>("")
  const [newAdhocTitle, setNewAdhocTitle] = React.useState<string>("")
  const [newAdhocStartTime, setNewAdhocStartTime] = React.useState<string>("14:00")
  const [newAdhocEndTime, setNewAdhocEndTime] = React.useState<string>("15:30")
  const [creatingAdhoc, setCreatingAdhoc] = React.useState(false)

  // Hydrate ad-hoc roll statuses for a chosen ad-hoc session
  const hydrateAdhocRollForSession = React.useCallback(
    (
      sessId: number | null,
      studentsList: AttendanceMatrixStudent[],
      attendancesList: AdHocSessionAttendance[]
    ) => {
      if (!sessId) {
        setAdhocRoll({})
        setAdhocRemarks({})
        setHasUnsavedChanges(false)
        return
      }

      const statusMap: Record<number, RollAttendanceStatus> = {}
      const remarksMap: Record<number, string> = {}

      studentsList.forEach((stu) => {
        const att = attendancesList.find((a) => {
          const studentMatch =
            a.student_id === stu.id ||
            (typeof a.student === "object" && a.student?.id === stu.id) ||
            a.student === stu.id
          const sessionMatch =
            a.adhoc_session_id === sessId ||
            a.ad_hoc_session_id === sessId ||
            (typeof a.adhoc_session === "object" && a.adhoc_session?.id === sessId) ||
            (typeof a.ad_hoc_session === "object" && a.ad_hoc_session?.id === sessId) ||
            a.adhoc_session === sessId ||
            a.ad_hoc_session === sessId
          return studentMatch && sessionMatch
        })

        if (att) {
          const raw = (att.status || (att.attended ? "present" : "absent")).toLowerCase()
          if (raw === "late") statusMap[stu.id] = "late"
          else if (raw === "absent") statusMap[stu.id] = "absent"
          else if (raw === "excused") statusMap[stu.id] = "excused"
          else statusMap[stu.id] = "present"

          if (att.remarks) remarksMap[stu.id] = att.remarks
        } else {
          statusMap[stu.id] = "present"
        }
      })

      setAdhocRoll(statusMap)
      setAdhocRemarks(remarksMap)
      setHasUnsavedChanges(false)
    },
    []
  )

  // Fetch Ad-Hoc Sessions for selected date (without loop from selectedAdhocId)
  const fetchAdhocData = React.useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No token")
      const api = createApi(token)

      const matrixRes = await api.getAdHocAttendanceMatrix({
        date_from: selectedDate,
        date_to: selectedDate,
      })

      // Strictly isolate sessions for this date
      const daySessions = (matrixRes.sessions || []).filter(
        (s) => toSessionDateString(s.date || s.start_time) === selectedDate
      )
      const fetchedStudents = matrixRes.students || []
      const fetchedAttendances = matrixRes.attendances || []

      setAdhocSessions(daySessions)
      setAdhocStudents(fetchedStudents)
      setAdhocAttendances(fetchedAttendances)

      let activeSessId: number | null = null
      if (selectedAdhocId && daySessions.some((s) => s.id === selectedAdhocId)) {
        activeSessId = selectedAdhocId
      } else if (sessionIdFromUrl && daySessions.some((s) => s.id === Number(sessionIdFromUrl))) {
        activeSessId = Number(sessionIdFromUrl)
      } else if (daySessions.length > 0) {
        activeSessId = daySessions[0].id
      }

      setSelectedAdhocId(activeSessId)
      hydrateAdhocRollForSession(activeSessId, fetchedStudents, fetchedAttendances)
    } catch (err) {
      toast.add({
        title: "Error Loading Ad-Hoc Sessions",
        description: err instanceof ApiError ? err.userMessage : "Failed to load ad-hoc data",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }, [selectedDate, selectedAdhocId, sessionIdFromUrl, isSignedIn, getToken, hydrateAdhocRollForSession])

  React.useEffect(() => {
    if (selectedCohortCode === "ADHOC") {
      fetchAdhocData()
    }
  }, [selectedCohortCode, selectedDate])

  const handleAdhocSessionChange = (sessId: number) => {
    setSelectedAdhocId(sessId)
    hydrateAdhocRollForSession(sessId, adhocStudents, adhocAttendances)
    const sp = new URLSearchParams(window.location.search)
    sp.set("sessionId", String(sessId))
    router.replace(`?${sp.toString()}`, { scroll: false })
  }

  // Create New Adhoc Session
  const handleCreateAdhocSession = async () => {
    if (!newAdhocSubjectId || !newAdhocTeacherId || !isSignedIn) return
    setCreatingAdhoc(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No token")
      const api = createApi(token)

      const formattedStart = newAdhocStartTime.length === 5 ? `${newAdhocStartTime}:00` : newAdhocStartTime
      const formattedEnd = newAdhocEndTime.length === 5 ? `${newAdhocEndTime}:00` : newAdhocEndTime

      const created = await api.createAdHocSession({
        subject_id: Number(newAdhocSubjectId),
        teacher_id: Number(newAdhocTeacherId),
        date: selectedDate,
        start_time: formattedStart,
        end_time: formattedEnd,
        status: "scheduled",
        title: newAdhocTitle.trim() || undefined,
      })

      setAdhocNewOpen(false)
      setSelectedAdhocId(created.id)
      await fetchAdhocData()
      toast.add({
        title: "Ad-Hoc Session Created",
        description: "Ad-hoc session created successfully",
        type: "success",
      })
    } catch (err) {
      toast.add({
        title: "Creation Failed",
        description: err instanceof ApiError ? err.userMessage : "Failed to create ad-hoc session",
        type: "error",
      })
    } finally {
      setCreatingAdhoc(false)
    }
  }

  // Search students for enrolling into ad-hoc session
  const handleSearchStudents = React.useCallback(async () => {
    if (!isSignedIn) return
    setSearchingStudents(true)
    try {
      const token = await getToken()
      if (!token) return
      const api = createApi(token)
      const page = await api.listStudentsPage({
        page: 1,
        page_size: 25,
        q: studentSearchQuery.trim() || undefined,
      })
      setSearchResultStudents(page.results || [])
    } catch {
      toast.add({
        title: "Search Failed",
        description: "Could not fetch students matching search query",
        type: "error",
      })
    } finally {
      setSearchingStudents(false)
    }
  }, [isSignedIn, getToken, studentSearchQuery])

  React.useEffect(() => {
    if (addStudentsOpen && searchResultStudents.length === 0 && isSignedIn) {
      handleSearchStudents()
    }
  }, [addStudentsOpen, isSignedIn, handleSearchStudents, searchResultStudents.length])

  // Enroll selected students into active ad-hoc session
  const handleAddStudentsToAdhoc = async () => {
    if (!selectedAdhocId || selectedStudentIdsToAdd.length === 0 || !isSignedIn) return
    setEnrollingStudents(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No token")
      const api = createApi(token)

      const payload = selectedStudentIdsToAdd.map((studentId) => ({
        adhoc_session_id: selectedAdhocId,
        student_id: studentId,
        status: "present",
        attended: true,
      }))

      await api.bulkUpsertAdHocSessionAttendances(payload)
      toast.add({
        title: "Students Added",
        description: `Added ${selectedStudentIdsToAdd.length} student(s) to this ad-hoc session`,
        type: "success",
      })
      setSelectedStudentIdsToAdd([])
      setAddStudentsOpen(false)
      await fetchAdhocData()
    } catch (err) {
      toast.add({
        title: "Enrollment Failed",
        description: err instanceof ApiError ? err.userMessage : "Failed to add students",
        type: "error",
      })
    } finally {
      setEnrollingStudents(false)
    }
  }

  // Remove a student from active ad-hoc session
  const handleRemoveAdhocStudent = async (studentId: number) => {
    if (!selectedAdhocId || !isSignedIn) return
    try {
      const token = await getToken()
      if (!token) return
      const api = createApi(token)
      const att = adhocAttendances.find((a) => {
        const studentMatch =
          a.student_id === studentId ||
          (typeof a.student === "object" && a.student?.id === studentId) ||
          a.student === studentId
        const sessionMatch =
          a.adhoc_session_id === selectedAdhocId ||
          a.ad_hoc_session_id === selectedAdhocId ||
          (typeof a.adhoc_session === "object" && a.adhoc_session?.id === selectedAdhocId) ||
          (typeof a.ad_hoc_session === "object" && a.ad_hoc_session?.id === selectedAdhocId) ||
          a.adhoc_session === selectedAdhocId ||
          a.ad_hoc_session === selectedAdhocId
        return studentMatch && sessionMatch
      })

      if (att && att.id) {
        await api.deleteAdHocSessionAttendance(att.id)
      }
      toast.add({
        title: "Student Removed",
        description: "Removed student from ad-hoc session",
        type: "success",
      })
      await fetchAdhocData()
    } catch (err) {
      toast.add({
        title: "Removal Failed",
        description: err instanceof ApiError ? err.userMessage : "Failed to remove student",
        type: "error",
      })
    }
  }

  // Save Adhoc Roll (all students, not dummy slice)
  const handleSaveAdhocRoll = async () => {
    if (!selectedAdhocId || !isSignedIn) return
    setSavingRoll(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No token")
      const api = createApi(token)

      const records = adhocStudents.map((stu) => ({
        adhoc_session_id: selectedAdhocId,
        student_id: stu.id,
        status: adhocRoll[stu.id] || "present",
        remarks: adhocRemarks[stu.id] || undefined,
      }))

      await api.bulkUpsertAdHocSessionAttendances(records)
      setHasUnsavedChanges(false)
      toast.add({
        title: "Ad-Hoc Roll Saved",
        description: "Ad-hoc attendance saved successfully",
        type: "success",
      })
    } catch (err) {
      toast.add({
        title: "Save Failed",
        description: err instanceof ApiError ? err.userMessage : "Failed to save ad-hoc roll",
        type: "error",
      })
    } finally {
      setSavingRoll(false)
    }
  }

  // Active Adhoc Session
  const activeAdhocSession = React.useMemo(() => {
    return adhocSessions.find((s) => s.id === selectedAdhocId) ?? null
  }, [adhocSessions, selectedAdhocId])

  // Filtered Adhoc Students
  const filteredAdhocStudents = React.useMemo(() => {
    const q = studentSearch.toLowerCase().trim()
    if (!q) return adhocStudents
    return adhocStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.unique_code && s.unique_code.toLowerCase().includes(q))
    )
  }, [adhocStudents, studentSearch])

  // Unified stats calculation for regular & ad-hoc
  const stats = React.useMemo(() => {
    let p = 0
    let l = 0
    let a = 0
    let e = 0
    const isAdhoc = selectedCohortCode === "ADHOC"
    const currentStudents = isAdhoc ? adhocStudents : activeRegularStudents
    const currentRoll = isAdhoc ? adhocRoll : rollStatuses

    currentStudents.forEach((stu) => {
      const st = currentRoll[stu.id]
      if (st === "present") p++
      else if (st === "late") l++
      else if (st === "absent") a++
      else if (st === "excused") e++
    })
    const total = isAdhoc ? adhocStudents.length : activeRegularStudents.length
    const rate = total > 0 ? Math.round(((p + l) / total) * 100) : 0
    const gateArrived = isAdhoc ? 0 : gateStudents.filter((gs) => Boolean(gs.check_in)).length
    return { p, l, a, e, total, rate, gateArrived }
  }, [selectedCohortCode, adhocStudents, adhocRoll, activeRegularStudents, rollStatuses, gateStudents])

  return (
    <div className="space-y-4 min-w-0 w-full">
      {/* Top Header */}
      <SystemHeader
        domain="OPERATIONS"
        breadcrumb={[
          { label: "ATTENDANCE" },
          { label: activeTab === "matrix" ? "MONTHLY MATRIX" : "DAILY ROLL" },
          { label: selectedCohortCode || "ALL" },
        ]}
        title={
          activeTab === "matrix"
            ? "Monthly & Subject Attendance Matrix"
            : "Session Attendance & Ad-Hoc Roll"
        }
        description={
          activeTab === "matrix"
            ? "Comprehensive cross-session matrix report with per-subject filtering, student attendance rates, CSV export, and inline roll editing."
            : "Eliminates the middleman class-picker page with 1-click CohortSwitcher. Mark Present, Late, Absent, or Excused with gate check-in telemetry."
        }
        tabs={[
          {
            id: "roll",
            label: "Daily Session Roll",
            count: selectedCohortCode === "ADHOC" ? adhocSessions.length : matrixSessions.length,
          },
          {
            id: "matrix",
            label: "Monthly & Subject Matrix",
            count: matrixStats.filteredSessionsCount || undefined,
          },
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        metrics={
          activeTab === "matrix"
            ? [
                {
                  label: "ACTIVE COHORT",
                  value: selectedCohortCode === "ADHOC" ? "AD-HOC" : selectedCohortCode || "—",
                },
                {
                  label: "SESSIONS IN VIEW",
                  value: matrixStats.filteredSessionsCount,
                },
                {
                  label: "RANGE RATE",
                  value: `${matrixStats.overallRate}%`,
                  tone:
                    matrixStats.overallRate >= 90
                      ? "success"
                      : matrixStats.overallRate >= 75
                        ? "warning"
                        : "destructive",
                },
                {
                  label: "PRESENT",
                  value: matrixStats.presentCount,
                  tone: "success",
                },
                {
                  label: "LATE / ABSENT",
                  value: `${matrixStats.lateCount} / ${matrixStats.absentCount}`,
                  tone: matrixStats.absentCount > 0 ? "destructive" : "warning",
                },
              ]
            : [
                {
                  label: "ACTIVE COHORT",
                  value: selectedCohortCode === "ADHOC" ? "AD-HOC" : selectedCohortCode || "—",
                },
                {
                  label: "GATE ARRIVED",
                  value: `${stats.gateArrived} / ${stats.total}`,
                  tone: stats.gateArrived > 0 ? "success" : "default",
                },
                {
                  label: "ATTENDANCE RATE",
                  value: `${stats.rate}%`,
                  tone: stats.rate >= 90 ? "success" : stats.rate >= 75 ? "warning" : "destructive",
                },
                {
                  label: "PRESENT",
                  value: stats.p,
                  tone: "success",
                },
                {
                  label: "LATE / ABSENT",
                  value: `${stats.l} / ${stats.a}`,
                  tone: stats.a > 0 ? "destructive" : "warning",
                },
              ]
        }
        actions={
          activeTab === "matrix" ? (
            <Button
              size="xs"
              onClick={() => setMatrixSaveTrigger((prev) => prev + 1)}
              disabled={matrixStats.saving || matrixStats.dirtyCount === 0}
              className={cn(
                "gap-1.5 font-mono text-xs transition-colors",
                matrixStats.dirtyCount > 0 &&
                  "border-amber-500 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
              )}
            >
              {matrixStats.dirtyCount > 0 ? (
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
              ) : (
                <Save className="size-3.5" />
              )}
              <span>
                {matrixStats.saving
                  ? "Saving..."
                  : matrixStats.dirtyCount > 0
                    ? `Save Matrix * (${matrixStats.dirtyCount})`
                    : "Save Matrix"}
              </span>
            </Button>
          ) : (
            <Button
              size="xs"
              onClick={selectedCohortCode === "ADHOC" ? handleSaveAdhocRoll : handleSaveRoll}
              disabled={savingRoll || (selectedCohortCode !== "ADHOC" && !selectedSessionId)}
              className={cn(
                "gap-1.5 font-mono text-xs transition-colors",
                hasUnsavedChanges &&
                  "border-amber-500 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
              )}
            >
              {hasUnsavedChanges ? (
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
              ) : (
                <Save className="size-3.5" />
              )}
              <span>{savingRoll ? "Saving..." : hasUnsavedChanges ? "Save Roll *" : "Save Roll"}</span>
            </Button>
          )
        }
      />

      {/* Cohort Switcher with Ad-Hoc button enabled */}
      <CohortSwitcher
        cohorts={cohortOptions}
        value={selectedCohortCode}
        onValueChange={handleCohortChange}
        includeAdhoc
        actions={
          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              if (activeTab === "matrix") {
                setMatrixRefreshTrigger((prev) => prev + 1)
              } else if (selectedCohortCode === "ADHOC") {
                fetchAdhocData()
              } else {
                fetchCohortRoll()
              }
            }}
            disabled={loading || matrixStats.saving}
            className="h-7 rounded-sm font-mono text-[11px] uppercase"
          >
            <RefreshCw className={cn("mr-1 size-3", (loading || matrixStats.saving) && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {/* --------------------------------------------------------------------- */}
      {/* TAB 1: DAILY SESSION ROLL                                              */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "roll" && (
        <>
          {/* REGULAR COHORT ATTENDANCE WORKSPACE */}
          {selectedCohortCode !== "ADHOC" && (
        <div className="space-y-3">
          {/* Compact Session Selection & Date Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-card px-3.5 py-2.5">
            {/* Left Cluster: Date Picker + Session Selector */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  DATE //
                </span>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="h-8 w-36 rounded-sm font-mono text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  SESSION //
                </span>
                {matrixSessions.length > 0 ? (
                  <>
                    <Select
                      value={selectedSessionId ? String(selectedSessionId) : ""}
                      onValueChange={(val) => handleSessionChange(Number(val))}
                    >
                      <SelectTrigger className="h-8 min-w-[280px] rounded-sm font-mono text-xs">
                        <span className="truncate">
                          {(() => {
                            const sess = matrixSessions.find((s) => s.id === selectedSessionId)
                            if (!sess) return "Select session occurrence..."
                            const timeStart = formatBackendTime(sess.start_time)
                            const timeEnd = formatBackendTime(sess.end_time)
                            return `${timeStart}–${timeEnd} · ${sess.subject || "Session"} (${sess.teacher_name || "Teacher"})`
                          })()}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {matrixSessions.map((sess) => {
                          const timeStart = formatBackendTime(sess.start_time)
                          const timeEnd = formatBackendTime(sess.end_time)
                          return (
                            <SelectItem
                              key={sess.id}
                              value={String(sess.id)}
                              className="font-mono text-xs"
                            >
                              {sess.subject || "Session"} · {sess.teacher_name || "Teacher"} ({timeStart}–{timeEnd})
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => setDeleteSessionConfirmOpen(true)}
                      disabled={!selectedSessionId || deletingActiveSession}
                      title="Delete selected session"
                      aria-label="Delete selected session"
                      className="h-8 w-8 p-0 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {!activeClass ? "No cohort selected" : `No sessions on ${selectedDate}`}
                    </span>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={handleCreateTodaySession}
                      disabled={creatingQuickSession || !activeClass}
                      className="h-8 gap-1 font-mono text-[11px]"
                    >
                      <Sparkles className="size-3 text-warning" />
                      + Generate Today&apos;s Session
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Cluster: Active Session Quick Details */}
            {activeSession && (
              <div className="hidden items-center gap-2 font-mono text-[11px] text-muted-foreground lg:flex">
                <span>
                  SUBJECT:{" "}
                  <strong className="text-foreground">
                    {activeSession.subject || "—"}
                  </strong>
                </span>
                <span className="text-border">·</span>
                <span>
                  TEACHER:{" "}
                  <strong className="text-foreground">
                    {activeSession.teacher_name || "—"}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Roll Matrix DataModule */}
          <DataModule
            searchPlaceholder="Filter students by name or STU code..."
            searchValue={studentSearch}
            onSearchChange={setStudentSearch}
            toolbarRight={
              <Button
                size="xs"
                variant="outline"
                onClick={handleMarkAllPresent}
                disabled={matrixStudents.length === 0}
                className="gap-1 font-mono text-xs text-success border-success/30 hover:bg-success/10"
              >
                <Check className="size-3.5" />
                Mark All Present [P]
              </Button>
            }
            totalCount={filteredStudents.length}
            countLabel="ENROLLED STUDENTS"
          >
            <Table>
              <TableHeader>
                <TableRow className="h-9 bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-28 px-3.5 font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Student Code
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Student Name
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Gate Check-In Telemetry
                  </TableHead>
                  <TableHead className="w-44 font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Roll Status
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Remarks / Notes
                  </TableHead>
                  <TableHead className="w-16 px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((stu) => {
                  const status = rollStatuses[stu.id] || "present"
                  const gateInfo = gateStudents.find((gs) => gs.id === stu.id)?.check_in

                  return (
                    <TableRow key={stu.id} className="h-11 hover:bg-muted/40">
                      <TableCell className="px-3.5">
                        <CodeChip accent>
                          {stu.unique_code || `STU-${stu.id}`}
                        </CodeChip>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {stu.name}
                      </TableCell>
                      <TableCell>
                        {gateInfo ? (
                          <TelemetryTag status="present">
                            ARRIVED · {formatBackendTime(gateInfo.timestamp)} ({gateInfo.check_in_type.toUpperCase()})
                          </TelemetryTag>
                        ) : (
                          <TelemetryTag status="neutral">
                            GATE: NOT ARRIVED
                          </TelemetryTag>
                        )}
                      </TableCell>
                      <TableCell>
                        <RollStatusControl
                          value={status}
                          onChange={(val) => handleStatusChange(stu.id, val)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={remarks[stu.id] || ""}
                          onChange={(e) => handleRemarkChange(stu.id, e.target.value)}
                          placeholder="Optional notes / reason..."
                          className="h-7 text-xs bg-background rounded-sm"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => handleRemoveRegularStudent(stu.id)}
                          disabled={savingRoll || deletingActiveSession || !selectedSessionId}
                          title="Remove from session"
                          aria-label={`Remove ${stu.name} from session`}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}

                {filteredStudents.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center font-mono text-xs text-muted-foreground"
                    >
                      {!activeClass
                        ? "No cohort selected. Select a level with registered cohorts above."
                        : loading
                          ? "Loading attendance roster..."
                          : "No students enrolled in this cohort."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DataModule>

          {excludedRegularStudents.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border bg-muted/20 px-3.5 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  EXCLUDED FROM SESSION ({excludedRegularStudents.length}):
                </span>
                {excludedRegularStudents.map((stu) => (
                  <div
                    key={stu.id}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-2 py-1 text-xs"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {stu.unique_code || `STU-${stu.id}`}
                    </span>
                    <span className="font-medium text-foreground">{stu.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => handleRestoreRegularStudent(stu.id)}
                      disabled={savingRoll || deletingActiveSession}
                      className="h-5 px-1.5 font-mono text-[10px] text-primary hover:bg-primary/10"
                    >
                      <RefreshCw className="mr-1 size-2.5" />
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* AD-HOC TUTORING & CUSTOM SESSIONS WORKSPACE                            */}
      {/* --------------------------------------------------------------------- */}
      {selectedCohortCode === "ADHOC" && (
        <div className="space-y-3">
          {/* Ad-Hoc Header & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-card px-3.5 py-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  DATE //
                </span>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="h-8 w-36 rounded-sm font-mono text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  AD-HOC SESSION //
                </span>
                <Select
                  value={selectedAdhocId ? String(selectedAdhocId) : ""}
                  onValueChange={(val) => handleAdhocSessionChange(Number(val))}
                >
                  <SelectTrigger className="h-8 min-w-[260px] rounded-sm font-mono text-xs">
                    <span className="truncate">
                      {(() => {
                        const adhoc = adhocSessions.find((a) => a.id === selectedAdhocId)
                        if (!adhoc) return "Select ad-hoc session..."
                        const timeStart = formatBackendTime(adhoc.start_time)
                        const timeEnd = formatBackendTime(adhoc.end_time)
                        return `${adhoc.subject || (adhoc as any).title || "Ad-hoc Session"} (${timeStart}–${timeEnd})`
                      })()}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {adhocSessions.map((adhoc) => {
                      const timeStart = formatBackendTime(adhoc.start_time)
                      const timeEnd = formatBackendTime(adhoc.end_time)
                      return (
                        <SelectItem
                          key={adhoc.id}
                          value={String(adhoc.id)}
                          className="font-mono text-xs"
                        >
                          {adhoc.subject || (adhoc as any).title || "Ad-hoc Session"} · {adhoc.teacher_name || "Teacher"} ({timeStart}–{timeEnd})
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setDeleteSessionConfirmOpen(true)}
                  disabled={!selectedAdhocId || deletingActiveSession}
                  title="Delete selected ad-hoc session"
                  aria-label="Delete selected ad-hoc session"
                  className="h-8 w-8 p-0 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>

            <Button
              size="xs"
              onClick={() => {
                if (subjects[0]) setNewAdhocSubjectId(String(subjects[0].id))
                if (teachers[0]) setNewAdhocTeacherId(String(teachers[0].id))
                setAdhocNewOpen(true)
              }}
              className="gap-1 font-mono text-xs"
            >
              <Plus className="size-3.5" />
              New Ad-Hoc Session
            </Button>
          </div>

          {/* Ad-Hoc Roll Table */}
          <DataModule
            searchPlaceholder="Filter enrolled students..."
            searchValue={studentSearch}
            onSearchChange={setStudentSearch}
            toolbarRight={
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    setStudentSearchQuery("")
                    setSearchResultStudents([])
                    setSelectedStudentIdsToAdd([])
                    setAddStudentsOpen(true)
                  }}
                  disabled={!selectedAdhocId}
                  className="gap-1 font-mono text-xs"
                >
                  <Plus className="size-3.5" />
                  + Add Students
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    const next: Record<number, RollAttendanceStatus> = {}
                    adhocStudents.forEach((s) => (next[s.id] = "present"))
                    setAdhocRoll(next)
                    setHasUnsavedChanges(true)
                  }}
                  disabled={adhocStudents.length === 0}
                  className="gap-1 font-mono text-xs text-success border-success/30 hover:bg-success/10"
                >
                  <Check className="size-3.5" />
                  Mark All Present
                </Button>
              </div>
            }
            totalCount={filteredAdhocStudents.length}
            countLabel="AD-HOC ATTENDEES"
          >
            <Table>
              <TableHeader>
                <TableRow className="h-9 bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-28 px-3.5 font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Student Code
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Student Name
                  </TableHead>
                  <TableHead className="w-44 font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Roll Status
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Remarks / Notes
                  </TableHead>
                  <TableHead className="w-16 text-right font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdhocStudents.map((stu) => {
                  const status = adhocRoll[stu.id] || "present"

                  return (
                    <TableRow key={stu.id} className="h-11 hover:bg-muted/40">
                      <TableCell className="px-3.5">
                        <CodeChip accent>{stu.unique_code || `STU-${stu.id}`}</CodeChip>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {stu.name}
                      </TableCell>
                      <TableCell>
                        <RollStatusControl
                          value={status}
                          onChange={(val) => {
                            setAdhocRoll((prev) => ({ ...prev, [stu.id]: val }))
                            setHasUnsavedChanges(true)
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={adhocRemarks[stu.id] || ""}
                          onChange={(e) => {
                            setAdhocRemarks((prev) => ({
                              ...prev,
                              [stu.id]: e.target.value,
                            }))
                            setHasUnsavedChanges(true)
                          }}
                          placeholder="Optional notes..."
                          className="h-7 text-xs bg-background rounded-sm"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleRemoveAdhocStudent(stu.id)}
                          title="Remove from session"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}

                {filteredAdhocStudents.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center font-mono text-xs text-muted-foreground"
                    >
                      {adhocSessions.length === 0
                        ? `No ad-hoc sessions scheduled for ${selectedDate}. Click "New Ad-Hoc Session" to begin.`
                        : "No students enrolled in this session yet. Click '+ Add Students' to enroll attendees."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DataModule>
        </div>
      )}
        </>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 2: MONTHLY & SUBJECT ATTENDANCE MATRIX REPORT                      */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "matrix" && (
        <AttendanceMatrixView
          activeClass={activeClass}
          isAdhoc={selectedCohortCode === "ADHOC"}
          subjects={subjects}
          teachers={teachers}
          refreshTrigger={matrixRefreshTrigger}
          saveTrigger={matrixSaveTrigger}
          onStatsChange={setMatrixStats}
          onJumpToSession={(dateStr, sessId) => {
            setSelectedDate(dateStr)
            setSelectedSessionId(sessId)
            setActiveTab("roll")
            const sp = new URLSearchParams(window.location.search)
            sp.set("view", "roll")
            sp.set("date", dateStr)
            sp.set("sessionId", String(sessId))
            router.replace(`?${sp.toString()}`, { scroll: false })
          }}
        />
      )}

      {/* --------------------------------------------------------------------- */}
      {/* DRAWER: CREATE NEW AD-HOC SESSION                                      */}
      {/* --------------------------------------------------------------------- */}
      <InspectorSheet
        open={adhocNewOpen}
        onOpenChange={setAdhocNewOpen}
        code="NEW // AD-HOC"
        title="Create Ad-Hoc Tutoring Session"
        subtitle="Unassigned to any single cohort; open to cross-enrolled students"
        footerActions={
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdhocNewOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateAdhocSession}
              disabled={creatingAdhoc || !newAdhocSubjectId || !newAdhocTeacherId}
              className="gap-1 font-mono text-xs"
            >
              <Check className="size-3.5" />
              {creatingAdhoc ? "Creating..." : "Create Session"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Topic / Session Name
            </label>
            <Input
              value={newAdhocTitle}
              onChange={(e) => setNewAdhocTitle(e.target.value)}
              placeholder="e.g. Exam Prep Workshop or 1-on-1 Tutoring"
              className="h-8 rounded-sm font-mono text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Subject Offering
            </label>
            <Select
              value={newAdhocSubjectId}
              onValueChange={(val) => {
                if (val != null) setNewAdhocSubjectId(val)
              }}
            >
              <SelectTrigger className="h-8 rounded-sm font-mono text-xs">
                <span className="truncate">
                  {subjects.find((s) => String(s.id) === newAdhocSubjectId)?.name || "Select subject..."}
                </span>
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)} className="font-mono text-xs">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Teacher
            </label>
            <Select
              value={newAdhocTeacherId}
              onValueChange={(val) => {
                if (val != null) setNewAdhocTeacherId(val)
              }}
            >
              <SelectTrigger className="h-8 rounded-sm font-mono text-xs">
                <span className="truncate">
                  {teachers.find((t) => String(t.id) === newAdhocTeacherId)?.name || "Select teacher..."}
                </span>
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)} className="font-mono text-xs">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Start Time
              </label>
              <Input
                type="time"
                value={newAdhocStartTime}
                onChange={(e) => setNewAdhocStartTime(e.target.value)}
                className="h-8 rounded-sm font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                End Time
              </label>
              <Input
                type="time"
                value={newAdhocEndTime}
                onChange={(e) => setNewAdhocEndTime(e.target.value)}
                className="h-8 rounded-sm font-mono text-xs"
              />
            </div>
          </div>
        </div>
      </InspectorSheet>

      {/* --------------------------------------------------------------------- */}
      {/* DRAWER: ENROLL STUDENTS INTO AD-HOC SESSION                             */}
      {/* --------------------------------------------------------------------- */}
      <InspectorSheet
        open={addStudentsOpen}
        onOpenChange={setAddStudentsOpen}
        code="ENROLL // AD-HOC"
        title="Add Students to Ad-Hoc Session"
        subtitle={`Enroll students into "${activeAdhocSession?.subject || (activeAdhocSession as any)?.title || 'Ad-Hoc Session'}" for attendance tracking`}
        footerActions={
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddStudentsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddStudentsToAdhoc}
              disabled={enrollingStudents || selectedStudentIdsToAdd.length === 0}
              className="gap-1 font-mono text-xs"
            >
              <Check className="size-3.5" />
              {enrollingStudents
                ? "Adding..."
                : `Add Selected (${selectedStudentIdsToAdd.length})`}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search students by name or code..."
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchStudents()
                }
              }}
              className="h-8 rounded-sm font-mono text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleSearchStudents}
              disabled={searchingStudents}
              className="h-8 shrink-0 font-mono text-xs"
            >
              <Search className="mr-1 size-3" />
              Search
            </Button>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-1.5 border border-border rounded-sm p-2 bg-muted/10">
            {searchingStudents ? (
              <div className="py-6 text-center font-mono text-xs text-muted-foreground">
                Searching students...
              </div>
            ) : searchResultStudents.length > 0 ? (
              searchResultStudents.map((stu) => {
                const isAlreadyEnrolled = adhocStudents.some((s) => s.id === stu.id)
                const isSelected = selectedStudentIdsToAdd.includes(stu.id)

                return (
                  <div
                    key={stu.id}
                    onClick={() => {
                      if (isAlreadyEnrolled) return
                      setSelectedStudentIdsToAdd((prev) =>
                        prev.includes(stu.id)
                          ? prev.filter((id) => id !== stu.id)
                          : [...prev, stu.id]
                      )
                    }}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-sm border text-xs cursor-pointer transition-colors",
                      isAlreadyEnrolled
                        ? "opacity-50 border-border bg-muted/20 cursor-not-allowed"
                        : isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected || isAlreadyEnrolled}
                        disabled={isAlreadyEnrolled}
                        onChange={() => {}}
                        className="size-3.5 rounded"
                      />
                      <div>
                        <div className="font-semibold text-foreground">{stu.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {stu.unique_code}
                        </div>
                      </div>
                    </div>
                    {isAlreadyEnrolled && (
                      <span className="font-mono text-[10px] text-muted-foreground uppercase">
                        Already Enrolled
                      </span>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="py-6 text-center font-mono text-xs text-muted-foreground">
                {studentSearchQuery
                  ? "No students matching search criteria."
                  : "Type a name or STU code above and click Search."}
              </div>
            )}
          </div>
        </div>
      </InspectorSheet>

      <ConfirmDialog
        open={deleteSessionConfirmOpen}
        title="Delete Class Session?"
        description="This will permanently delete the selected class session and all of its attendance records. This action cannot be undone."
        confirmLabel="Delete Session"
        variant="destructive"
        loading={deletingActiveSession}
        onConfirm={handleConfirmDeleteActiveSession}
        onCancel={() => setDeleteSessionConfirmOpen(false)}
      />
    </div>
  )
}
