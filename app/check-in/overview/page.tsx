"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Check, X, RotateCcw, Loader2 } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { EDUCATION_LEVELS, type EducationLevel, type Student, type CheckIn, type Class, type ClassStudent } from "@/lib/types"

interface StudentRow {
  studentId: number
  studentName: string
  checkIn: CheckIn | null
}

function RowSkeleton() {
  return (
    <tr className="border-b last:border-b-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-5 w-full animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  )
}

export default function CheckInOverviewPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const [students, setStudents] = React.useState<Student[] | null>(null)
  const [checkIns, setCheckIns] = React.useState<CheckIn[]>([])
  const [classes, setClasses] = React.useState<Class[]>([])
  const [classStudents, setClassStudents] = React.useState<ClassStudent[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Build map: student_id → student name
  const studentNameMap = React.useMemo(() => {
    const map = new Map<number, string>()
    if (students) {
      for (const s of students) map.set(s.id, s.name)
    }
    return map
  }, [students])

  // Build map: student_id → latest check-in
  const latestCheckInMap = React.useMemo(() => {
    const map = new Map<number, CheckIn>()
    for (const ci of checkIns) {
      const existing = map.get(ci.student)
      if (!existing || new Date(ci.timestamp) > new Date(existing.timestamp)) {
        map.set(ci.student, ci)
      }
    }
    return map
  }, [checkIns])

  // Build map: class_id → education_level
  const classCohortMap = React.useMemo(() => {
    const map = new Map<number, EducationLevel>()
    for (const c of classes) map.set(c.id, c.education_level)
    return map
  }, [classes])

  // Group class-student entries by cohort (driven by class-student table)
  const grouped = React.useMemo(() => {
    if (!students) return null
    const groups = new Map<EducationLevel, StudentRow[]>()
    for (const cs of classStudents) {
      const level = classCohortMap.get(cs.class_obj)
      if (!level) continue
      const name = studentNameMap.get(cs.student)
      if (!name) continue // student fetched but no name? skip
      const checkIn = latestCheckInMap.get(cs.student) ?? null
      if (!groups.has(level)) groups.set(level, [])
      groups.get(level)!.push({ studentId: cs.student, studentName: name, checkIn })
    }
    return groups
  }, [students, classStudents, classCohortMap, studentNameMap, latestCheckInMap])

  const loadData = React.useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const [studs, cis, cls, css] = await Promise.all([
        api.listStudents(),
        api.listCheckIns(),
        api.listClasses(),
        api.listClassStudents(),
      ])
      setStudents(studs)
      setCheckIns(cis)
      setClasses(cls)
      setClassStudents(css)
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn])

  // Auth gates
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="mb-6 h-4 w-80 animate-pulse rounded bg-muted" />
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
        <p className="text-muted-foreground">Please sign in to view check-in overview.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Check-In Overview</h1>
        <p className="mt-1 text-muted-foreground">
          View all students and their check-in status, grouped by cohort.
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={loadData}
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
        {grouped !== null && !loading && (
          <span className="text-xs text-muted-foreground">
            {Array.from(grouped.values()).reduce((sum, rows) => sum + rows.length, 0)} students across {grouped.size} cohorts
          </span>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 hover:opacity-70">
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>
      )}

      {/* Cohort groups */}
      {loading && !students
        ? (
          <div className="space-y-8">
            {[1, 2, 3].map((g) => (
              <div key={g}>
                <div className="mb-3 h-6 w-32 animate-pulse rounded bg-muted" />
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium">ID</th>
                        <th className="px-4 py-3 text-left font-medium">Name</th>
                        <th className="px-4 py-3 text-left font-medium">Check-In Time</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium">Checked By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )
        : grouped === null
          ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed py-16">
              <p className="text-sm text-muted-foreground">Click &quot;Load Data&quot; to view check-in status.</p>
            </div>
          )
          : grouped.size === 0
            ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed py-16">
                <p className="text-sm text-muted-foreground">No students found in any cohort.</p>
              </div>
            )
            : (
              <div className="space-y-8">
                {EDUCATION_LEVELS.map(({ value: level, label }) => {
                  const rows = grouped.get(level)
                  if (!rows || rows.length === 0) return null

                  const checkedIn = rows.filter((r) => r.checkIn !== null).length

                  return (
                    <section key={level}>
                      <div className="mb-3 flex items-baseline gap-3">
                        <h2 className="text-xl font-semibold tracking-tight">{label}</h2>
                        <span className="text-xs text-muted-foreground">
                          {checkedIn}/{rows.length} checked in
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="px-4 py-3 text-left font-medium">Student ID</th>
                              <th className="px-4 py-3 text-left font-medium">Name</th>
                              <th className="px-4 py-3 text-left font-medium">Check-In Time</th>
                              <th className="px-4 py-3 text-left font-medium">Status</th>
                              <th className="px-4 py-3 text-left font-medium">Checked By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map(({ studentId, studentName, checkIn }) => (
                              <tr
                                key={studentId}
                                className="border-b last:border-b-0 transition-colors hover:bg-muted/30"
                              >
                                <td className="px-4 py-3 font-mono text-xs">{studentId}</td>
                                <td className="px-4 py-3 font-medium">{studentName}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {checkIn
                                    ? new Date(checkIn.timestamp).toLocaleTimeString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                        hour12: false,
                                      })
                                    : <span className="text-muted-foreground">—</span>}
                                </td>
                                <td className="px-4 py-3">
                                  {checkIn
                                    ? <Check className="size-5 text-green-600 dark:text-green-400" />
                                    : <X className="size-5 text-muted-foreground/50" />}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {checkIn?.checked_by ?? "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )
                })}
              </div>
            )}
    </div>
  )
}
