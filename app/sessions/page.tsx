"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Plus, Pencil, Trash2, X, RotateCcw, Loader2, Check, Minus, Search } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { SESSION_STATUSES, type Session, type SessionPayload, type SessionStatus, type Teacher, type Class, type TimetableSlot } from "@/lib/types"

const STATUS_COLORS: Record<SessionStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  no_show: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

const TIME_SLOTS = Array.from({ length: 29 }).map((_, i) => {
  const hour = Math.floor(7 + i / 2)
  const minute = i % 2 === 0 ? "00" : "30"
  const hourStr = hour.toString().padStart(2, "0")
  const value = `${hourStr}:${minute}`
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

function formatDateTime(iso: string): string {
  const d = parseBackendDateTime(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString()
}

function RowSkeleton() {
  return (
    <tr className="border-b last:border-b-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-5 w-full animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
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
  const [formDuration, setFormDuration] = React.useState("60") // default 1 hour
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
      // silent - errors handled by loadSessions or user alerts
    }
  }, [getToken, isSignedIn])

  React.useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

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
      if (slot.teacher) {
        setFormTeacherId(slot.teacher.id.toString())
      }
      
      if (slot.start_time) {
        const timePart = slot.start_time.split(":")
        if (timePart.length >= 2) {
          setFormStartTime(`${timePart[0]}:${timePart[1]}`)
        }
      }
      
      if (slot.start_time && slot.end_time) {
        const parseTime = (timeStr: string) => {
          const [h, m] = timeStr.split(":").map(Number)
          return h * 60 + m
        }
        const diffMin = parseTime(slot.end_time) - parseTime(slot.start_time)
        const standardDurations = [30, 60, 90, 120, 150, 180]
        if (standardDurations.includes(diffMin)) {
          setFormDuration(diffMin.toString())
          setFormCustomEndTime("")
        } else {
          setFormDuration("custom")
          const timePart = slot.end_time.split(":")
          if (timePart.length >= 2) {
            setFormCustomEndTime(`${timePart[0]}:${timePart[1]}`)
          }
        }
      }
    }
  }

  const openAddModal = () => {
    setEditingSession(null)
    const today = new Date()
    const pad = (n: number) => n.toString().padStart(2, "0")
    setFormDate(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`)
    setFormStartTime("09:00")
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
    const dStart = parseBackendDateTime(session.start_time)
    const dEnd = parseBackendDateTime(session.end_time)
    const pad = (n: number) => n.toString().padStart(2, "0")
    
    setFormDate(`${dStart.getFullYear()}-${pad(dStart.getMonth() + 1)}-${pad(dStart.getDate())}`)
    setFormStartTime(`${pad(dStart.getHours())}:${pad(dStart.getMinutes())}`)
    
    const diffMin = Math.round((dEnd.getTime() - dStart.getTime()) / (60 * 1000))
    const standardDurations = [30, 60, 90, 120, 150, 180]
    if (standardDurations.includes(diffMin)) {
      setFormDuration(diffMin.toString())
      setFormCustomEndTime("")
    } else {
      setFormDuration("custom")
      setFormCustomEndTime(`${pad(dEnd.getHours())}:${pad(dEnd.getMinutes())}`)
    }
    
    setFormStatus(session.status ?? "")
    setFormPaid(session.paid ?? false)
    setFormTeacherId(session.teacher?.id.toString() ?? "")
    setFormClassId(session.class_obj?.id.toString() ?? "")
    setFormTimetableSlotId(session.timetable_slot?.id.toString() ?? "")
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingSession(null)
  }

  const getFormPayload = (): SessionPayload => {
    const startStr = `${formDate}T${formStartTime}`
    const start = parseBackendDateTime(startStr)
    let end: Date
    if (formDuration === "custom") {
      const endStr = `${formDate}T${formCustomEndTime}`
      end = parseBackendDateTime(endStr)
    } else {
      end = new Date(start.getTime() + parseInt(formDuration, 10) * 60 * 1000)
    }
    
    return {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      ...(formStatus ? { status: formStatus as SessionStatus } : {}),
      ...(formPaid ? { paid: true } : {}),
      ...(formTeacherId ? { teacher_id: parseInt(formTeacherId, 10) } : {}),
      ...(formClassId ? { class_obj_id: parseInt(formClassId, 10) } : { class_obj_id: null }),
      timetable_slot_id: formTimetableSlotId ? parseInt(formTimetableSlotId, 10) : null,
    }
  }

  const handleSave = async () => {
    if (!formDate || !formStartTime || !formTeacherId) return
    if (formDuration === "custom" && !formCustomEndTime) return
    
    const startStr = `${formDate}T${formStartTime}`
    const start = parseBackendDateTime(startStr)
    let end: Date
    if (formDuration === "custom") {
      const endStr = `${formDate}T${formCustomEndTime}`
      end = parseBackendDateTime(endStr)
    } else {
      end = new Date(start.getTime() + parseInt(formDuration, 10) * 60 * 1000)
    }
    
    if (end <= start) {
      setError("End time must be after start time.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const payload = getFormPayload()
      if (editingSession) {
        await api.updateSession(editingSession.id, payload)
        showSuccess("Session updated successfully.")
      } else {
        await api.createSession(payload)
        showSuccess("Session created successfully.")
      }
      closeModal()
      await loadSessions()
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

  const handleDelete = async (id: number) => {
    setDeleting(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      await api.deleteSession(id)
      showSuccess("Session deleted successfully.")
      setDeletingId(null)
      await loadSessions()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to delete session")
      }
    } finally {
      setDeleting(false)
    }
  }

  // Auth gates
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mb-6 h-4 w-72 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view sessions.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
        <p className="mt-1 text-muted-foreground">
          Manage class sessions and timetable records.
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Left side actions (Buttons + Search) */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadSessions}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RotateCcw className="size-4" />
                Load Data
              </>
            )}
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Plus className="size-4" />
            Add Session
          </button>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-64 rounded-lg border bg-background pl-9 pr-4 text-sm outline-none ring-offset-background transition-colors focus:border-ring"
            />
          </div>
        </div>

        {/* Right side info (Timestamp/Status) */}
        {lastLoaded && sessions && (
          <span className="text-xs text-muted-foreground">
            {filteredSessions.length} of {sessions.length} session{sessions.length !== 1 ? "s" : ""} &bull; Loaded {lastLoaded}
          </span>
        )}
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          <Check className="size-4 shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess(null)} className="shrink-0 hover:opacity-70">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 hover:opacity-70">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">ID</th>
              <th className="px-4 py-3 text-left font-medium">Teacher Name</th>
              <th className="px-4 py-3 text-left font-medium">Class</th>
              <th className="px-4 py-3 text-left font-medium">Start Time</th>
              <th className="px-4 py-3 text-left font-medium">End Time</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Paid</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !sessions
              ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
              : sessions === null
                ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      Click &quot;Load Data&quot; to fetch sessions.
                    </td>
                  </tr>
                )
                : filteredSessions.length === 0
                  ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                        No sessions found.
                      </td>
                    </tr>
                  )
                  : filteredSessions.map((session) => (
                      <tr key={session.id} className="border-b last:border-b-0 transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs">{session.id}</td>
                        <td className="px-4 py-3">{session.teacher?.name ?? "—"}</td>
                        <td className="px-4 py-3">
                          {session.class_obj
                            ? `${session.class_obj.education_level} ${session.class_obj.cohort_identifier}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(session.start_time)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(session.end_time)}</td>
                        <td className="px-4 py-3">
                          {session.status
                            ? (
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[session.status]}`}
                              >
                                {statusLabel(session.status)}
                              </span>
                            )
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {session.paid === true
                            ? <Check className="size-4 text-green-600 dark:text-green-400" />
                            : <Minus className="size-4 text-muted-foreground" />}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(session)}
                              className="inline-flex size-8 items-center justify-center rounded-md border transition-colors hover:bg-muted/50"
                              title="Edit"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingId(session.id)}
                              className="inline-flex size-8 items-center justify-center rounded-md border text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                              title="Delete"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
            {/* Skeleton rows while loading with existing data */}
            {loading && sessions && sessions.length > 0 && (
              Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={`skel-${i}`} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingSession ? "Edit Session" : "Add Session"}
              </h2>
              <button
                onClick={closeModal}
                className="inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Teacher */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Teacher <span className="text-red-500">*</span>
                </label>
                <select
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  required
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20"
                >
                  <option value="">— Select Teacher —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">Class</label>
                <select
                  value={formClassId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20"
                >
                  <option value="">— None (Tutor Session) —</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.education_level} {c.cohort_identifier}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timetable Slot */}
              {formClassId && (
                <div>
                  {filteredSlots.length > 0 ? (
                    <>
                      <label className="mb-1.5 block text-sm font-medium">Timetable Slot</label>
                      <select
                        value={formTimetableSlotId}
                        onChange={(e) => handleSlotChange(e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      >
                        <option value="">— Select Timetable Slot (Optional) —</option>
                        {filteredSlots.map((slot) => {
                          const dayName = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][slot.day_of_week] || `Day ${slot.day_of_week}`
                          const subjectName = slot.subject?.name || "No Subject"
                          const teacherName = slot.teacher?.name || "No Teacher"
                          return (
                            <option key={slot.id} value={slot.id}>
                              {subjectName} with {teacherName} ({dayName} {slot.start_time.slice(0,5)}-{slot.end_time.slice(0,5)})
                            </option>
                          )
                        })}
                      </select>
                      {!formTimetableSlotId && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          ℹ️ No slot selected. This session will be scheduled as an ad-hoc/extra session.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-800 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300">
                      ℹ️ This class has no recurring timetable slots. This session will be scheduled as an ad-hoc/extra session.
                    </div>
                  )}
                </div>
              )}

              {/* Date & Start Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    required
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  >
                    <option value="">— Select Time —</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Duration & End Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Duration <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    required
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  >
                    {DURATIONS.map((dur) => (
                      <option key={dur.value} value={dur.value}>
                        {dur.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formDuration === "custom" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Custom End Time <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formCustomEndTime}
                      onChange={(e) => setFormCustomEndTime(e.target.value)}
                      required
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    >
                      <option value="">— Select Time —</option>
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20"
                >
                  <option value="">— None —</option>
                  {SESSION_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Paid */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={formPaid}
                    onChange={(e) => setFormPaid(e.target.checked)}
                    className="size-4 rounded border transition-colors"
                  />
                  Paid
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-muted/50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formDate || !formStartTime || !formTeacherId || (formDuration === "custom" && !formCustomEndTime)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving ? "Saving..." : editingSession ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-semibold">Confirm Delete</h2>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this session? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeletingId(null)}
                disabled={deleting}
                className="inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-muted/50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                disabled={deleting}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 className="size-4 animate-spin" />}
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
