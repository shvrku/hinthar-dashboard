"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { ArrowRight, CalendarDays, GraduationCap, Loader2 } from "lucide-react"
import { ApiError, createApi } from "@/lib/api"
import type { Class } from "@/lib/types"
import { formatClassLabel } from "@/lib/format-class"
import { RequireRole } from "@/components/require-role"
import { StandardPageHeader } from "@/components/standard-page-header"
import { SearchableSelect } from "@/components/searchable-select"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"

const LAST_CLASS_KEY = "hinthar.timetable.lastClassId"

function TimetableLandingContent() {
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [classes, setClasses] = React.useState<Class[]>([])
  const [selectedClassId, setSelectedClassId] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

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

  const openClassTimetable = () => {
    if (!selectedClassId) return
    localStorage.setItem(LAST_CLASS_KEY, selectedClassId)
    router.push(`/timetable/${selectedClassId}/`)
  }

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <StandardPageHeader
          title="Timetable"
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
        <Card className="space-y-5 border-border/80 p-6 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
              <GraduationCap className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Class timetable</h2>
              <p className="text-xs text-muted-foreground">
                Week and list views for one cohort — same entry pattern as Session Attendance.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading classes…
            </div>
          ) : classes.length === 0 ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>No classes yet. Create a cohort before building a timetable.</p>
              <Button variant="outline" render={<Link href="/classes/" />}>
                Go to Classes
              </Button>
            </div>
          ) : (
            <>
              <SearchableSelect
                options={classItems}
                value={selectedClassId}
                onValueChange={setSelectedClassId}
                placeholder="Select a class…"
                searchPlaceholder="Search classes…"
              />
              <Button className="w-full gap-2" disabled={!selectedClassId} onClick={openClassTimetable}>
                <CalendarDays className="size-4" />
                Open class timetable
                <ArrowRight className="size-4" />
              </Button>
            </>
          )}
        </Card>
      </StaggerItem>
    </StaggerContainer>
  )
}

export default function TimetableLandingPage() {
  return (
    <RequireRole mode="staff">
      <TimetableLandingContent />
    </RequireRole>
  )
}
