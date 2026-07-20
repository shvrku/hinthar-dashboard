"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Check, X, RotateCcw, Loader2, Search, QrCode } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { EDUCATION_LEVELS, type Student, type CheckIn, type Class, type ClassStudent } from "@/lib/types"
import { useSortableData } from "@/lib/use-sortable-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableHeadSortable,
  TableCell,
} from "@/components/ui/table"

interface StudentRow {
  studentId: number
  studentName: string
  checkIn: CheckIn | null
}

function RowSkeleton() {
  return (
    <TableRow>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  )
}

function CohortTable({ rows }: { rows: StudentRow[] }) {
  const { items: sortedRows, requestSort, sortConfig } = useSortableData(rows, "studentId", "asc")

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHeadSortable
            className="w-[120px]"
            sortKey="studentId"
            currentSortKey={sortConfig.key}
            currentSortOrder={sortConfig.order}
            onSort={requestSort}
          >
            Student ID
          </TableHeadSortable>

          <TableHeadSortable
            sortKey="studentName"
            currentSortKey={sortConfig.key}
            currentSortOrder={sortConfig.order}
            onSort={requestSort}
          >
            Name
          </TableHeadSortable>

          <TableHeadSortable
            sortKey="checkIn.timestamp"
            currentSortKey={sortConfig.key}
            currentSortOrder={sortConfig.order}
            onSort={requestSort}
          >
            Check-In Time
          </TableHeadSortable>

          <TableHeadSortable
            sortKey="checkIn"
            currentSortKey={sortConfig.key}
            currentSortOrder={sortConfig.order}
            onSort={requestSort}
          >
            Status
          </TableHeadSortable>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedRows.map(({ studentId, studentName, checkIn }) => (
          <TableRow key={studentId}>
            <TableCell className="font-semibold text-foreground">{studentId}</TableCell>
            <TableCell className="font-medium">{studentName}</TableCell>
            <TableCell className="text-muted-foreground whitespace-nowrap">
              {checkIn
                ? new Date(checkIn.timestamp).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  })
                : "—"}
            </TableCell>
            <TableCell>
              {checkIn ? (
                <Badge variant="success" className="gap-1">
                  <Check className="size-3.5" />
                  Checked In
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <X className="size-3.5" />
                  Absent
                </Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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

  const studentNameMap = React.useMemo(() => {
    const map = new Map<number, string>()
    if (students) {
      for (const s of students) map.set(s.id, s.name)
    }
    return map
  }, [students])

  const todayCheckInMap = React.useMemo(() => {
    const map = new Map<number, CheckIn>()
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

  const sortedGroupedClasses = React.useMemo(() => {
    if (!students || classes.length === 0) return []

    const classMap = new Map<number, Class>()
    for (const c of classes) classMap.set(c.id, c)

    const groups = new Map<number, StudentRow[]>()
    for (const cs of classStudents) {
      const cls = typeof cs.class_obj === "object" && cs.class_obj !== null ? cs.class_obj : classMap.get(cs.class_obj)
      if (!cls) continue

      const studentId = typeof cs.student === "object" && cs.student !== null ? cs.student.id : cs.student
      const name = typeof cs.student === "object" && cs.student !== null ? cs.student.name : studentNameMap.get(studentId)
      if (!name) continue

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

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 h-8 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="mb-6 h-4 w-80 animate-pulse rounded-lg bg-muted" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground font-medium">Please sign in to view check-in overview.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Check-In Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View all students and their check-in status, grouped by cohort class.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={loadData} disabled={loading} variant="default" className="shadow-xs">
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 size-4" />
                Load Data
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search students in overview..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {lastLoaded && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 text-xs">
              <QrCode className="mr-1.5 size-3.5" />
              {sortedGroupedClasses.reduce((sum, g) => sum + g.rows.length, 0)} students across {sortedGroupedClasses.length} cohorts
            </Badge>
            <span className="text-xs text-muted-foreground">
              Loaded {lastLoaded}
            </span>
          </div>
        )}
      </div>

      {/* Banners */}
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button size="xs" variant="ghost" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Cohort groups */}
      {loading && !students ? (
        <div className="space-y-8">
          {[1, 2, 3].map((g) => (
            <div key={g} className="space-y-3">
              <div className="h-6 w-32 animate-pulse rounded bg-muted" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Check-In Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      ) : students === null ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
          <QrCode className="mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Click &quot;Load Data&quot; to view check-in status.</p>
        </div>
      ) : sortedGroupedClasses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">No students found in any cohort classes.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedGroupedClasses.map(({ classObj, label, rows }) => {
            const checkedIn = rows.filter((r) => r.checkIn !== null).length

            return (
              <section key={classObj.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold tracking-tight">{label}</h2>
                    {classObj.cohort_sub_category && (
                      <span className="text-xs text-muted-foreground">
                        ({classObj.cohort_sub_category})
                      </span>
                    )}
                  </div>
                  <Badge variant={checkedIn > 0 ? "success" : "secondary"}>
                    {checkedIn}/{rows.length} checked in
                  </Badge>
                </div>

                <CohortTable rows={rows} />
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
