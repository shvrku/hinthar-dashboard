"use client"

import React, { useState, useMemo, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { createApi, ApiError } from "@/lib/api"
import type { Class, TimetableSlot } from "@/lib/types"
import { useClassesQuery, useSubjectsQuery, useTeachersSelectQuery } from "@/hooks/use-api-queries"
import {
  Search,
  BookOpen,
  Clock,
  Calendar,
  Edit3,
  User,
  CalendarDays,
  List,
  X,
  Plus,
  Check,
  Trash2,
} from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { StandardPageHeader, buildReloadAction } from "@/components/standard-page-header"
import { Badge } from "@/components/ui/badge"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { WeekGridSkeleton } from "@/components/page-skeletons"
import { DAYS, HOURS, getClassName, getDurationMinutes, timeToMins } from "@/components/timetable/grid-utils"
import { SlotModal, type ModalState } from "@/components/timetable/slot-editor"

// ─── MAIN TIMETABLE COMPONENT ─────────────────────────────────────────────────

export default function TimetableClassPage() {
  const params = useParams()
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const routeClassId = Number(params.classId)
  const classesQuery = useClassesQuery(!!isLoaded && !!isSignedIn)
  const teachersQuery = useTeachersSelectQuery(!!isLoaded && !!isSignedIn)
  const subjectsQuery = useSubjectsQuery(!!isLoaded && !!isSignedIn)
  const classes = classesQuery.data ?? []
  const teachers = teachersQuery.data ?? []
  const subjects = subjectsQuery.data ?? []

  const [lessons, setLessons] = useState<TimetableSlot[]>([])

  const [selectedClassId, setSelectedClassId] = useState<number | null>(
    Number.isFinite(routeClassId) ? routeClassId : null
  )
  const [activeDay, setActiveDay] = useState<number>(0)
  const [viewMode, setViewMode] = useState<"list" | "week">("week")

  const [loading, setLoading] = useState(false)
  const [lastLoaded, setLastLoaded] = useState<string | null>(null)
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

  useEffect(() => {
    if (Number.isFinite(routeClassId)) {
      setSelectedClassId(routeClassId)
    }
  }, [routeClassId])

  // Load all initial data
  const loadData = useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const slotClassId = Number.isFinite(routeClassId) ? routeClassId : undefined
      const lessonsData = slotClassId
        ? await api.listTimetableSlots({ class_id: slotClassId })
        : []

      setLessons(lessonsData)

      const classesData = classesQuery.data ?? []
      if (Number.isFinite(routeClassId) && classesData.some((c) => c.id === routeClassId)) {
        setSelectedClassId(routeClassId)
      } else if (classesData.length > 0 && !Number.isFinite(routeClassId)) {
        router.replace(`/timetable/${classesData[0].id}/`)
      } else if (Number.isFinite(routeClassId) && classesData.length > 0 && !classesData.some((c) => c.id === routeClassId)) {
        setError("Class not found.")
      }
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to load timetable data")
      }
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn, routeClassId, router, classesQuery.data])

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadData()
    }
  }, [isLoaded, isSignedIn, loadData])

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
          const height = Math.max((e - s) * pxPerMin, 68)

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
                minHeight: `${height}px`,
                width: `calc(${wPct}% - 4px)`,
                left: `calc(${lPct}% + 2px)`,
              }}
              className="absolute p-2 rounded-xl cursor-pointer transition-all duration-200 flex flex-col group hover:z-30 hover:!w-[calc(100%-8px)] hover:!left-[4px] hover:shadow-xl border border-primary/30 bg-card hover:bg-muted"
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
      <StaggerContainer className="space-y-6">
        <StaggerItem>
          <StandardPageHeader
            title="Class Timetable"
            back={{ href: "/timetable/", label: "Timetable" }}
          />
        </StaggerItem>
        <StaggerItem>
          <WeekGridSkeleton />
        </StaggerItem>
      </StaggerContainer>
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
    <StaggerContainer className="space-y-6">
      {/* Standardized Header */}
      <StaggerItem>
        <StandardPageHeader
          title={
            selectedClass
              ? `Timetable • ${getClassName(selectedClass)}`
              : "Class Timetable"
          }
          back={{ href: "/timetable/", label: "Timetable" }}
          secondaryAction={buildReloadAction({
            hasLoaded: !!lastLoaded,
            loading,
            onClick: loadData,
          })}
        />
      </StaggerItem>

      {/* Metric Highlights Strip */}
      <StaggerItem>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Timetable Slots
              </p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Calendar className="size-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                {filteredLessons.length}
              </h2>
              <span className="text-[11px] text-muted-foreground">This class</span>
            </div>
          </Card>
        </div>
      </StaggerItem>

      {/* Timetable Toolbar */}
      <StaggerItem>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 rounded-xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center gap-2.5 shrink-0 justify-end">
            <div className="flex rounded-lg border border-border bg-muted/50 p-1">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="size-3.5" />
                <span>List View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "week"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarDays className="size-3.5" />
                <span>Week View</span>
              </button>
            </div>

            <Button
              onClick={() => setModal({ mode: "add", prefillDayOfWeek: activeDay })}
              disabled={selectedClassId === null || !lastLoaded}
              className="gap-1.5 shadow-xs"
            >
              <Plus className="size-4" />
              <span>Add Slot</span>
            </Button>
          </div>
        </div>
      </StaggerItem>

      {/* ── BANNERS ── */}
      <div>
        {error && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span>{error}</span>
            <Button size="xs" variant="ghost" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            <span>{success}</span>
            <Button size="xs" variant="ghost" onClick={() => setSuccess(null)}>
              Dismiss
            </Button>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
      <StaggerItem className="container mx-auto max-w-7xl flex-1 overflow-hidden min-h-0 px-4 pb-6 sm:px-6 md:px-8">
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
              <Empty className="border border-dashed bg-card/40 py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Calendar />
                  </EmptyMedia>
                  <EmptyTitle>No slots scheduled for {DAYS[activeDay]}</EmptyTitle>
                  <EmptyDescription>
                    Add a timetable slot for{" "}
                    {selectedClass ? getClassName(selectedClass) : "this class"} to get started.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    onClick={() => setModal({ mode: "add", prefillDayOfWeek: activeDay })}
                    disabled={selectedClassId === null}
                    className="gap-2"
                  >
                    <Plus className="size-4" /> Add Timetable Slot
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {listDayLessons.map((lesson) => {
                  const durationStr = getDurationMinutes(lesson.start_time, lesson.end_time)
                  return (
                    <div
                      key={lesson.id}
                      onClick={() => setModal({ mode: "edit", lesson })}
                      className="group relative flex flex-col md:flex-row md:items-center justify-between rounded-2xl border border-border/80 bg-card p-4 md:p-5 shadow-xs transition-all hover:bg-muted/40 hover:border-primary/40 hover:scale-[1.005] cursor-pointer"
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
                    </div>
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
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Legend</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-primary/80" /> Slot block
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm border border-dashed border-border bg-muted/40" /> Empty hour (click to add)
              </span>
            </div>
            {filteredLessons.length === 0 ? (
              <Empty className="border border-dashed bg-card/40 py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarDays />
                  </EmptyMedia>
                  <EmptyTitle>No slots this week</EmptyTitle>
                  <EmptyDescription>
                    {selectedClass
                      ? `${getClassName(selectedClass)} has no timetable slots yet.`
                      : "Select a class, then add slots for the week."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    onClick={() => setModal({ mode: "add", prefillDayOfWeek: activeDay })}
                    disabled={selectedClassId === null}
                    className="gap-2"
                  >
                    <Plus className="size-4" /> Add Timetable Slot
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
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
        )}
      </StaggerItem>

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

      <ConfirmDialog
        open={deleteConfirmId !== null}
        title="Confirm Delete"
        description="Are you sure you want to delete this timetable slot? This action cannot be undone."
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        onCancel={() => setDeleteConfirmId(null)}
        loading={deleteSubmitting}
      />
    </StaggerContainer>
  )
}
