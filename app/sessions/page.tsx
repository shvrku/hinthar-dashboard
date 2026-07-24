"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Plus, Pencil, Trash2, RotateCcw, Loader2, Check, Minus, Search, CalendarCheck, Sparkles } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { SESSION_STATUSES, type Session, type SessionPayload, type SessionStatus, type Teacher, type Class, type TimetableSlot } from "@/lib/types"
import { useSortableData } from "@/lib/use-sortable-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { StandardPageHeader } from "@/components/standard-page-header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePagination } from "@/components/use-pagination"
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

function formatDateTime(iso: string): string {
  const d = parseBackendDateTime(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString()
}

function RowSkeleton() {
  return (
    <TableRow>
      {Array.from({ length: 9 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  )
}

export default function SessionsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const [sessions, setSessions] = React.useState<Session[] | null>(null)
  const [teachers, setTeachers] = React.useState<Teacher[]>([])
  const [classes, setClasses] = React.useState<Class[]>([])
  const [timetableSlots, setTimetableSlots] = React.useState<TimetableSlot[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)

  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const [bulkDeleting, setBulkDeleting] = React.useState(false)
  const [bulkConfirmOpen, setBulkConfirmOpen] = React.useState(false)

  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingSession, setEditingSession] = React.useState<Session | null>(null)
  const [saving, setSaving] = React.useState(false)

  // Batch Session Generator Modal state
  const [generateModalOpen, setGenerateModalOpen] = React.useState(false)
  const [genClassId, setGenClassId] = React.useState<string>("")
  const [genStartDate, setGenStartDate] = React.useState<string>(new Date().toISOString().split("T")[0])
  const [genEndDate, setGenEndDate] = React.useState<string>(() => {
    const d = new Date()
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return lastDay.toISOString().split("T")[0]
  })
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
  const [formPaid, setFormPaid] = React.useState(false)
  const [formTeacherId, setFormTeacherId] = React.useState<string>("")
  const [formClassId, setFormClassId] = React.useState<string>("")
  const [formTimetableSlotId, setFormTimetableSlotId] = React.useState<string>("")

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
      const [teachersData, classesData, slotsData] = await Promise.all([
        api.listTeachers(),
        api.listClasses(),
        api.listTimetableSlots(),
      ])
      setTeachers(teachersData)
      setClasses(classesData)
      setTimetableSlots(slotsData)
    } catch {
      // silent
    }
  }, [getToken, isSignedIn])

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
      showSuccess(`Successfully generated ${res.created_count} session(s) from timetable slots.`)
      setGenerateModalOpen(false)
      const data = await api.listSessions()
      setSessions(data)
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

  const loadSessions = React.useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setError(null)
    setSelectedIds([])
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const data = await api.listSessions()
      setSessions(data)
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
  }, [getToken, isSignedIn])

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadInitialData()
    }
  }, [isLoaded, isSignedIn, loadInitialData])

  const [statusFilter, setStatusFilter] = React.useState<string>("all")

  const filteredSessions = React.useMemo(() => {
    if (!sessions) return []
    return sessions.filter((s) => {
      const matchesStatus = statusFilter === "all" || s.status === statusFilter
      if (!matchesStatus) return false
      if (!searchQuery.trim()) return true
      const query = searchQuery.toLowerCase().trim()
      return (
        (s.teacher && s.teacher.name.toLowerCase().includes(query)) ||
        (s.class_obj &&
          (`${s.class_obj.education_level} ${s.class_obj.cohort_identifier}`)
            .toLowerCase()
            .includes(query)) ||
        (s.status && s.status.toLowerCase().includes(query))
      )
    })
  }, [sessions, statusFilter, searchQuery])

  // Sorting
  const { items: sortedSessions, requestSort, sortConfig } = useSortableData(filteredSessions, "id", "asc")

  // Pagination
  const pagination = usePagination(sortedSessions, 10)

  // Selection helpers
  const currentPageIds = React.useMemo(
    () => pagination.paginatedItems.map((s) => s.id),
    [pagination.paginatedItems]
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
      const res = await api.bulkDeleteSessions(selectedIds)
      showSuccess(`Successfully deleted ${res.deleted_count} session(s).`)
      setSelectedIds([])
      setBulkConfirmOpen(false)
      const data = await api.listSessions()
      setSessions(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred during bulk delete")
      }
    } finally {
      setBulkDeleting(false)
    }
  }, [getToken, selectedIds, showSuccess])

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
    const today = new Date().toISOString().split("T")[0]
    setFormDate(today)
    setFormStartTime("09:00:00")
    setFormDuration("60")
    setFormCustomEndTime("")
    setFormStatus("scheduled")
    setFormPaid(false)
    setFormTeacherId("")
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
        dateStr = d.toISOString().split("T")[0]
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
    setFormPaid(session.paid ?? false)
    setFormTeacherId(session.teacher ? session.teacher.id.toString() : "")
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
        paid: formPaid,
        teacher_id: formTeacherId ? parseInt(formTeacherId, 10) : null,
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
      const data = await api.listSessions()
      setSessions(data)
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
      await api.deleteSession(deletingId)
      showSuccess("Session deleted successfully.")
      setSelectedIds((prev) => prev.filter((id) => id !== deletingId))
      setDeletingId(null)
      const data = await api.listSessions()
      setSessions(data)
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
    <div className="space-y-6">
      {/* Standardized Header */}
      <StandardPageHeader
        title="Sessions"
        description="Schedule and manage class sessions, statuses, and teacher assignments."
        primaryAction={{
          label: "Add Session",
          onClick: openAddModal,
          icon: <Plus className="size-4" />,
        }}
        secondaryAction={{
          label: loading ? "Loading..." : "Load Data",
          onClick: loadSessions,
          icon: loading ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />,
        }}
      />

      {/* Metric Highlights Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-emerald-500/20 bg-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Sessions</p>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CalendarCheck className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{sessions?.length ?? 0}</h2>
            {lastLoaded && (
              <span className="text-[11px] text-muted-foreground">Updated {lastLoaded}</span>
            )}
          </div>
        </Card>
      </div>

      {/* Standardized Management Toolbar Card */}
      <Card className="p-4 mb-6 shadow-2xs border-border/80 bg-card">
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
              variant="outline"
              size="sm"
              onClick={() => {
                if (classes.length > 0 && !genClassId) setGenClassId(classes[0].id.toString())
                setGenerateModalOpen(true)
              }}
              className="gap-1.5 font-medium border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
            >
              <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>Generate Month Sessions</span>
            </Button>
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

            {lastLoaded && sessions && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="px-3 py-1 text-xs">
                  <CalendarCheck className="mr-1.5 size-3.5" />
                  {filteredSessions.length} of {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Banners */}
      {success && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
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

      {/* Floating Table Card */}
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

              <TableHeadSortable
                className="w-[100px]"
                sortKey="id"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
              >
                ID
              </TableHeadSortable>

              <TableHeadSortable
                sortKey="teacher.name"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
              >
                Teacher Name
              </TableHeadSortable>

              <TableHeadSortable
                sortKey="class_obj.cohort_identifier"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
              >
                Class
              </TableHeadSortable>

              <TableHeadSortable
                sortKey="start_time"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
              >
                Start Time
              </TableHeadSortable>

              <TableHeadSortable
                sortKey="end_time"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
              >
                End Time
              </TableHeadSortable>

              <TableHeadSortable
                sortKey="status"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
                align="center"
              >
                Status
              </TableHeadSortable>

              <TableHeadSortable
                sortKey="paid"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
                align="center"
              >
                Paid
              </TableHeadSortable>

              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !sessions ? (
              Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
            ) : sessions === null ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  Click &quot;Load Data&quot; to fetch sessions.
                </TableCell>
              </TableRow>
            ) : sortedSessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  No sessions found.
                </TableCell>
              </TableRow>
            ) : (
              pagination.paginatedItems.map((session) => {
                const isSelected = selectedIds.includes(session.id)
                return (
                  <TableRow key={session.id} data-state={isSelected ? "selected" : undefined}>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectRow(session.id)}
                        aria-label={`Select session #${session.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">{session.id}</TableCell>
                    <TableCell className="font-medium">{session.teacher?.name ?? "—"}</TableCell>
                    <TableCell>
                      {session.class_obj ? (
                        <Badge variant="outline">
                          {session.class_obj.education_level} {session.class_obj.cohort_identifier}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDateTime(session.start_time)}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDateTime(session.end_time)}
                    </TableCell>
                    <TableCell className="text-center">{renderStatusBadge(session.status)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        {session.paid === true ? (
                          <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Minus className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditModal(session)}
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingId(session.id)}
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Standardized Table Pagination Footer */}
      {sortedSessions.length > 0 && (
        <StandardTablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setCurrentPage}
          onPageSizeChange={pagination.setPageSize}
        />
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
                    <SelectValue placeholder="Select Class" />
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
                    <SelectValue placeholder="Select Slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSlots.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.day_of_week} {s.start_time}-{s.end_time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Teacher</label>
                <Select
                  value={formTeacherId}
                  onValueChange={(val) => setFormTeacherId(val ?? "")}
                >
                  <SelectTrigger className="w-full">
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
                  value={formStatus || "none"}
                  onValueChange={(val) => setFormStatus(!val || val === "none" ? "" : val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Status" />
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

      {/* Delete confirmation */}
      <Dialog open={deletingId !== null} onOpenChange={(val) => !val && setDeletingId(null)}>
        <DialogContent onClose={() => setDeletingId(null)}>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete session #{deletingId}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirmation */}
      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent onClose={() => setBulkConfirmOpen(false)}>
          <DialogHeader>
            <DialogTitle>Delete Multiple Sessions</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.length} selected session(s)? Paid sessions cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirmOpen(false)} disabled={bulkDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Session Generator Modal */}
      <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-amber-500" />
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
    </div>
  )
}
