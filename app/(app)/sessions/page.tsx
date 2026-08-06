"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { Plus, Pencil, Trash2, Loader2, Check, Search, CalendarCheck, Sparkles, BookOpen, ClipboardList } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { SESSION_STATUSES, type Session, type SessionPayload, type SessionStatus, type Teacher, type Class, type TimetableSlot, type AdHocSession, type AdHocSessionPayload, type Subject } from "@/lib/types"
import { useSortableData } from "@/lib/use-sortable-data"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { StandardPageHeader, buildReloadAction } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { cn, toLocalDateString, toSessionDateString, parseBackendDateTime, formatBackendDateTime, toMonthEndDateString } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useServerPagination } from "@/components/use-server-pagination"
import { StandardTablePagination } from "@/components/standard-table-pagination"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableHeadSortable,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { SessionTeacherCell } from "@/components/session-teacher-cell"
import { SearchableSelect } from "@/components/searchable-select"

const TIME_SLOTS = Array.from({ length: 29 }).map((_, i) => {
  const hour = Math.floor(7 + i / 2)
  const minute = i % 2 === 0 ? "00" : "30"
  const hourStr = hour.toString().padStart(2, "0")
  const value = `${hourStr}:${minute}:00`
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  const label = `${displayHour}:${minute} ${ampm}`
  return { value, label }
})

const DURATIONS = [
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
  { value: "150", label: "2.5 hours" },
  { value: "180", label: "3 hours" },
  { value: "custom", label: "Custom End Time" },
]

/** Deep-link to class session attendance (roster for this session's date). */
function takeRollHrefForSession(session: Session): string | null {
  if (!session.class_obj?.id || !session.start_time) return null
  const d = parseBackendDateTime(session.start_time)
  if (isNaN(d.getTime())) return null
  const qs = new URLSearchParams({
    date: toLocalDateString(d),
    layout: "roster",
    session_id: String(session.id),
  })
  return `/attendance/class/${session.class_obj.id}/?${qs.toString()}`
}

/** Deep-link to ad-hoc attendance for the session's day / id. */
function takeRollHrefForAdHoc(session: AdHocSession): string {
  const date = session.date
    ? toSessionDateString(session.date)
    : session.start_time
      ? toSessionDateString(session.start_time)
      : toLocalDateString()
  const qs = new URLSearchParams({
    date: date === "—" ? toLocalDateString() : date,
    layout: "roster",
    session_id: String(session.id),
  })
  if (session.subject?.id) qs.set("subject_id", String(session.subject.id))
  if (session.teacher?.id) qs.set("teacher_id", String(session.teacher.id))
  return `/attendance/adhoc/?${qs.toString()}`
}

function statusLabel(value: SessionStatus | null): string {
  if (!value) return "—"
  return SESSION_STATUSES.find((s) => s.value === value)?.label ?? value
}

function renderStatusBadge(status: SessionStatus | null) {
  if (!status) return <span className="text-muted-foreground">—</span>
  switch (status) {
    case "scheduled":
      return <Badge variant="secondary">{statusLabel(status)}</Badge>
    case "completed":
      return <Badge variant="success">{statusLabel(status)}</Badge>
    case "cancelled":
      return <Badge variant="destructive">{statusLabel(status)}</Badge>
    case "no_show":
      return <Badge variant="outline">{statusLabel(status)}</Badge>
    default:
      return <Badge variant="secondary">{statusLabel(status)}</Badge>
  }
}

function RowSkeleton() {
  return (
    <TableRow>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  )
}

