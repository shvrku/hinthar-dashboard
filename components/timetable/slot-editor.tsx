"use client"

import React, { useState } from "react"
import type { Subject, Teacher, TimetableSlot } from "@/lib/types"
import {
  Search,
  BookOpen,
  User,
  Check,
  ChevronDown,
  Loader2,
  Trash2,
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
import { DAYS, timeToMins } from "@/components/timetable/grid-utils"

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

export type ModalState =
  | { mode: "add"; prefillDayOfWeek?: number }
  | { mode: "edit"; lesson: TimetableSlot }

export function SlotModal({
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
