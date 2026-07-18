"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Check, X, RotateCcw, Loader2, Search } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { EDUCATION_LEVELS, type Student, type CheckIn, type Class, type ClassStudent } from "@/lib/types"

interface StudentRow {
  studentId: number
  studentName: string
  checkIn: CheckIn | null
}

function RowSkeleton() {
  return (
    <tr className="border-b last:border-b-0">
      {Array.from({ length: 4 }).map((_, i) => (
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
  const [searchQuery, setSearchQuery] = React.useState("")
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)

  // Build map: student_id → student name
  const studentNameMap = React.useMemo(() => {
    const map = new Map<number, string>()
    if (students) {
      for (const s of students) map.set(s.id, s.name)
    }
    return map
  }, [students])


  // Build map: student_id → check-in for TODAY
  const todayCheckInMap = React.useMemo(() => {
    const map = new Map<number, CheckIn>()
    
    // Get local today's date string YYYY-MM-DD
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`
    
    for (const ci of checkIns) {
      if (ci.date === todayStr) {
        const existing = map.get(ci.student)
        if (!existing || new Date(ci.timestamp) > new Date(existing.timestamp)) {
          map.set(ci.student, ci)
        }
      }
    }
    return map
  }, [checkIns])

  // Group class-student entries by dynamic class cohort, sorted
  const sortedGroupedClasses = React.useMemo(() => {
    if (!students || classes.length === 0) return []

    const classMap = new Map<number, Class>()
    for (const c of classes) classMap.set(c.id, c)

    // Build the groups: classId -> array of StudentRow
    const groups = new Map<number, StudentRow[]>()
    for (const cs of classStudents) {
      const cls = typeof cs.class_obj === "object" && cs.class_obj !== null ? cs.class_obj : classMap.get(cs.class_obj)
      if (!cls) continue

      const studentId = typeof cs.student === "object" && cs.student !== null ? cs.student.id : cs.student
      const name = typeof cs.student === "object" && cs.student !== null ? cs.student.name : studentNameMap.get(studentId)
      if (!name) continue

      // Filter by search query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim()
        const matchesName = name.toLowerCase().includes(query)
        const matchesId = String(studentId).includes(query)
        if (!matchesName && !matchesId) continue
      }

      const checkIn = todayCheckInMap.get(studentId) ?? null
      
      if (!groups.has(cls.id)) {
        groups.set(cls.id, [])
      }
      groups.get(cls.id)!.push({ studentId, studentName: name, checkIn })
    }

    // Convert to array of { classObj, label, rows }
    const result: { classObj: Class; label: string; rows: StudentRow[] }[] = []
    for (const [classId, rows] of groups.entries()) {
      let cls = classMap.get(classId)
      if (!cls) {
        const found = classStudents.find(
          (cs) => typeof cs.class_obj === "object" && cs.class_obj !== null && cs.class_obj.id === classId
        )
        if (found && typeof found.class_obj === "object") {
          cls = found.class_obj
        }
      }
      if (!cls) continue

      const foundLevel = EDUCATION_LEVELS.find((el) => el.value === cls.education_level)
      const baseLabel = foundLevel ? foundLevel.label : cls.education_level
      const label = `${baseLabel} ${cls.cohort_identifier}`.trim()
      result.push({ classObj: cls, label, rows })
    }

    // Sort the result by position of education_level in EDUCATION_LEVELS, then alphabetical identifier
    const levelOrder = EDUCATION_LEVELS.map((el) => el.value)
    result.sort((a, b) => {
      const idxA = levelOrder.indexOf(a.classObj.education_level)
      const idxB = levelOrder.indexOf(b.classObj.education_level)
      if (idxA !== idxB) {
        const orderA = idxA === -1 ? 999 : idxA
        const orderB = idxB === -1 ? 999 : idxB
        return orderA - orderB
      }
      return a.classObj.cohort_identifier.localeCompare(b.classObj.cohort_identifier)
    })

    return result
  }, [students, classes, classStudents, studentNameMap, todayCheckInMap, searchQuery])

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
      setLastLoaded(new Date().toLocaleTimeString())
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Left side actions (Buttons + Search) */}
        <div className="flex flex-wrap items-center gap-3">
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

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-64 rounded-lg border bg-background pl-9 pr-4 text-sm outline-none ring-offset-background transition-colors focus:border-ring"
            />
          </div>
        </div>

        {/* Right side info (Timestamp/Status) */}
        {lastLoaded && (
          <span className="text-xs text-muted-foreground">
            {sortedGroupedClasses.reduce((sum, g) => sum + g.rows.length, 0)} students across {sortedGroupedClasses.length} cohorts &bull; Loaded {lastLoaded}
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
        : students === null
          ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed py-16">
              <p className="text-sm text-muted-foreground">Click &quot;Load Data&quot; to view check-in status.</p>
            </div>
          )
          : sortedGroupedClasses.length === 0
            ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed py-16">
                <p className="text-sm text-muted-foreground">No students found in any cohort classes.</p>
              </div>
            )
            : (
              <div className="space-y-8">
                {sortedGroupedClasses.map(({ classObj, label, rows }) => {
                  const checkedIn = rows.filter((r) => r.checkIn !== null).length

                  return (
                    <section key={classObj.id}>
                      <div className="mb-3 flex items-baseline gap-3">
                        <h2 className="text-xl font-semibold tracking-tight">{label}</h2>
                        {classObj.cohort_sub_category && (
                          <span className="text-xs font-normal text-muted-foreground">
                            ({classObj.cohort_sub_category})
                          </span>
                        )}
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
                                  {checkIn ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20">
                                      <Check className="size-3.5" />
                                      Checked In
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400 dark:ring-gray-400/20">
                                      <X className="size-3.5" />
                                      Absent
                                    </span>
                                  )}
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