export default function SessionsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  // Current server page of regular sessions — always driven by listSessionsPage.
  const [pageSessions, setPageSessions] = React.useState<Session[]>([])
  // Ad-hoc sessions have no filters, so this always holds the current server page.
  const [adhocSessions, setAdHocSessions] = React.useState<AdHocSession[] | null>(null)
  const [teachers, setTeachers] = React.useState<Teacher[]>([])
  const [classes, setClasses] = React.useState<Class[]>([])
  const [subjects, setSubjects] = React.useState<Subject[]>([])
  const [timetableSlots, setTimetableSlots] = React.useState<TimetableSlot[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)
  const serverPg = useServerPagination(50)
  const adhocServerPg = useServerPagination(50)

  // Debounce search input ~300ms before it drives a server refetch.
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const [bulkDeleting, setBulkDeleting] = React.useState(false)
  const [bulkConfirmOpen, setBulkConfirmOpen] = React.useState(false)

  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingSession, setEditingSession] = React.useState<Session | null>(null)
  const [saving, setSaving] = React.useState(false)

  // Tab mode
  const [sessionMode, setSessionMode] = React.useState<"regular" | "adhoc">("regular")

  // Batch Session Generator Modal state
  const [generateModalOpen, setGenerateModalOpen] = React.useState(false)
  const [genClassId, setGenClassId] = React.useState<string>("")
  const [genStartDate, setGenStartDate] = React.useState<string>(toLocalDateString())
  const [genEndDate, setGenEndDate] = React.useState<string>(() => toMonthEndDateString())
  const [isGenerating, setIsGenerating] = React.useState(false)

  // Delete confirmation
  const [deletingId, setDeletingId] = React.useState<number | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  // Form fields
  const [formDate, setFormDate] = React.useState("")
  const [formStartTime, setFormStartTime] = React.useState("")
  const [formDuration, setFormDuration] = React.useState("60")
  const [formCustomEndTime, setFormCustomEndTime] = React.useState("")
  const [formStatus, setFormStatus] = React.useState<string>("")
  const [formTeacherId, setFormTeacherId] = React.useState<string>("")
  const [formActualTeacherId, setFormActualTeacherId] = React.useState<string>("")
  const [formClassId, setFormClassId] = React.useState<string>("")
  const [formTimetableSlotId, setFormTimetableSlotId] = React.useState<string>("")

  // Ad-Hoc Session form state
  const [adhocModalOpen, setAdhocModalOpen] = React.useState(false)
  const [adhocSaving, setAdhocSaving] = React.useState(false)
  const [adhocSubjectId, setAdhocSubjectId] = React.useState<string>("")
  const [adhocTeacherId, setAdhocTeacherId] = React.useState<string>("")
  const [adhocDate, setAdhocDate] = React.useState<string>(toLocalDateString())
  const [adhocStartTime, setAdhocStartTime] = React.useState<string>("09:00")
  const [adhocEndTime, setAdhocEndTime] = React.useState<string>("10:00")

  const successTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const showSuccess = React.useCallback((msg: string) => {
    if (successTimer.current) clearTimeout(successTimer.current)
    setSuccess(msg)
    successTimer.current = setTimeout(() => setSuccess(null), 3000)
  }, [])

  const loadInitialData = React.useCallback(async () => {
    if (!isSignedIn) return
    try {
      const token = await getToken()
      if (!token) return
      const api = createApi(token)
      const [teachersData, classesData, subjectsData, slotsData] = await Promise.all([
        api.listTeachers(),
        api.listClasses(),
        api.listSubjects(),
        api.listTimetableSlots(),
      ])
      setTeachers(teachersData)
      setClasses(classesData)
      setSubjects(subjectsData)
      setTimetableSlots(slotsData)
    } catch {
      // silent
    }
  }, [getToken, isSignedIn])

  const [statusFilter, setStatusFilter] = React.useState<string>("all")

  const fetchSessionsPage = React.useCallback(async () => {
    const token = await getToken()
    if (!token) throw new Error("No auth token available")
    const api = createApi(token)
    const data = await api.listSessionsPage({
      page: serverPg.page,
      page_size: serverPg.pageSize,
      q: debouncedQuery || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    })
    setPageSessions(data.results)
    serverPg.setTotalItems(data.count)
  }, [getToken, serverPg.page, serverPg.pageSize, serverPg.setTotalItems, debouncedQuery, statusFilter])

  const fetchAdhocPage = React.useCallback(async () => {
    const token = await getToken()
    if (!token) throw new Error("No auth token available")
    const api = createApi(token)
    const data = await api.listAdHocSessionsPage({ page: adhocServerPg.page, page_size: adhocServerPg.pageSize })
    setAdHocSessions(data.results)
    adhocServerPg.setTotalItems(data.count)
  }, [getToken, adhocServerPg.page, adhocServerPg.pageSize, adhocServerPg.setTotalItems])

  const handleBatchGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!genClassId) return
    setIsGenerating(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const res = await api.generateSessionsForClass(Number(genClassId), {
        start_date: genStartDate || undefined,
        end_date: genEndDate || undefined,
      })
      showSuccess(`Successfully generated ${res.total_created} session(s) from timetable slots.`)
      setGenerateModalOpen(false)
      await fetchSessionsPage()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to generate sessions")
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreateAdHocSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adhocSubjectId || !adhocTeacherId || !adhocDate || !adhocStartTime || !adhocEndTime) return

    setAdhocSaving(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const formattedStart = adhocStartTime.length === 5 ? `${adhocStartTime}:00` : adhocStartTime
      const formattedEnd = adhocEndTime.length === 5 ? `${adhocEndTime}:00` : adhocEndTime
      await api.createAdHocSession({
        subject_id: Number(adhocSubjectId),
        teacher_id: Number(adhocTeacherId),
        date: adhocDate,
        start_time: formattedStart,
        end_time: formattedEnd,
        status: "scheduled",
      })
      setAdhocModalOpen(false)
      showSuccess("Ad-hoc session created successfully.")
      await fetchAdhocPage()
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : "Failed to create ad-hoc session")
    } finally {
      setAdhocSaving(false)
    }
  }

  const loadSessions = React.useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setError(null)
    setSelectedIds([])
    try {
      if (sessionMode === "adhoc") {
        await fetchAdhocPage()
      } else {
        await fetchSessionsPage()
      }
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to load sessions")
      }
    } finally {
      setLoading(false)
    }
  }, [isSignedIn, sessionMode, fetchAdhocPage, fetchSessionsPage])

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadInitialData()
    }
  }, [isLoaded, isSignedIn, loadInitialData])

  // Once data has been loaded at least once, keep the regular-session server
  // page in sync: reset to page 1 when search/filter changes, and refetch
  // whenever page/pageSize/search/filter/mode change.
  const filterKeyRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (lastLoaded === null || sessionMode !== "regular") return
    const filterKey = `${debouncedQuery}|${statusFilter}`
    const filterChanged = filterKeyRef.current !== null && filterKey !== filterKeyRef.current
    filterKeyRef.current = filterKey
    if (filterChanged && serverPg.page !== 1) {
      serverPg.setPage(1)
      return
    }
    let cancelled = false
    setLoading(true)
    void fetchSessionsPage()
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError) setError(err.userMessage)
        else setError(err instanceof Error ? err.message : "Failed to load sessions")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPg.page, serverPg.pageSize, debouncedQuery, statusFilter, sessionMode])

  React.useEffect(() => {
    if (lastLoaded === null || sessionMode !== "adhoc") return
    let cancelled = false
    setLoading(true)
    void fetchAdhocPage()
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError) setError(err.userMessage)
        else setError(err instanceof Error ? err.message : "Failed to load sessions")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adhocServerPg.page, adhocServerPg.pageSize, sessionMode])

  // Sorting (client-side; only sorts the current server page)
  const { items: sortedSessions, requestSort, sortConfig } = useSortableData(pageSessions, "id", "asc")
  const displayedSessions = sortedSessions

  const tablePagination = {
    currentPage: serverPg.page,
    totalPages: serverPg.totalPages,
    totalItems: serverPg.totalItems,
    startIndex: serverPg.startIndex,
    endIndex: serverPg.endIndex,
    pageSize: serverPg.pageSize,
    onPageChange: serverPg.setPage,
    onPageSizeChange: serverPg.setPageSize,
  }

  const totalSessionsCount = serverPg.totalItems

  const adhocTablePagination = {
    currentPage: adhocServerPg.page,
    totalPages: adhocServerPg.totalPages,
    totalItems: adhocServerPg.totalItems,
    startIndex: adhocServerPg.startIndex,
    endIndex: adhocServerPg.endIndex,
    pageSize: adhocServerPg.pageSize,
    onPageChange: adhocServerPg.setPage,
    onPageSizeChange: adhocServerPg.setPageSize,
  }

  // Selection helpers
  const currentPageIds = React.useMemo(
    () => displayedSessions.map((s) => s.id),
    [displayedSessions]
  )
  const allCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id))

  const toggleSelectAll = () => {
    if (allCurrentPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])))
    }
  }

  const toggleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleBulkDelete = React.useCallback(async () => {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      if (sessionMode === "adhoc") {
        const res = await api.bulkDeleteAdHocSessions(selectedIds)
        showSuccess(`Successfully deleted ${res.deleted_count} ad-hoc session(s).`)
        await fetchAdhocPage()
      } else {
        const res = await api.bulkDeleteSessions(selectedIds)
        showSuccess(`Successfully deleted ${res.deleted_count} session(s).`)
        await fetchSessionsPage()
      }
      setSelectedIds([])
      setBulkConfirmOpen(false)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred during bulk delete")
      }
    } finally {
      setBulkDeleting(false)
    }
  }, [getToken, selectedIds, sessionMode, showSuccess, fetchAdhocPage, fetchSessionsPage])

  const filteredSlots = React.useMemo(() => {
    if (!formClassId) return []
    return timetableSlots.filter((slot) => slot.class_obj?.id.toString() === formClassId)
  }, [timetableSlots, formClassId])

  const handleClassChange = (classId: string) => {
    setFormClassId(classId)
    setFormTimetableSlotId("")
  }

  const handleSlotChange = (slotId: string) => {
    setFormTimetableSlotId(slotId)
    if (!slotId) return

    const slot = timetableSlots.find((s) => s.id.toString() === slotId)
    if (slot) {
      if (slot.teacher) setFormTeacherId(slot.teacher.id.toString())
      if (slot.start_time) setFormStartTime(slot.start_time)

      if (slot.start_time && slot.end_time) {
        const [sh, sm] = slot.start_time.split(":").map(Number)
        const [eh, em] = slot.end_time.split(":").map(Number)
        const diffMinutes = eh * 60 + em - (sh * 60 + sm)
        if (diffMinutes > 0) {
          const match = DURATIONS.find((d) => d.value === diffMinutes.toString())
          if (match) {
            setFormDuration(match.value)
          } else {
            setFormDuration("custom")
            setFormCustomEndTime(slot.end_time)
          }
        }
      }
    }
  }

  const openAddModal = () => {
    setEditingSession(null)
    setFormDate(toLocalDateString())
    setFormStartTime("09:00:00")
    setFormDuration("60")
    setFormCustomEndTime("")
    setFormStatus("scheduled")
    setFormTeacherId("")
    setFormActualTeacherId("")
    setFormClassId("")
    setFormTimetableSlotId("")
    setModalOpen(true)
  }

  const openEditModal = (session: Session) => {
    setEditingSession(session)

    let dateStr = ""
    let startTimeStr = "09:00:00"
    if (session.start_time) {
      const d = parseBackendDateTime(session.start_time)
      if (!isNaN(d.getTime())) {
        dateStr = toLocalDateString(d)
        const hh = d.getHours().toString().padStart(2, "0")
        const mm = d.getMinutes().toString().padStart(2, "0")
        startTimeStr = `${hh}:${mm}:00`
      }
    }
    setFormDate(dateStr)
    setFormStartTime(startTimeStr)

    let durationVal = "60"
    let customEnd = ""
    if (session.start_time && session.end_time) {
      const st = parseBackendDateTime(session.start_time)
      const et = parseBackendDateTime(session.end_time)
      if (!isNaN(st.getTime()) && !isNaN(et.getTime())) {
        const diffMin = Math.round((et.getTime() - st.getTime()) / 60000)
        const found = DURATIONS.find((d) => d.value === diffMin.toString())
        if (found) {
          durationVal = found.value
        } else {
          durationVal = customEnd = et.toTimeString().split(" ")[0]
          durationVal = "custom"
        }
      }
    }
    setFormDuration(durationVal)
    setFormCustomEndTime(customEnd)

    setFormStatus(session.status ?? "")
    setFormTeacherId(session.teacher ? session.teacher.id.toString() : "")
    setFormActualTeacherId(
      session.actual_teacher ? session.actual_teacher.id.toString() : ""
    )
    setFormClassId(session.class_obj ? session.class_obj.id.toString() : "")
    setFormTimetableSlotId(session.timetable_slot ? session.timetable_slot.id.toString() : "")
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingSession(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formDate || !formStartTime) return
    setSaving(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      const startDateTimeStr = `${formDate}T${formStartTime}`
      const startD = new Date(startDateTimeStr)

      let endD: Date
      if (formDuration === "custom") {
        if (!formCustomEndTime) throw new Error("Please specify custom end time")
        const endTimeStr = `${formDate}T${formCustomEndTime}`
        endD = new Date(endTimeStr)
      } else {
        const addMinutes = parseInt(formDuration, 10)
        endD = new Date(startD.getTime() + addMinutes * 60 * 1000)
      }

      const payload: SessionPayload = {
        start_time: startD.toISOString(),
        end_time: endD.toISOString(),
        status: formStatus === "" ? null : (formStatus as SessionStatus),
        teacher_id: formTeacherId ? parseInt(formTeacherId, 10) : null,
        actual_teacher_id: formActualTeacherId
          ? parseInt(formActualTeacherId, 10)
          : null,
        class_obj_id: formClassId ? parseInt(formClassId, 10) : null,
        timetable_slot_id: formTimetableSlotId ? parseInt(formTimetableSlotId, 10) : null,
      }

      if (editingSession) {
        await api.updateSession(editingSession.id, payload)
        showSuccess(`Session #${editingSession.id} updated.`)
      } else {
        await api.createSession(payload)
        showSuccess("New session scheduled successfully.")
      }

      closeModal()
      await fetchSessionsPage()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to save session")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (deletingId === null) return
    setDeleting(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      if (sessionMode === "adhoc") {
        await api.deleteAdHocSession(deletingId)
        showSuccess("Ad-hoc session deleted successfully.")
        await fetchAdhocPage()
      } else {
        await api.deleteSession(deletingId)
        showSuccess("Session deleted successfully.")
        await fetchSessionsPage()
      }
      setSelectedIds((prev) => prev.filter((id) => id !== deletingId))
      setDeletingId(null)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
      }
    } finally {
      setDeleting(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-7xl">
        <div className="mb-8 h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="mb-6 h-4 w-72 animate-pulse rounded-lg bg-muted" />
        <div className="rounded-xl border p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-full animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground font-medium">Please sign in to view sessions.</p>
      </div>
    )
  }

  return (
    <StaggerContainer className="space-y-6">
      {/* Standardized Header */}
      <StaggerItem>
        <StandardPageHeader
          title="Sessions"
          description="Schedule and manage class sessions, statuses, and teacher assignments."
          primaryAction={{
            label: sessionMode === "adhoc" ? "Add Ad-Hoc Session" : "Add Session",
            onClick: sessionMode === "adhoc" ? () => {
               if (subjects.length > 0) setAdhocSubjectId(subjects[0].id.toString())
               if (teachers.length > 0) setAdhocTeacherId(teachers[0].id.toString())
               setAdhocStartTime("09:00")
               setAdhocEndTime("10:00")
               setAdhocModalOpen(true)
             } : openAddModal,
            icon: <Plus className="size-4" />,
          }}
          secondaryAction={buildReloadAction({
            hasLoaded: lastLoaded !== null,
            loading,
            onClick: loadSessions,
          })}
        />
      </StaggerItem>

      {/* Metric Highlights Strip */}
      <StaggerItem>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 border-primary/20 bg-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Sessions</p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarCheck className="size-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                {sessionMode === "regular" ? totalSessionsCount : adhocServerPg.totalItems}
              </h2>
              {lastLoaded && (
                <span className="text-[11px] text-muted-foreground">Updated {lastLoaded}</span>
              )}
            </div>
          </Card>
        </div>
      </StaggerItem>

      {/* Standardized Management Toolbar Card */}
      <Card className="p-4 shadow-2xs border-border/80 bg-card">
        {/* Mode toggle — same pattern as attendance matrix */}
        <div className="mb-3 flex rounded-lg border border-border bg-muted/40 p-1 w-fit">
          <button
            onClick={() => setSessionMode("regular")}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer",
              sessionMode === "regular"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarCheck className="size-3.5" />
            Regular Sessions
          </button>
          <button
            onClick={() => setSessionMode("adhoc")}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer",
              sessionMode === "adhoc"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen className="size-3.5" />
            Ad-Hoc Sessions
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by teacher, class, status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {sessionMode === "regular" && (
              <>
                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "all")}>
                  <SelectTrigger className="w-40 text-xs">
                    <SelectValue>
                      {statusFilter === "all" ? "All Statuses" : (SESSION_STATUSES.find((s) => s.value === statusFilter)?.label ?? statusFilter)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {SESSION_STATUSES.map((st) => (
                      <SelectItem key={st.value} value={st.value}>
                        {st.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    if (classes.length > 0 && !genClassId) setGenClassId(classes[0].id.toString())
                    setGenerateModalOpen(true)
                  }}
                  className="cursor-pointer"
                >
                  Generate Month
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkConfirmOpen(true)}
                className="gap-1.5"
              >
                <Trash2 className="size-4" />
                Delete Selected ({selectedIds.length})
              </Button>
            )}

            {lastLoaded && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="px-3 py-1 text-xs">
                  {sessionMode === "adhoc" ? (
                    <>
                      <BookOpen className="mr-1.5 size-3.5" />
                      {adhocServerPg.totalItems} ad-hoc session{adhocServerPg.totalItems !== 1 ? "s" : ""}
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="mr-1.5 size-3.5" />
                      {`${totalSessionsCount} session${totalSessionsCount !== 1 ? "s" : ""}`}
                    </>
                  )}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Banners */}
      {success && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          <div className="flex items-center gap-2">
            <Check className="size-4 shrink-0" />
            <span>{success}</span>
          </div>
          <Button size="xs" variant="ghost" onClick={() => setSuccess(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button size="xs" variant="ghost" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Table Card — Regular Sessions */}
      {sessionMode === "regular" && (
        <>
          <Card className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={allCurrentPageSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all current page"
                    />
                  </TableHead>
                  <TableHeadSortable className="w-[100px]" sortKey="id" currentSortKey={sortConfig.key} currentSortOrder={sortConfig.order} onSort={requestSort}>ID</TableHeadSortable>
                  <TableHeadSortable sortKey="teacher.name" currentSortKey={sortConfig.key} currentSortOrder={sortConfig.order} onSort={requestSort}>Teacher Name</TableHeadSortable>
                  <TableHeadSortable sortKey="class_obj.cohort_identifier" currentSortKey={sortConfig.key} currentSortOrder={sortConfig.order} onSort={requestSort}>Class</TableHeadSortable>
                  <TableHeadSortable sortKey="start_time" currentSortKey={sortConfig.key} currentSortOrder={sortConfig.order} onSort={requestSort}>Start Time</TableHeadSortable>
                  <TableHeadSortable sortKey="end_time" currentSortKey={sortConfig.key} currentSortOrder={sortConfig.order} onSort={requestSort}>End Time</TableHeadSortable>
                  <TableHeadSortable sortKey="status" currentSortKey={sortConfig.key} currentSortOrder={sortConfig.order} onSort={requestSort} align="center">Status</TableHeadSortable>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
                ) : lastLoaded === null ? (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">Click &quot;Load Data&quot; to fetch sessions.</TableCell></TableRow>
                ) : displayedSessions.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">No sessions found.</TableCell></TableRow>
                ) : (
                  displayedSessions.map((session) => {
                    const isSelected = selectedIds.includes(session.id)
                    return (
                      <TableRow key={session.id} data-state={isSelected ? "selected" : undefined}>
                        <TableCell className="text-center">
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectRow(session.id)} aria-label={`Select session #${session.id}`} />
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">{session.id}</TableCell>
                        <TableCell className="max-w-[220px]">
                          <SessionTeacherCell
                            teacher={session.teacher}
                            actualTeacher={session.actual_teacher}
                          />
                        </TableCell>
                        <TableCell>
                          {session.class_obj ? (
                            <Badge variant="outline">{session.class_obj.education_level} {session.class_obj.cohort_identifier}</Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{formatBackendDateTime(session.start_time)}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{formatBackendDateTime(session.end_time)}</TableCell>
                        <TableCell className="text-center">{renderStatusBadge(session.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(() => {
                              const href = takeRollHrefForSession(session)
                              if (!href) return null
                              return (
                                <Link
                                  href={href}
                                  title="Take roll"
                                  className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                                >
                                  <ClipboardList className="size-4" />
                                </Link>
                              )
                            })()}
                            <Button variant="ghost" size="icon-sm" onClick={() => openEditModal(session)} title="Edit"><Pencil className="size-4" /></Button>
                            <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setDeletingId(session.id)} title="Delete"><Trash2 className="size-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </Card>
          {tablePagination.totalItems > 0 && (
            <StandardTablePagination
              currentPage={tablePagination.currentPage} totalPages={tablePagination.totalPages}
              totalItems={tablePagination.totalItems} startIndex={tablePagination.startIndex}
              endIndex={tablePagination.endIndex} pageSize={tablePagination.pageSize}
              onPageChange={tablePagination.onPageChange} onPageSizeChange={tablePagination.onPageSizeChange}
              loading={loading}
            />
          )}
        </>
      )}

      {/* Table Card — Ad-Hoc Sessions */}
      {sessionMode === "adhoc" && (
        <>
          <Card className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={allCurrentPageSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all current page"
                    />
                  </TableHead>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead align="center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
                ) : adhocSessions === null ? (
                  <TableRow><TableCell colSpan={10} className="h-32 text-center text-muted-foreground">Click &quot;Load Data&quot; to fetch ad-hoc sessions.</TableCell></TableRow>
                ) : adhocSessions.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="h-32 text-center text-muted-foreground">No ad-hoc sessions found.</TableCell></TableRow>
                ) : (
                  adhocSessions.map((session) => {
                    const isSelected = selectedIds.includes(session.id)
                    return (
                      <TableRow key={session.id} data-state={isSelected ? "selected" : undefined}>
                        <TableCell className="text-center">
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectRow(session.id)} aria-label={`Select #${session.id}`} />
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">{session.id}</TableCell>
                        <TableCell>{session.teacher?.name ?? "—"}</TableCell>
                        <TableCell>{session.subject?.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{session.date ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{session.start_time ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{session.end_time ?? "—"}</TableCell>
                        <TableCell className="text-center">{renderStatusBadge(session.status as SessionStatus | null)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={takeRollHrefForAdHoc(session)}
                              title="Take roll"
                              className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                            >
                              <ClipboardList className="size-4" />
                            </Link>
                            <Button variant="ghost" size="icon-sm" title="Edit"><Pencil className="size-4" /></Button>
                            <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setDeletingId(session.id)} title="Delete"><Trash2 className="size-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </Card>
          {adhocTablePagination.totalItems > 0 && (
            <StandardTablePagination
              currentPage={adhocTablePagination.currentPage} totalPages={adhocTablePagination.totalPages}
              totalItems={adhocTablePagination.totalItems} startIndex={adhocTablePagination.startIndex}
              endIndex={adhocTablePagination.endIndex} pageSize={adhocTablePagination.pageSize}
              onPageChange={adhocTablePagination.onPageChange} onPageSizeChange={adhocTablePagination.onPageSizeChange}
              loading={loading}
            />
          )}
        </>
      )}

      {/* Form modal */}
      <Dialog open={modalOpen} onOpenChange={(val) => !val && closeModal()}>
        <DialogContent onClose={closeModal} className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingSession ? "Edit Session" : "Add Session"}</DialogTitle>
            <DialogDescription>
              {editingSession ? "Update session schedule and details." : "Schedule a new class session."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Class</label>
                <Select
                  value={formClassId}
                  onValueChange={(val) => handleClassChange(val ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{(value: string | null) => { const c = classes.find((x) => x.id.toString() === value); return c ? `${c.education_level} ${c.cohort_identifier}${c.cohort_sub_category ? ` (${c.cohort_sub_category})` : ""}` : (value ? `Class #${value}` : "Select Class"); }}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.education_level} {c.cohort_identifier} {c.cohort_sub_category ? `(${c.cohort_sub_category})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Timetable Slot</label>
                <Select
                  value={formTimetableSlotId}
                  onValueChange={(val) => handleSlotChange(val ?? "")}
                  disabled={!formClassId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{(value: string | null) => { const s = filteredSlots.find((x) => x.id.toString() === value); if (!s) return value ? `Slot #${value}` : "Select Slot"; const day = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][s.day_of_week] ?? s.day_of_week; return `${day} ${s.start_time.slice(0,5)}–${s.end_time.slice(0,5)}${s.subject?.name ? ` · ${s.subject.name}` : ""}`; }}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSlots.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][s.day_of_week] ?? s.day_of_week} {s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}{s.subject?.name ? ` · ${s.subject.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Assigned teacher</label>
                <Select
                  value={formTeacherId}
                  onValueChange={(val) => setFormTeacherId(val ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{(value: string | null) => teachers.find((t) => t.id.toString() === value)?.name ?? (value ? `Teacher #${value}` : "Select Teacher")}</SelectValue>
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

              <div>
                <label className="mb-1.5 block text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-sm font-medium">Substitute teacher</label>
                {formActualTeacherId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormActualTeacherId("")}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
              <SearchableSelect
                options={teachers.map((t) => ({
                  value: t.id.toString(),
                  label: t.name,
                  subLabel: t.unique_code ?? undefined,
                }))}
                value={formActualTeacherId}
                onValueChange={setFormActualTeacherId}
                placeholder="None — taught as assigned"
                searchPlaceholder="Search teachers…"
              />
              <p className="text-[11px] text-muted-foreground">
                Leave empty when the assigned teacher taught. Setting a substitute records who covered.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Start Time</label>
                <Select
                  value={formStartTime}
                  onValueChange={(val) => setFormStartTime(val ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Start Time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((ts) => (
                      <SelectItem key={ts.value} value={ts.value}>
                        {ts.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Duration</label>
                <Select
                  value={formDuration}
                  onValueChange={(val) => setFormDuration(val ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formDuration === "custom" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Custom End Time</label>
                <Input
                  type="time"
                  step="1"
                  value={formCustomEndTime}
                  onChange={(e) => setFormCustomEndTime(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Status</label>
                <Select
                  items={[{ value: "none", label: "None" }, ...SESSION_STATUSES]}
                  value={formStatus || "none"}
                  onValueChange={(val) => setFormStatus(!val || val === "none" ? "" : val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {SESSION_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closeModal} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                {editingSession ? "Save Changes" : "Create Session"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletingId !== null}
        title={`Delete ${sessionMode === "adhoc" ? "Ad-Hoc Session" : "Session"}`}
        description={
          deletingId !== null
            ? `Are you sure you want to delete ${sessionMode === "adhoc" ? "ad-hoc" : ""} session #${deletingId}? This action cannot be undone.`
            : ""
        }
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        loading={deleting}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        title="Delete Multiple Sessions"
        description={`Are you sure you want to delete ${selectedIds.length} selected session(s)? This action cannot be undone.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkConfirmOpen(false)}
        loading={bulkDeleting}
      />

      {/* Batch Session Generator Modal */}
      <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5" />
              Generate Sessions from Timetable
            </DialogTitle>
            <DialogDescription>
              Automatically create dated sessions for a class based on its active weekly timetable slots.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBatchGenerateSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Target Class *</label>
              <Select value={genClassId} onValueChange={(val) => setGenClassId(val ?? "")}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Select class...">
                    {genClassId
                      ? (() => {
                          const found = classes.find((c) => c.id.toString() === genClassId)
                          return found
                            ? `${found.education_level} ${found.cohort_identifier}${found.cohort_sub_category ? ` (${found.cohort_sub_category})` : ""}`
                            : "Select class..."
                        })()
                      : "Select class..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50 min-w-48">
                  {classes.map((c) => {
                    const label = `${c.education_level} ${c.cohort_identifier}${c.cohort_sub_category ? ` (${c.cohort_sub_category})` : ""}`
                    return (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Start Date</label>
                <Input
                  type="date"
                  value={genStartDate}
                  onChange={(e) => setGenStartDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">End Date</label>
                <Input
                  type="date"
                  value={genEndDate}
                  onChange={(e) => setGenEndDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGenerateModalOpen(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isGenerating || !genClassId} className="gap-1.5">
                {isGenerating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    <span>Generate Sessions</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Ad-Hoc Session Dialog */}
      <Dialog open={adhocModalOpen} onOpenChange={setAdhocModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Ad-Hoc Session</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAdHocSession} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</label>
              <Select value={adhocSubjectId} onValueChange={(val) => setAdhocSubjectId(val ?? "")}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select Subject">
                    {subjects.find((s) => s.id.toString() === adhocSubjectId)?.name ?? "Select Subject"}
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
              <Select value={adhocTeacherId} onValueChange={(val) => setAdhocTeacherId(val ?? "")}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select Teacher">
                    {teachers.find((t) => t.id.toString() === adhocTeacherId)?.name ?? "Select Teacher"}
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
                value={adhocDate}
                onChange={(e) => setAdhocDate(e.target.value)}
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
                  value={adhocStartTime}
                  onChange={(e) => setAdhocStartTime(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End Time</label>
                <Input
                  type="time"
                  step="1"
                  value={adhocEndTime}
                  onChange={(e) => setAdhocEndTime(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setAdhocModalOpen(false)} disabled={adhocSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={adhocSaving}>
                {adhocSaving ? (
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
    </StaggerContainer>
  )
}
