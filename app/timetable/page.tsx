"use client"

import React, { useState, useMemo, useEffect, useCallback } from "react"
import { useAuth } from "@clerk/nextjs"
import { createApi, ApiError } from "@/lib/api"
import type { Class, Teacher, Subject, TimetableSlot } from "@/lib/types"
import { motion, AnimatePresence } from "motion/react"
import {
  Search,
  Users,
  BookOpen,
  Clock,
  Calendar,
  Edit3,
  User,
  CalendarDays,
  List,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Check,
  ChevronDown,
  Loader2,
  Trash2,
  RotateCcw,
  Sparkles,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeToMins = (t: string) => {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

const getClassName = (cls: Class) => {
  return `${cls.education_level} - ${cls.cohort_identifier} ${cls.cohort_sub_category ? `(${cls.cohort_sub_category})` : ""}`.trim()
}

const getDurationMinutes = (start: string, end: string) => {
  const diff = timeToMins(end) - timeToMins(start)
  if (diff <= 0) return ""
  const hours = Math.floor(diff / 60)
  const mins = diff % 60
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
  if (hours > 0) return `${hours}h`
  return `${mins}m`
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const HOURS = Array.from({ length: 10 }, (_, i) => i + 7) // 07:00–16:00

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Searchable single-select for teachers */
function TeacherSelect({
  teachers,
  value,
  onChange,
}: {
  teachers: Teacher[]
  value: number
  onChange: (id: number, name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const selected = teachers.find((t) => t.id === value)
  const filtered = teachers.filter((t) =>
    t.name.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between rounded-xl border border-input bg-background px-3 text-sm font-medium shadow-xs outline-none transition-colors hover:bg-muted/50 focus-visible:border-ring"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.name : "Select teacher…"}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-xl overflow-hidden text-popover-foreground">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search teacher…"
                className="w-full rounded-lg bg-background border border-input py-1.5 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto hinthar-scrollbar p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground text-center">
                No teachers found
              </p>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onChange(t.id, t.name)
                    setOpen(false)
                    setQ("")
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-lg transition-colors ${
                    t.id === value
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {t.name}
                  {t.id === value && (
                    <Check className="h-3.5 w-3.5 text-primary ml-auto" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Searchable single-select for subjects */
function SubjectSelect({
  subjects,
  value,
  onChange,
}: {
  subjects: Subject[]
  value: number
  onChange: (id: number, name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const selected = subjects.find((s) => s.id === value)
  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between rounded-xl border border-input bg-background px-3 text-sm font-medium shadow-xs outline-none transition-colors hover:bg-muted/50 focus-visible:border-ring"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.name : "Select subject…"}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-xl overflow-hidden text-popover-foreground">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search subject…"
                className="w-full rounded-lg bg-background border border-input py-1.5 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto hinthar-scrollbar p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground text-center">
                No subjects found
              </p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onChange(s.id, s.name)
                    setOpen(false)
                    setQ("")
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-lg transition-colors ${
                    s.id === value
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {s.name}
                  {s.id === value && (
                    <Check className="h-3.5 w-3.5 text-primary ml-auto" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modal state interface ────────────────────────────────────────────────────

type ModalState =
  | { mode: "add"; prefillDayOfWeek?: number }
  | { mode: "edit"; lesson: TimetableSlot }

function SlotModal({
  modal,
  teachers,
  subjects,
  onSave,
  onDelete,
  onClose,
}: {
  modal: ModalState
  teachers: Teacher[]
  subjects: Subject[]
  onSave: (payload: {
    id?: number
    subject_id: number
    teacher_id: number
    day_of_week: number
    start_time: string
    end_time: string
  }) => Promise<void>
  onDelete?: (id: number) => void
  onClose: () => void
}) {
  const isEdit = modal.mode === "edit"
  const lesson = isEdit ? modal.lesson : null
  const prefillDay = modal.mode === "add" ? modal.prefillDayOfWeek : undefined

  const [subjectId, setSubjectId] = useState<number>(lesson ? lesson.subject.id : 0)
  const [teacherId, setTeacherId] = useState<number>(lesson ? lesson.teacher.id : 0)
  const [dayOfWeek, setDayOfWeek] = useState<number>(
    lesson ? lesson.day_of_week : prefillDay ?? 0,
  )
  const [startTime, setStartTime] = useState<string>(
    lesson ? lesson.start_time.substring(0, 5) : "09:00",
  )
  const [endTime, setEndTime] = useState<string>(
    lesson ? lesson.end_time.substring(0, 5) : "10:30",
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subjectId) {
      setError("Please select a subject.")
      return
    }
    if (!teacherId) {
      setError("Please select a teacher.")
      return
    }

    const startMins = timeToMins(startTime)
    const endMins = timeToMins(endTime)
    if (endMins <= startMins) {
      setError("End time must be after start time.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSave({
        ...(isEdit && lesson ? { id: lesson.id } : {}),
        subject_id: subjectId,
        teacher_id: teacherId,
        day_of_week: dayOfWeek,
        start_time: `${startTime}:00`,
        end_time: `${endTime}:00`,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save slot")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent onClose={onClose} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Timetable Slot" : "Add Timetable Slot"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update details for this scheduled class slot."
              : "Configure a new subject slot for this class timetable."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Subject</label>
            <SubjectSelect
              subjects={subjects}
              value={subjectId}
              onChange={(id) => setSubjectId(id)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Teacher</label>
            <TeacherSelect
              teachers={teachers}
              value={teacherId}
              onChange={(id) => setTeacherId(id)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Day of Week</label>
            <Select
              value={dayOfWeek.toString()}
              onValueChange={(val) => setDayOfWeek(Number(val))}
              items={DAYS.map((d, index) => ({ value: index.toString(), label: d }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d, index) => (
                  <SelectItem key={d} value={index.toString()}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Start Time</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">End Time</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            {isEdit && onDelete && lesson && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onClose()
                  onDelete(lesson.id)
                }}
                disabled={saving}
                className="mr-auto"
              >
                <Trash2 className="mr-1.5 size-4" />
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Slot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── MAIN TIMETABLE COMPONENT ─────────────────────────────────────────────────

export default function TimetablePage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const [classes, setClasses] = useState<Class[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [lessons, setLessons] = useState<TimetableSlot[]>([])

  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)
  const [activeDay, setActiveDay] = useState<number>(0)
  const [viewMode, setViewMode] = useState<"list" | "week">("list")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [modal, setModal] = useState<ModalState | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  // Clear notifications
  useEffect(() => {
    if (!success) return
    const id = setTimeout(() => setSuccess(null), 4000)
    return () => clearTimeout(id)
  }, [success])

  // Load all initial data
  const loadData = useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      const [classesData, teachersData, subjectsData, lessonsData] =
        await Promise.all([
          api.listClasses(),
          api.listTeachers(),
          api.listSubjects(),
          api.listTimetableSlots(),
        ])

      setClasses(classesData)
      setTeachers(teachersData)
      setSubjects(subjectsData)
      setLessons(lessonsData)

      if (classesData.length > 0 && selectedClassId === null) {
        setSelectedClassId(classesData[0].id)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to load timetable data")
      }
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn, selectedClassId])

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadData()
    }
  }, [isLoaded, isSignedIn, loadData])

  const selectedClassIndex = useMemo(() => {
    return classes.findIndex((c) => c.id === selectedClassId)
  }, [classes, selectedClassId])

  const selectedClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) ?? null
  }, [classes, selectedClassId])

  // Filter lessons for selected class
  const filteredLessons = useMemo(() => {
    if (selectedClassId === null) return []
    return lessons.filter((l) => l.class_obj?.id === selectedClassId)
  }, [lessons, selectedClassId])

  // List view lessons for active day
  const listDayLessons = useMemo(() => {
    return filteredLessons
      .filter((l) => l.day_of_week === activeDay)
      .sort((a, b) => timeToMins(a.start_time) - timeToMins(b.start_time))
  }, [filteredLessons, activeDay])

  // Class navigation handlers
  const handlePrevClass = () => {
    if (classes.length === 0 || selectedClassIndex === -1) return
    const prevIdx = (selectedClassIndex - 1 + classes.length) % classes.length
    setSelectedClassId(classes[prevIdx].id)
  }

  const handleNextClass = () => {
    if (classes.length === 0 || selectedClassIndex === -1) return
    const nextIdx = (selectedClassIndex + 1) % classes.length
    setSelectedClassId(classes[nextIdx].id)
  }

  // Add or Edit slot save handler
  const handleSave = useCallback(
    async (payload: {
      id?: number
      subject_id: number
      teacher_id: number
      day_of_week: number
      start_time: string
      end_time: string
    }) => {
      if (!isSignedIn || selectedClassId === null) return
      setError(null)

      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      if (payload.id) {
        // Edit
        await api.updateTimetableSlot(payload.id, {
          class_obj_id: selectedClassId,
          subject_id: payload.subject_id,
          teacher_id: payload.teacher_id,
          day_of_week: payload.day_of_week,
          start_time: payload.start_time,
          end_time: payload.end_time,
        })
        setSuccess("Timetable slot updated successfully.")
      } else {
        // Add
        await api.createTimetableSlot({
          class_obj_id: selectedClassId,
          subject_id: payload.subject_id,
          teacher_id: payload.teacher_id,
          day_of_week: payload.day_of_week,
          start_time: payload.start_time,
          end_time: payload.end_time,
        })
        setSuccess("Timetable slot added successfully.")
      }

      setModal(null)
      await loadData()
    },
    [getToken, isSignedIn, selectedClassId, loadData],
  )

  const handleDelete = useCallback(
    async (id: number) => {
      if (!isSignedIn) return
      setError(null)
      setDeleteSubmitting(true)

      try {
        const token = await getToken()
        if (!token) throw new Error("No auth token available")
        const api = createApi(token)

        await api.deleteTimetableSlot(id)
        setSuccess("Timetable slot deleted successfully.")
        setDeleteConfirmId(null)
        await loadData()
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.userMessage)
        } else {
          setError(err instanceof Error ? err.message : "Failed to delete timetable slot")
        }
      } finally {
        setDeleteSubmitting(false)
      }
    },
    [getToken, isSignedIn, loadData],
  )

  // ── Week View Renderer ────────────────────────────────────────────────────

  const renderWeekEvents = (dayIndex: number) => {
    const dayLessons = lessons
      .filter((l) => l.day_of_week === dayIndex && l.class_obj?.id === selectedClassId)
      .sort((a, b) => {
        const diff = timeToMins(a.start_time) - timeToMins(b.start_time)
        if (diff !== 0) return diff
        return (
          timeToMins(a.end_time) -
          timeToMins(a.start_time) -
          (timeToMins(b.end_time) - timeToMins(b.start_time))
        )
      })

    // Group into clusters of overlapping events
    const clusters: TimetableSlot[][] = []
    let currentCluster: TimetableSlot[] = []
    let clusterEnd = 0

    for (const lesson of dayLessons) {
      const start = timeToMins(lesson.start_time)
      const end = timeToMins(lesson.end_time)

      if (currentCluster.length === 0) {
        currentCluster.push(lesson)
        clusterEnd = end
      } else if (start < clusterEnd) {
        currentCluster.push(lesson)
        clusterEnd = Math.max(clusterEnd, end)
      } else {
        clusters.push(currentCluster)
        currentCluster = [lesson]
        clusterEnd = end
      }
    }
    if (currentCluster.length > 0) {
      clusters.push(currentCluster)
    }

    const renderedEvents: React.ReactNode[] = []
    const dayStart = 7 * 60
    const pxPerMin = 64 / 60

    for (const cluster of clusters) {
      // Pack events into columns
      const columns: TimetableSlot[][] = []
      for (const lesson of cluster) {
        let placed = false
        const start = timeToMins(lesson.start_time)

        for (let c = 0; c < columns.length; c++) {
          const lastInCol = columns[c][columns[c].length - 1]
          if (start >= timeToMins(lastInCol.end_time)) {
            columns[c].push(lesson)
            placed = true
            break
          }
        }
        if (!placed) {
          columns.push([lesson])
        }
      }

      const totalCols = columns.length
      for (let c = 0; c < totalCols; c++) {
        for (const lesson of columns[c]) {
          const s = timeToMins(lesson.start_time)
          const e = timeToMins(lesson.end_time)
          const top = (s - dayStart) * pxPerMin
          const height = Math.max((e - s) * pxPerMin, 32)

          const wPct = 100 / totalCols
          const lPct = c * wPct

          renderedEvents.push(
            <div
              key={lesson.id}
              onClick={() => {
                setModal({ mode: "edit", lesson })
              }}
              style={{
                top: `${top}px`,
                height: `${height}px`,
                width: `calc(${wPct}% - 4px)`,
                left: `calc(${lPct}% + 2px)`,
              }}
              className="absolute p-2 rounded-xl cursor-pointer transition-all duration-200 overflow-hidden flex flex-col group hover:z-30 hover:!w-[calc(100%-8px)] hover:!left-[4px] hover:shadow-xl border border-primary/30 bg-card hover:bg-muted"
            >
              <div className="text-xs font-bold text-foreground truncate">
                {lesson.subject.name}
              </div>
              <div className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                <User className="size-3 shrink-0" />
                {lesson.teacher.name}
              </div>
              <div className="text-[10px] text-muted-foreground/80 mt-0.5 font-mono">
                {lesson.start_time.substring(0, 5)}–{lesson.end_time.substring(0, 5)}
              </div>
              <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>,
          )
        }
      }
    }

    return renderedEvents
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view class timetables.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background text-foreground">
      {/* ── TOP NAV & CLASS SELECTION BAR ── */}
      <div className="border-b bg-card/40 shadow-2xs">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 py-4 max-w-7xl space-y-4">
        {/* Row 1: Header title, Refresh & Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold">
              <Calendar className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Class Timetables</h1>
              <p className="text-xs text-muted-foreground">
                View, manage, and schedule class sessions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={loadData}
              disabled={loading}
              title="Refresh Timetable Data"
              className="shrink-0"
            >
              <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>

            {/* List / Week view switcher */}
            <div className="flex rounded-xl border border-border bg-muted/50 p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>List View</span>
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "week"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Week View</span>
              </button>
            </div>

            <Button
              onClick={() => setModal({ mode: "add", prefillDayOfWeek: activeDay })}
              disabled={selectedClassId === null}
              className="gap-1.5 shadow-xs"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add Timetable Slot</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        {/* Row 2: Mobile-Friendly Class Navigation & Quick Pills */}
        <div className="flex items-center gap-3">
          {/* Cycle prev/next buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handlePrevClass}
              disabled={classes.length <= 1}
              title="Previous Class"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleNextClass}
              disabled={classes.length <= 1}
              title="Next Class"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Quick Select Dropdown */}
          <div className="w-48 sm:w-56 shrink-0">
            <Select
              value={selectedClassId?.toString() ?? ""}
              onValueChange={(val) => setSelectedClassId(val ? Number(val) : null)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select Class…" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {getClassName(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Horizontal Scrollable Class Pills */}
          <div className="flex-1 overflow-x-auto hinthar-scrollbar py-0.5">
            <div className="flex items-center gap-2 min-w-max">
              {classes.map((cls) => {
                const isActive = cls.id === selectedClassId
                const slotCount = lessons.filter((l) => l.class_obj?.id === cls.id).length
                return (
                  <motion.button
                    key={cls.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setSelectedClassId(cls.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-card border-border hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{getClassName(cls)}</span>
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {slotCount}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* ── BANNERS ── */}
      <div className="container mx-auto px-4 sm:px-6 md:px-8 max-w-7xl">
        {error && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span>{error}</span>
            <Button size="xs" variant="ghost" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
            <span>{success}</span>
            <Button size="xs" variant="ghost" onClick={() => setSuccess(null)}>
              Dismiss
            </Button>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-6 max-w-7xl flex-1 overflow-hidden min-h-0">
        {/* ── LIST VIEW ── */}
        {viewMode === "list" && (
          <div className="max-w-4xl mx-auto space-y-5 pb-20">
            {/* Day tabs ─ horizontally scrollable on mobile */}
            <div className="overflow-x-auto hinthar-scrollbar border-b border-border">
              <div className="flex gap-1.5 min-w-max pb-1">
                {DAYS.map((d, index) => {
                  const daySlotCount = filteredLessons.filter((l) => l.day_of_week === index).length
                  const isActive = index === activeDay
                  return (
                    <button
                      key={d}
                      onClick={() => setActiveDay(index)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                        isActive
                          ? "text-primary border-primary bg-primary/5"
                          : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      <span>{d}</span>
                      {daySlotCount > 0 && (
                        <span
                          className={`inline-flex size-5 items-center justify-center rounded-full text-[11px] font-bold ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {daySlotCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Lessons list for selected day */}
            {listDayLessons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border bg-card/40 p-8">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 mb-4 text-muted-foreground">
                  <Calendar className="size-7" />
                </div>
                <p className="text-base font-semibold text-foreground">
                  No slots scheduled for {DAYS[activeDay]}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  Add a timetable slot for {selectedClass ? getClassName(selectedClass) : "this class"} to get started.
                </p>
                <Button
                  onClick={() => setModal({ mode: "add", prefillDayOfWeek: activeDay })}
                  disabled={selectedClassId === null}
                  className="mt-5 gap-2"
                >
                  <Plus className="size-4" /> Add Timetable Slot
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {listDayLessons.map((lesson) => {
                  const durationStr = getDurationMinutes(lesson.start_time, lesson.end_time)
                  return (
                    <motion.div
                      key={lesson.id}
                      whileHover={{ scale: 1.005 }}
                      onClick={() => setModal({ mode: "edit", lesson })}
                      className="group relative flex flex-col md:flex-row md:items-center justify-between rounded-2xl border border-border/80 bg-card p-4 md:p-5 shadow-xs transition-all hover:bg-muted/40 hover:border-primary/40 cursor-pointer"
                    >
                      {/* Left: Subject & Teacher Info */}
                      <div className="flex items-center gap-4 min-w-0 mb-3 md:mb-0">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
                          <BookOpen className="size-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold tracking-tight text-foreground truncate">
                            {lesson.subject.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <User className="size-3.5 text-muted-foreground" />
                              {lesson.teacher.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Time Pill & Quick Action Buttons */}
                      <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-border/60">
                        <div className="flex items-center gap-2 rounded-xl bg-muted/80 px-3.5 py-2 border border-border/60">
                          <Clock className="size-4 text-primary shrink-0" />
                          <span className="text-sm font-bold tabular-nums text-foreground">
                            {lesson.start_time.substring(0, 5)} – {lesson.end_time.substring(0, 5)}
                          </span>
                          {durationStr && (
                            <span className="text-xs text-muted-foreground font-medium pl-1 border-l border-border">
                              {durationStr}
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              setModal({ mode: "edit", lesson })
                            }}
                            title="Edit Slot"
                          >
                            <Edit3 className="size-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirmId(lesson.id)
                            }}
                            title="Delete Slot"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* Add slot button footer */}
            <button
              onClick={() => setModal({ mode: "add", prefillDayOfWeek: activeDay })}
              disabled={selectedClassId === null}
              className="w-full min-h-[52px] py-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground text-sm font-semibold hover:text-foreground hover:border-primary hover:bg-muted/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="size-4" /> Add Timetable Slot
            </button>
          </div>
        )}

        {/* ── WEEK VIEW ── */}
        {viewMode === "week" && (
          <div className="overflow-x-auto hinthar-scrollbar h-full rounded-2xl border border-border bg-card shadow-xs">
            <div className="min-w-[800px] flex flex-col h-full">
              {/* Day headers */}
              <div className="flex border-b border-border sticky top-0 bg-muted/40 z-20">
                <div className="w-20 shrink-0 border-r border-border p-3 text-center text-xs font-bold text-muted-foreground">
                  Time
                </div>
                {DAYS.map((d, index) => (
                  <div
                    key={d}
                    className={`flex-1 py-3 text-center text-xs font-bold border-r border-border last:border-r-0 ${
                      index === activeDay ? "text-primary bg-primary/5" : "text-muted-foreground"
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid + events */}
              <div className="flex-1 overflow-y-auto relative hinthar-scrollbar">
                {HOURS.map((h) => (
                  <div key={h} className="flex border-b border-border/60 h-16">
                    <div className="w-20 shrink-0 border-r border-border p-2 text-right text-xs font-mono text-muted-foreground sticky left-0 bg-card z-10">
                      {h.toString().padStart(2, "0")}:00
                    </div>
                    {DAYS.map((d, index) => (
                      <div
                        key={d}
                        className="flex-1 border-r border-border/60 last:border-r-0 relative hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() =>
                          selectedClassId !== null &&
                          setModal({
                            mode: "add",
                            prefillDayOfWeek: index,
                          })
                        }
                      />
                    ))}
                  </div>
                ))}

                {/* Absolute events overlay */}
                <div className="absolute top-0 left-20 right-0 bottom-0 pointer-events-none">
                  <div className="flex h-full w-full">
                    {DAYS.map((d, index) => (
                      <div key={d} className="flex-1 relative pointer-events-auto h-full">
                        {renderWeekEvents(index)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── LESSON MODAL ── */}
      {modal && (
        <SlotModal
          modal={modal}
          teachers={teachers}
          subjects={subjects}
          onSave={handleSave}
          onDelete={(id) => setDeleteConfirmId(id)}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(val) => !val && setDeleteConfirmId(null)}>
        <DialogContent onClose={() => setDeleteConfirmId(null)}>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this timetable slot? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={deleteSubmitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
