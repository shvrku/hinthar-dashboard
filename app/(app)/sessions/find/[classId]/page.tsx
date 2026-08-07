"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { CalendarDays, Loader2, User } from "lucide-react"
import { ApiError, createApi } from "@/lib/api"
import type { Class, TimetableSlot } from "@/lib/types"
import { formatClassLabel } from "@/lib/format-class"
import { cn } from "@/lib/utils"
import { RequireRole } from "@/components/require-role"
import { StandardPageHeader, buildReloadAction } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const HOURS = Array.from({ length: 10 }, (_, i) => i + 7) // 07:00–16:00
const LAST_CLASS_KEY = "hinthar.sessions.find.lastClassId"

function timeToMins(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function FindSessionsClassContent() {
  const params = useParams()
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const classId = Number(params.classId)

  const [classObj, setClassObj] = React.useState<Class | null>(null)
  const [slots, setSlots] = React.useState<TimetableSlot[]>([])
  const [activeDay, setActiveDay] = React.useState(() => {
    const d = new Date().getDay()
    return d === 0 ? 6 : d - 1
  })
  const [loading, setLoading] = React.useState(true)
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const loadCore = React.useCallback(async () => {
    if (!isSignedIn || !Number.isFinite(classId)) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const [cls, classSlots] = await Promise.all([
        api.getClass(classId),
        api.listTimetableSlots({ class_id: classId }, true),
      ])
      setClassObj(cls)
      // Same scope as the timetable editor: only this class's slots.
      setSlots((classSlots || []).filter((s) => s.class_obj?.id === classId))
      if (typeof window !== "undefined") {
        localStorage.setItem(LAST_CLASS_KEY, String(classId))
      }
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.userMessage
          : err instanceof Error
            ? err.message
            : "Failed to load class"
      )
    } finally {
      setLoading(false)
    }
  }, [classId, getToken, isSignedIn])

  React.useEffect(() => {
    if (isLoaded && isSignedIn) void loadCore()
  }, [isLoaded, isSignedIn, loadCore])

  const openSlot = React.useCallback(
    (slotId: number) => {
      router.push(`/sessions/find/${classId}/${slotId}/`)
    },
    [classId, router]
  )

  const renderWeekEvents = (dayIndex: number) => {
    const dayLessons = slots
      .filter((l) => l.day_of_week === dayIndex)
      .sort((a, b) => {
        const diff = timeToMins(a.start_time) - timeToMins(b.start_time)
        if (diff !== 0) return diff
        return (
          timeToMins(a.end_time) -
          timeToMins(a.start_time) -
          (timeToMins(b.end_time) - timeToMins(b.start_time))
        )
      })

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
    if (currentCluster.length > 0) clusters.push(currentCluster)

    const renderedEvents: React.ReactNode[] = []
    const dayStart = 7 * 60
    const pxPerMin = 64 / 60

    for (const cluster of clusters) {
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
        if (!placed) columns.push([lesson])
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
            <button
              key={lesson.id}
              type="button"
              onClick={() => openSlot(lesson.id)}
              style={{
                top: `${top}px`,
                minHeight: `${height}px`,
                width: `calc(${wPct}% - 4px)`,
                left: `calc(${lPct}% + 2px)`,
              }}
              className="absolute p-2 rounded-xl cursor-pointer transition-all duration-200 flex flex-col group hover:z-30 hover:!w-[calc(100%-8px)] hover:!left-[4px] hover:shadow-xl border border-primary/30 bg-card hover:bg-muted text-left"
            >
              <div className="text-xs font-bold text-foreground truncate">
                {lesson.subject.name}
              </div>
              <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-medium text-muted-foreground">
                <User className="size-3 shrink-0" />
                {lesson.teacher.name}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/80">
                {lesson.start_time.substring(0, 5)}–{lesson.end_time.substring(0, 5)}
              </div>
            </button>
          )
        }
      }
    }

    return renderedEvents
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
        Please sign in to find sessions.
      </div>
    )
  }

  if (!Number.isFinite(classId)) {
    return (
      <div className="py-16 text-center text-muted-foreground">Invalid class id.</div>
    )
  }

  const classLabel = classObj ? formatClassLabel(classObj) : null

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <StandardPageHeader
          title={classLabel ? `Find sessions • ${classLabel}` : "Find sessions"}
          description="Week grid of timetable slots — click a slot to open its sessions table."
          back={{ href: "/sessions/find/", label: "Find sessions" }}
          secondaryAction={buildReloadAction({
            hasLoaded: !!lastLoaded,
            loading,
            onClick: () => void loadCore(),
          })}
        />
      </StaggerItem>

      {error ? (
        <StaggerItem>
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        </StaggerItem>
      ) : null}

      <StaggerItem>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Legend</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-primary/80" /> Slot block (click to open sessions)
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading timetable…
            </div>
          ) : slots.length === 0 ? (
            <Empty className="border border-dashed bg-card/40 py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarDays />
                </EmptyMedia>
                <EmptyTitle>No slots this week</EmptyTitle>
                <EmptyDescription>
                  {classLabel
                    ? `${classLabel} has no timetable slots yet.`
                    : "Build a timetable for this class first."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" render={<Link href={`/timetable/${classId}/`} />}>
                  Open timetable
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="overflow-x-auto hinthar-scrollbar h-full rounded-2xl border border-border bg-card shadow-xs">
              <div className="flex h-full min-w-[800px] flex-col">
                <div className="sticky top-0 z-20 flex border-b border-border bg-muted/40">
                  <div className="w-20 shrink-0 border-r border-border p-3 text-center text-xs font-bold text-muted-foreground">
                    Time
                  </div>
                  {DAYS.map((d, index) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setActiveDay(index)}
                      className={cn(
                        "flex-1 border-r border-border py-3 text-center text-xs font-bold last:border-r-0",
                        index === activeDay
                          ? "bg-primary/5 text-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 overflow-y-auto hinthar-scrollbar">
                  {HOURS.map((h) => (
                    <div key={h} className="flex h-16 border-b border-border/60">
                      <div className="sticky left-0 z-10 w-20 shrink-0 border-r border-border bg-card p-2 text-right font-mono text-xs text-muted-foreground">
                        {h.toString().padStart(2, "0")}:00
                      </div>
                      {DAYS.map((d) => (
                        <div
                          key={d}
                          className="relative flex-1 border-r border-border/60 last:border-r-0"
                        />
                      ))}
                    </div>
                  ))}

                  <div className="pointer-events-none absolute bottom-0 left-20 right-0 top-0">
                    <div className="flex h-full w-full">
                      {DAYS.map((d, index) => (
                        <div key={d} className="pointer-events-auto relative h-full flex-1">
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
      </StaggerItem>
    </StaggerContainer>
  )
}

export default function FindSessionsClassPage() {
  return (
    <RequireRole mode="staff">
      <FindSessionsClassContent />
    </RequireRole>
  )
}
