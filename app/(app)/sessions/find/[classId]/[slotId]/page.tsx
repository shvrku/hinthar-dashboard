"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { ClipboardList, Loader2, Pencil } from "lucide-react"
import { ApiError, createApi } from "@/lib/api"
import {
  SESSION_STATUSES,
  type Class,
  type Session,
  type SessionPayload,
  type SessionStatus,
  type Teacher,
  type TimetableSlot,
} from "@/lib/types"
import { formatClassLabel } from "@/lib/format-class"
import {
  cn,
  formatBackendDateTime,
  parseBackendDateTime,
  toLocalDateString,
  toMonthEndDateString,
  toSessionDateString,
} from "@/lib/utils"
import { RequireRole } from "@/components/require-role"
import { SessionTeacherCell } from "@/components/session-teacher-cell"
import { SearchableSelect } from "@/components/searchable-select"
import { StandardPageHeader, buildReloadAction } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AnimatedTableBody } from "@/components/animation/animated-table-body"
import { SessionOccurrenceTableSkeletonRows } from "@/components/page-skeletons"

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const TIME_SLOTS = Array.from({ length: 29 }).map((_, i) => {
  const hour = Math.floor(7 + i / 2)
  const minute = i % 2 === 0 ? "00" : "30"
  const hourStr = hour.toString().padStart(2, "0")
  const value = `${hourStr}:${minute}:00`
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return { value, label: `${displayHour}:${minute} ${ampm}` }
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

function takeRollHrefForSession(session: Session, fallbackClassId?: number): string | null {
  const classId = session.class_obj?.id ?? fallbackClassId
  if (!classId || !session.start_time) return null
  const d = parseBackendDateTime(session.start_time)
  if (isNaN(d.getTime())) return null
  const qs = new URLSearchParams({
    date: toLocalDateString(d),
    layout: "roster",
    session_id: String(session.id),
  })
  return `/attendance/class/${classId}/?${qs.toString()}`
}

function statusBadge(status: SessionStatus | string | null | undefined) {
  const label =
    SESSION_STATUSES.find((s) => s.value === status)?.label ?? status ?? "—"
  return <Badge variant="outline">{label}</Badge>
}

function FindSlotSessionsContent() {
  const params = useParams()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const classId = Number(params.classId)
  const slotId = Number(params.slotId)

  const [classObj, setClassObj] = React.useState<Class | null>(null)
  const [slot, setSlot] = React.useState<TimetableSlot | null>(null)
  const [teachers, setTeachers] = React.useState<Teacher[]>([])
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [dateFrom, setDateFrom] = React.useState(() => toLocalDateString())
  const [dateTo, setDateTo] = React.useState(() => toMonthEndDateString())
  const [loading, setLoading] = React.useState(true)
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const [editingSession, setEditingSession] = React.useState<Session | null>(null)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [formDate, setFormDate] = React.useState("")
  const [formStartTime, setFormStartTime] = React.useState("")
  const [formDuration, setFormDuration] = React.useState("60")
  const [formCustomEndTime, setFormCustomEndTime] = React.useState("")
  const [formStatus, setFormStatus] = React.useState("")
  const [formTeacherId, setFormTeacherId] = React.useState("")
  const [formActualTeacherId, setFormActualTeacherId] = React.useState("")

  const teacherOptions = React.useMemo(
    () =>
      teachers.map((t) => ({
        value: String(t.id),
        label: t.name,
        subLabel: t.unique_code ?? undefined,
      })),
    [teachers]
  )

  const loadData = React.useCallback(async () => {
    if (!isSignedIn || !Number.isFinite(classId) || !Number.isFinite(slotId)) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const [cls, classSlots, allTeachers, sessionsPage] = await Promise.all([
        api.getClass(classId),
        api.listTimetableSlots({ class_id: classId }, true),
        api.listTeachersForSelect(),
        api.listSessionsPage({
          class_id: classId,
          timetable_slot_id: slotId,
          date_from: dateFrom,
          date_to: dateTo,
          page: 1,
          page_size: 200,
        }),
      ])
      const foundSlot =
        (classSlots || []).find(
          (s) => s.id === slotId && s.class_obj?.id === classId
        ) ?? null
      setClassObj(cls)
      setSlot(foundSlot)
      setTeachers(allTeachers || [])
      const list = sessionsPage.results || []
      list.sort((a, b) => {
        const ta = parseBackendDateTime(a.start_time).getTime()
        const tb = parseBackendDateTime(b.start_time).getTime()
        return (isNaN(ta) ? 0 : ta) - (isNaN(tb) ? 0 : tb)
      })
      // Client-side range clamp — API stores/custom-formats datetimes; keep UI honest.
      setSessions(
        list.filter((s) => {
          const day = toSessionDateString(s.start_time)
          if (day === "—") return false
          return day >= dateFrom && day <= dateTo
        })
      )
      setLastLoaded(new Date().toLocaleTimeString())
      if (!foundSlot) setError("Timetable slot not found for this class.")
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.userMessage
          : err instanceof Error
            ? err.message
            : "Failed to load sessions"
      )
    } finally {
      setLoading(false)
    }
  }, [classId, dateFrom, dateTo, getToken, isSignedIn, slotId])

  React.useEffect(() => {
    if (isLoaded && isSignedIn) void loadData()
  }, [isLoaded, isSignedIn, loadData])

  React.useEffect(() => {
    if (!success) return
    const id = window.setTimeout(() => setSuccess(null), 3500)
    return () => window.clearTimeout(id)
  }, [success])

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
        if (found) durationVal = found.value
        else {
          customEnd = et.toTimeString().split(" ")[0]
          durationVal = "custom"
        }
      }
    }
    setFormDuration(durationVal)
    setFormCustomEndTime(customEnd)
    setFormStatus(session.status ?? "")
    setFormTeacherId(session.teacher ? String(session.teacher.id) : "")
    setFormActualTeacherId(
      session.actual_teacher ? String(session.actual_teacher.id) : ""
    )
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingSession(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSession || !formDate || !formStartTime) return
    setSaving(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const startD = new Date(`${formDate}T${formStartTime}`)
      let endD: Date
      if (formDuration === "custom") {
        if (!formCustomEndTime) throw new Error("Please specify custom end time")
        endD = new Date(`${formDate}T${formCustomEndTime}`)
      } else {
        endD = new Date(startD.getTime() + parseInt(formDuration, 10) * 60 * 1000)
      }
      const payload: SessionPayload = {
        start_time: startD.toISOString(),
        end_time: endD.toISOString(),
        status: formStatus === "" ? null : (formStatus as SessionStatus),
        teacher_id: formTeacherId ? parseInt(formTeacherId, 10) : null,
        actual_teacher_id: formActualTeacherId
          ? parseInt(formActualTeacherId, 10)
          : null,
        class_obj_id: classId,
        timetable_slot_id: slotId,
      }
      await createApi(token).updateSession(editingSession.id, payload)
      setSuccess(`Session #${editingSession.id} updated.`)
      closeModal()
      await loadData()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.userMessage
          : err instanceof Error
            ? err.message
            : "Failed to save session"
      )
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Please sign in to manage sessions.
      </div>
    )
  }

  const classLabel = classObj ? formatClassLabel(classObj) : null
  const slotTitle = slot
    ? `${slot.subject.name} · ${DAYS_SHORT[slot.day_of_week] ?? slot.day_of_week} ${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}`
    : `Slot #${slotId}`

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <StandardPageHeader
          title={slotTitle}
          back={{
            href: `/sessions/find/${classId}/`,
            label: classLabel ? `Find sessions • ${classLabel}` : "Find sessions",
          }}
          secondaryAction={buildReloadAction({
            hasLoaded: !!lastLoaded,
            loading,
            onClick: () => void loadData(),
          })}
        />
      </StaggerItem>

      <StaggerItem>
        <Card className="flex flex-col gap-3 border-border/80 p-4 shadow-xs sm:flex-row sm:items-end sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {slot ? (
              <p>
                Assigned teacher:{" "}
                <span className="font-medium text-foreground">{slot.teacher.name}</span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[150px]"
              />
            </div>
          </div>
        </Card>
      </StaggerItem>

      {error ? (
        <StaggerItem>
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        </StaggerItem>
      ) : null}
      {success ? (
        <StaggerItem>
          <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            {success}
          </div>
        </StaggerItem>
      ) : null}

      <StaggerItem>
        <Card className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <AnimatedTableBody
              loading={loading}
              hasData={sessions.length > 0}
              rowCount={8}
              skeletonRowCount={8}
              colSpan={7}
              skeleton={<SessionOccurrenceTableSkeletonRows rows={8} />}
              idle={lastLoaded === null}
              idleTitle="No sessions loaded yet"
              idleDescription="Reload to fetch occurrences for this timetable slot."
              emptyTitle="No sessions for this slot"
              emptyDescription="No sessions in the selected date range. Try widening the range."
            >
              {sessions.map((session) => {
                const rollHref = takeRollHrefForSession(session, classId)
                return (
                  <TableRow
                    key={session.id}
                    className="cursor-pointer"
                    onClick={() => openEditModal(session)}
                  >
                    <TableCell className="font-semibold">{session.id}</TableCell>
                    <TableCell className="whitespace-nowrap font-medium">
                      {toSessionDateString(session.start_time)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatBackendDateTime(session.start_time)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatBackendDateTime(session.end_time)}
                    </TableCell>
                    <TableCell
                      className="max-w-[220px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SessionTeacherCell
                        teacher={session.teacher}
                        actualTeacher={session.actual_teacher}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {statusBadge(session.status)}
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {rollHref ? (
                          <Link
                            href={rollHref}
                            title="Take roll"
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "icon-sm" })
                            )}
                          >
                            <ClipboardList className="size-4" />
                          </Link>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Edit"
                          onClick={() => openEditModal(session)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </AnimatedTableBody>
          </Table>
        </Card>
      </StaggerItem>

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent onClose={closeModal} className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingSession ? `Edit Session #${editingSession.id}` : "Edit Session"}
            </DialogTitle>
            <DialogDescription>
              Update schedule, assigned teacher, and substitute for this occurrence.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Assigned teacher</label>
                <Select
                  value={formTeacherId}
                  onValueChange={(val) => setFormTeacherId(val ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) =>
                        teachers.find((t) => t.id.toString() === value)?.name ??
                        (value ? `Teacher #${value}` : "Select Teacher")
                      }
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
                options={teacherOptions}
                value={formActualTeacherId}
                onValueChange={setFormActualTeacherId}
                placeholder="None — taught as assigned"
                searchPlaceholder="Search teachers…"
              />
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

            {formDuration === "custom" ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Custom end time</label>
                <Input
                  type="time"
                  step={60}
                  value={formCustomEndTime.slice(0, 5)}
                  onChange={(e) =>
                    setFormCustomEndTime(
                      e.target.value.length === 5 ? `${e.target.value}:00` : e.target.value
                    )
                  }
                />
              </div>
            ) : null}

            <div>
              <label className="mb-1.5 block text-sm font-medium">Status</label>
              <Select
                items={SESSION_STATUSES}
                value={formStatus}
                onValueChange={(val) => setFormStatus(val ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      SESSION_STATUSES.find((s) => s.value === value)?.label ??
                      (value || "Status")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SESSION_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </StaggerContainer>
  )
}

export default function FindSlotSessionsPage() {
  return (
    <RequireRole mode="staff">
      <FindSlotSessionsContent />
    </RequireRole>
  )
}
