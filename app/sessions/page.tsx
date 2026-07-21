"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Plus, Pencil, Trash2, RotateCcw, Loader2, Check, Minus, Search, CalendarCheck } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { SESSION_STATUSES, type Session, type SessionPayload, type SessionStatus, type Teacher, type Class, type TimetableSlot } from "@/lib/types"
import { useSortableData } from "@/lib/use-sortable-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

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

  const [sessions, setSessions] = React.useState<Session[] | null>(null)
  const [teachers, setTeachers] = React.useState<Teacher[]>([])
  const [classes, setClasses] = React.useState<Class[]>([])
  const [timetableSlots, setTimetableSlots] = React.useState<TimetableSlot[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)

  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingSession, setEditingSession] = React.useState<Session | null>(null)
  const [saving, setSaving] = React.useState(false)

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

  const loadSessions = React.useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setError(null)
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

  const filteredSessions = React.useMemo(() => {
    if (!sessions) return []
    if (searchQuery.trim() === "") return sessions
    const query = searchQuery.toLowerCase().trim()
    return sessions.filter(
      (s) =>
        (s.teacher && s.teacher.name.toLowerCase().includes(query)) ||
        (s.class_obj &&
          (`${s.class_obj.education_level} ${s.class_obj.cohort_identifier}`)
            .toLowerCase()
            .includes(query)) ||
        (s.status && s.status.toLowerCase().includes(query))
    )
  }, [sessions, searchQuery])

  // Sorting
  const { items: sortedSessions, requestSort, sortConfig } = useSortableData(filteredSessions, "id", "asc")

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
      if (slot.teacher?.id) {
        setFormTeacherId(slot.teacher.id.toString())
      }
      if (slot.start_time) {
        const formatTimeToSeconds = (time: string): string => {
          if (!time) return "00:00:00"
          return time.length === 5 ? `${time}:00` : time
        }
        setFormStartTime(formatTimeToSeconds(slot.start_time))
      }
      if (slot.end_time && slot.start_time) {
        const [sh, sm] = slot.start_time.split(":").map(Number)
        const [eh, em] = slot.end_time.split(":").map(Number)
        const durationMins = (eh * 60 + em) - (sh * 60 + sm)
        if (durationMins > 0) {
          const match = DURATIONS.find((d) => d.value === durationMins.toString())
          if (match) {
            setFormDuration(match.value)
          } else {
            setFormDuration("custom")
            setFormCustomEndTime(slot.end_time.substring(0, 5))
          }
        }
      }
    }
  }

  const openAddModal = () => {
    setEditingSession(null)
    setFormDate(new Date().toISOString().substring(0, 10))
    setFormStartTime("09:00")
    setFormDuration("60")
    setFormCustomEndTime("10:00:00")
    setFormStatus("scheduled")
    setFormPaid(false)
    setFormTeacherId("")
    setFormClassId("")
    setFormTimetableSlotId("")
    setModalOpen(true)
  }

  const openEditModal = (session: Session) => {
    setEditingSession(session)
    const startDate = parseBackendDateTime(session.start_time)
    const endDate = parseBackendDateTime(session.end_time)

    if (!isNaN(startDate.getTime())) {
      const year = startDate.getFullYear()
      const month = String(startDate.getMonth() + 1).padStart(2, "0")
      const day = String(startDate.getDate()).padStart(2, "0")
      setFormDate(`${year}-${month}-${day}`)

      const sh = String(startDate.getHours()).padStart(2, "0")
      const sm = String(startDate.getMinutes()).padStart(2, "0")
      const ss = String(startDate.getSeconds()).padStart(2, "0")
      setFormStartTime(`${sh}:${sm}:${ss}`)

      if (!isNaN(endDate.getTime())) {
        const diffMins = Math.round((endDate.getTime() - startDate.getTime()) / 60000)
        const match = DURATIONS.find((d) => d.value === diffMins.toString())
        if (match) {
          setFormDuration(match.value)
        } else {
          setFormDuration("custom")
          const eh = String(endDate.getHours()).padStart(2, "0")
          const em = String(endDate.getMinutes()).padStart(2, "0")
          const es = String(endDate.getSeconds()).padStart(2, "0")
          setFormCustomEndTime(`${eh}:${em}:${es}`)
        }
      }
    } else {
      setFormDate("")
      setFormStartTime("")
      setFormDuration("60")
    }

    setFormStatus(session.status ?? "")
    setFormPaid(session.paid ?? false)
    setFormTeacherId(session.teacher?.id ? session.teacher.id.toString() : "")
    setFormClassId(session.class_obj?.id ? session.class_obj.id.toString() : "")
    setFormTimetableSlotId(session.timetable_slot?.id ? session.timetable_slot.id.toString() : "")
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
      const formatTimeToSeconds = (time: string): string => {
        if (!time) return "00:00:00"
        return time.length === 5 ? `${time}:00` : time
      }
      const startIso = `${formDate}T${formatTimeToSeconds(formStartTime)}`
      let endIso = ""
      if (formDuration === "custom") {
        if (!formCustomEndTime) {
          setError("Please specify custom end time")
          setSaving(false)
          return
        }
        endIso = `${formDate}T${formatTimeToSeconds(formCustomEndTime)}`
      } else {
        const [h, m, s] = formStartTime.split(":").map(Number)
        const durationMins = parseInt(formDuration, 10)
        const totalMins = h * 60 + m + durationMins
        const endH = String(Math.floor(totalMins / 60) % 24).padStart(2, "0")
        const endM = String(totalMins % 60).padStart(2, "0")
        const endS = String(s || 0).padStart(2, "0")
        endIso = `${formDate}T${endH}:${endM}:${endS}`
      }

      const payload: SessionPayload = {
        start_time: startIso,
        end_time: endIso,
        status: formStatus ? (formStatus as SessionStatus) : null,
        paid: formPaid,
        teacher_id: formTeacherId ? parseInt(formTeacherId, 10) : undefined,
        class_obj_id: formClassId ? parseInt(formClassId, 10) : null,
        timetable_slot_id: formTimetableSlotId ? parseInt(formTimetableSlotId, 10) : null,
      }

      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      if (editingSession) {
        await api.updateSession(editingSession.id, payload)
        showSuccess("Session updated successfully.")
      } else {
        await api.createSession(payload)
        showSuccess("Session created successfully.")
      }

      closeModal()
      const data = await api.listSessions()
      setSessions(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
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
    <div className="container mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage scheduled class sessions, status records, and payouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={loadSessions} disabled={loading} variant="default" className="shadow-xs">
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 size-4" />
                Load Data
              </>
            )}
          </Button>

          <Button onClick={openAddModal} variant="outline" className="shadow-xs">
            <Plus className="mr-2 size-4" />
            Add Session
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by teacher, class, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {lastLoaded && sessions && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 text-xs">
              <CalendarCheck className="mr-1.5 size-3.5" />
              {filteredSessions.length} of {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Loaded {lastLoaded}
            </span>
          </div>
        )}
      </div>

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

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
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
            >
              Status
            </TableHeadSortable>

            <TableHeadSortable
              sortKey="paid"
              currentSortKey={sortConfig.key}
              currentSortOrder={sortConfig.order}
              onSort={requestSort}
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
              <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                Click &quot;Load Data&quot; to fetch sessions.
              </TableCell>
            </TableRow>
          ) : sortedSessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                No sessions found.
              </TableCell>
            </TableRow>
          ) : (
            sortedSessions.map((session) => (
              <TableRow key={session.id}>
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
                <TableCell>{renderStatusBadge(session.status)}</TableCell>
                <TableCell>
                  {session.paid === true ? (
                    <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Minus className="size-4 text-muted-foreground" />
                  )}
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
            ))
          )}
        </TableBody>
      </Table>

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
    </div>
  )
}
