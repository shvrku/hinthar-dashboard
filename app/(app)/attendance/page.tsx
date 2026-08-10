"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { CalendarCheck, GraduationCap, Loader2, ArrowRight, BookOpen } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { Class } from "@/lib/types"
import { formatClassLabel } from "@/lib/format-class"
import { RequireRole } from "@/components/require-role"
import { StandardPageHeader } from "@/components/standard-page-header"
import { SearchableSelect } from "@/components/searchable-select"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"

const LAST_CLASS_KEY = "hinthar.attendance.lastClassId"

function AttendanceLandingContent() {
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [classes, setClasses] = React.useState<Class[]>([])
  const [selectedClassId, setSelectedClassId] = React.useState<string>("")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const now = new Date()
  const [month] = React.useState(now.getMonth() + 1)
  const [year] = React.useState(now.getFullYear())

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const token = await getToken()
        if (!token) throw new Error("No auth token")
        const data = await createApi(token).listClasses({ summary: "true" })
        if (cancelled) return
        setClasses(data || [])
        const saved =
          typeof window !== "undefined" ? localStorage.getItem(LAST_CLASS_KEY) : null
        if (saved && data?.some((c) => c.id.toString() === saved)) {
          setSelectedClassId(saved)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.userMessage : "Failed to load classes")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, getToken])

  const classItems = React.useMemo(
    () =>
      classes.map((c) => ({
        value: c.id.toString(),
        label: formatClassLabel(c),
      })),
    [classes]
  )

  const openClassAttendance = () => {
    if (!selectedClassId) return
    localStorage.setItem(LAST_CLASS_KEY, selectedClassId)
    router.push(`/attendance/class/${selectedClassId}/?month=${month}&year=${year}&layout=matrix`)
  }

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <StandardPageHeader
          title="Session Attendance"
          description="Choose a class to open the monthly matrix or roster. Tutoring (ad-hoc) sessions have a separate entry."
        />
      </StaggerItem>

      {error ? (
        <StaggerItem className="mx-auto w-full max-w-2xl">
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        </StaggerItem>
      ) : null}

      <StaggerItem className="mx-auto w-full max-w-2xl">
        <Card className="p-6 space-y-5 border-border/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
              <GraduationCap className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Class lessons</h2>
              <p className="text-xs text-muted-foreground">
                Timetabled sessions for one cohort — matrix and per-session roster.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="size-4 animate-spin" />
              Loading classes…
            </div>
          ) : (
            <>
              <SearchableSelect
                options={classItems}
                value={selectedClassId}
                onValueChange={(val) => setSelectedClassId(val)}
                placeholder="Select a class…"
                searchPlaceholder="Search classes…"
              />
              <Button
                className="w-full gap-2"
                disabled={!selectedClassId}
                onClick={openClassAttendance}
              >
                Open class attendance
                <ArrowRight className="size-4" />
              </Button>
            </>
          )}
        </Card>
      </StaggerItem>

      <StaggerItem className="mx-auto w-full max-w-2xl">
        <Card className="p-6 space-y-4 border-border/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
              <BookOpen className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Ad-hoc / tutoring</h2>
              <p className="text-xs text-muted-foreground">
                One-off sessions not tied to a class timetable.
              </p>
            </div>
          </div>
          <Button variant="outline" className="w-full gap-2" render={<Link href="/attendance/adhoc/" />}>
            <CalendarCheck className="size-4" />
            Open ad-hoc attendance
          </Button>
        </Card>
      </StaggerItem>
    </StaggerContainer>
  )
}

export default function AttendanceLandingPage() {
  return (
    <RequireRole mode="staff">
      <AttendanceLandingContent />
    </RequireRole>
  )
}
