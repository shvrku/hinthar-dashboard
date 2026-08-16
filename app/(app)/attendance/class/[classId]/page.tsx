"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation"
import { SearchableSelect } from "@/components/searchable-select"
import { useAuth } from "@clerk/nextjs"
import {
  Search,
  AlertCircle,
  Calendar,
  CalendarCheck,
  BookOpen,
  GraduationCap,
  Users,
  LayoutGrid,
  Clock,
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
import { formatClassLabel } from "@/lib/format-class"
import { RequireRole } from "@/components/require-role"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { StandardPageHeader, buildReloadAction } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { AttendanceKpis } from "@/components/attendance/attendance-kpis"
import { AttendanceViewSkeleton } from "@/components/attendance/attendance-view-skeleton"
import { monthSelectItems, yearSelectItems } from "@/components/attendance/attendance-shared"

const AttendanceMatrixView = dynamic(
  () => import("@/components/attendance/attendance-matrix").then((m) => m.AttendanceMatrixView),
  { loading: () => <AttendanceViewSkeleton /> }
)
const AttendanceRosterView = dynamic(
  () => import("@/components/attendance/attendance-roster").then((m) => m.AttendanceRosterView),
  { loading: () => <AttendanceViewSkeleton /> }
)

const LAST_CLASS_KEY = "hinthar.attendance.lastClassId"

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
      router.push(qs ? `/attendance/class/${newClassId}/?${qs}` : `/attendance/class/${newClassId}/`)
    },
    [classId, searchParams, router]
  )

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
        api.listTeachersForSelect(),
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

  // Metric Summaries — real attendance rows in the loaded range.
  // Missing rows are unmarked and are not counted. Future sessions stay in
  // so a date like ?date=2026-08-19 still matches the matrix on screen.
  const stats = React.useMemo(() => {
    let presentCount = 0
    let lateCount = 0
    let absentCount = 0
    let excusedCount = 0

    const loadedSessionIds = new Set(sessions.map((s) => s.id))

    attendances.forEach((a) => {
      const sessId =
        typeof a.session === "object" && a.session
          ? a.session.id
          : (a.session_id ?? a.session)
      if (!loadedSessionIds.has(Number(sessId))) return
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
    return formatClassLabel(currentClass)
  }, [currentClass])

  const classItems = React.useMemo(() => {
    return classes.map((c) => ({
      value: c.id.toString(),
      label: formatClassLabel(c),
    }))
  }, [classes])

  const subjectItems = React.useMemo(() => {
    const list = subjects.map((sub) => ({ value: sub.id.toString(), label: sub.name }))
    return [{ value: "all", label: "All Subjects" }, ...list]
  }, [subjects])

  const teacherItems = React.useMemo(() => {
    const list = teachers.map((t) => ({ value: t.id.toString(), label: t.name }))
    return [{ value: "all", label: "All Teachers" }, ...list]
  }, [teachers])

  const monthItems = React.useMemo(() => monthSelectItems(), [])
  const yearItems = React.useMemo(() => yearSelectItems(currentYear), [currentYear])

  if (!mounted || !isLoaded) {
    return (
      <div className="container mx-auto max-w-7xl px-4 pb-6 sm:px-6 md:px-8 md:pb-8" suppressHydrationWarning>
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

  return (
    <StaggerContainer className="space-y-6">
      {/* Standard Header */}
      <StaggerItem>
        <StandardPageHeader
          title={currentClassLabel ? `Attendance • ${currentClassLabel}` : "Class Attendance"}
          back={{ href: "/attendance/", label: "Attendance" }}
          secondaryAction={buildReloadAction({
            hasLoaded: !!lastLoaded,
            loading,
            onClick: loadData,
          })}
        />
      </StaggerItem>

      {/* Summary KPI Strip */}
      <StaggerItem>
        <AttendanceKpis stats={stats} />
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

      {/* Main content */}
      <StaggerItem>
        {viewLayout === "roster" ? (
          <AttendanceRosterView
            students={rowStudents}
            sessions={sessions}
            selectedSessionId={rosterSessionId}
            rosterSearch={rosterSearch}
            loading={loading}
            pendingCells={pendingCells}
            getAttendanceRecord={getAttendanceRecord}
            onSelectSessionId={(val) => updateQuery({ session_id: val })}
            onRosterSearchChange={setRosterSearch}
            onStatusChange={handleStatusChange}
            onBulkMark={handleBulkMarkSession}
          />
        ) : (
          <AttendanceMatrixView
            students={rowStudents}
            sessions={sessions}
            loading={loading}
            pendingCells={pendingCells}
            editingCellKey={editingCellKey}
            emptyMessage="No enrolled students found matching the selected filters."
            getAttendanceRecord={getAttendanceRecord}
            onEditingCellKeyChange={setEditingCellKey}
            onStatusChange={handleStatusChange}
          />
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
