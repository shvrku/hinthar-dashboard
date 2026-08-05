"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { motion, AnimatePresence } from "motion/react"
import { Check, X, RotateCcw, Loader2, Search, QrCode } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { toLocalDateString } from "@/lib/utils"
import { EDUCATION_LEVELS, type Student, type CheckIn, type Class, type ClassStudent } from "@/lib/types"
import { useSortableData } from "@/lib/use-sortable-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StandardPageHeader } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
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
  studentCode?: string
  studentName: string
  checkIn: CheckIn | null
}

function RowSkeleton() {
  return (
    <TableRow>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  )
}

function CohortTable({ rows }: { rows: StudentRow[] }) {
  const { items: sortedRows, requestSort, sortConfig } = useSortableData(rows, "studentId", "asc")

  return (
    <Card className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeadSortable
              className="w-[140px]"
              sortKey="studentCode"
              currentSortKey={sortConfig.key}
              currentSortOrder={sortConfig.order}
              onSort={requestSort}
            >
              Student Code
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
          {sortedRows.map(({ studentId, studentCode, studentName, checkIn }) => (
            <TableRow key={studentId} className="transition-colors hover:bg-muted/60">
              <TableCell className="font-semibold text-foreground">{studentCode || `#${studentId}`}</TableCell>
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
    </Card>
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
      for (const s of students) map.set(Number(s.id), s.name)
    }
    return map
  }, [students])

  const studentCodeMap = React.useMemo(() => {
    const map = new Map<number, string>()
    if (students) {
      for (const s of students) {
        if (s.unique_code) map.set(Number(s.id), s.unique_code)
      }
    }
    return map
  }, [students])

  const todayCheckInMap = React.useMemo(() => {
    const map = new Map<number, CheckIn>()
    const todayStr = toLocalDateString()

    for (const ci of checkIns) {
      let ciDateStr = ci.date
      if (ci.timestamp) {
        const tDate = new Date(ci.timestamp)
        if (!isNaN(tDate.getTime())) {
          ciDateStr = toLocalDateString(tDate)
        }
      }

      if (ciDateStr === todayStr) {
        const sObj = ci.student as unknown
        const studentId = typeof sObj === "object" && sObj !== null
          ? Number((sObj as { id: number }).id)
          : Number(sObj)
        
        if (!isNaN(studentId) && studentId > 0) {
          const existing = map.get(studentId)
          if (!existing || new Date(ci.timestamp) > new Date(existing.timestamp)) {
            map.set(studentId, ci)
          }
        }
      }
    }
    return map
  }, [checkIns])

  const sortedGroupedClasses = React.useMemo(() => {
    if (!students || classes.length === 0) return []

    const classMap = new Map<number, Class>()
    for (const c of classes) classMap.set(Number(c.id), c)

    const groups = new Map<number, StudentRow[]>()
    for (const cs of classStudents) {
      const classId = typeof cs.class_obj === "object" && cs.class_obj !== null ? Number(cs.class_obj.id) : Number(cs.class_obj)
      const cls = typeof cs.class_obj === "object" && cs.class_obj !== null ? cs.class_obj : classMap.get(classId)
      if (!cls) continue

      const studentId = typeof cs.student === "object" && cs.student !== null ? Number(cs.student.id) : Number(cs.student)
      const name = typeof cs.student === "object" && cs.student !== null ? cs.student.name : studentNameMap.get(studentId)
      if (!name) continue

      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim()
        const matchesName = name.toLowerCase().includes(query)
        const matchesId = String(studentId).includes(query)
        const studentCode = studentCodeMap.get(studentId)
        let matchesCode = false
        if (studentCode) {
          const codeLower = studentCode.toLowerCase()
          if (codeLower.includes(query)) {
            matchesCode = true
          } else {
            const codeParts = codeLower.split("-")
            const queryParts = query.split("-")
            if (codeParts.length === 2 && queryParts.length === 2) {
              const [codePrefix, codeNumStr] = codeParts
              const [queryPrefix, queryNumStr] = queryParts
              if (codePrefix.includes(queryPrefix) || queryPrefix.includes(codePrefix)) {
                const codeNum = parseInt(codeNumStr, 10)
                const queryNum = parseInt(queryNumStr, 10)
                if (!isNaN(codeNum) && !isNaN(queryNum) && codeNum === queryNum) {
                  matchesCode = true
                }
              }
            }
          }
        }
        const matchesClass =
          cls.education_level.toLowerCase().includes(query) ||
          cls.cohort_identifier.toLowerCase().includes(query) ||
          (cls.cohort_sub_category && cls.cohort_sub_category.toLowerCase().includes(query)) ||
          `${cls.education_level} ${cls.cohort_identifier}`.toLowerCase().includes(query)

        if (!matchesName && !matchesId && !matchesCode && !matchesClass) continue
      }

      const checkIn = todayCheckInMap.get(studentId) ?? null
      
      if (!groups.has(cls.id)) {
        groups.set(cls.id, [])
      }
      groups.get(cls.id)!.push({ studentId, studentCode: studentCodeMap.get(studentId), studentName: name, checkIn })
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
      const todayStr = toLocalDateString()
      const [studs, cis, cls, css] = await Promise.all([
        api.listStudents(),
        api.listCheckIns({ date: todayStr }),
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

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadData()
    }
  }, [isLoaded, isSignedIn, loadData])

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-7xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
        <div className="space-y-4 pt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
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
    <StaggerContainer className="space-y-6">
      {/* Standardized Header */}
      <StaggerItem>
        <StandardPageHeader
          title="Check-In Overview"
          description="View all students and their check-in status, grouped by cohort class."
          secondaryAction={{
            label: loading ? "Loading..." : "Load Data",
            onClick: loadData,
            icon: loading ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />,
          }}
        />
      </StaggerItem>

      {/* Metric Highlights Strip */}
      <StaggerItem>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Checked In Today</p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Check className="size-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">{todayCheckInMap.size}</h2>
              {students && (
                <span className="text-xs text-muted-foreground">
                  of {students.length} students
                </span>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Absent Today</p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <X className="size-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                {students ? Math.max(0, students.length - todayCheckInMap.size) : 0}
              </h2>
              {students && students.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {(((students.length - todayCheckInMap.size) / students.length) * 100).toFixed(0)}% absent
                </span>
              )}
            </div>
          </Card>
        </div>
      </StaggerItem>

      {/* Management Toolbar Card */}
      <StaggerItem>
        <Card className="p-4 shadow-2xs border-border/80 bg-card">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search students, classes, cohorts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {lastLoaded && (
              <div className="flex items-center gap-2 shrink-0">
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
        </Card>
      </StaggerItem>

      {/* Banners */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <span>{error}</span>
            <Button size="xs" variant="ghost" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cohort groups */}
      {loading && !students ? (
        <div key="loading-skeleton" className="space-y-8">
          {[1, 2, 3].map((g) => (
            <div key={g} className="space-y-3">
              <Skeleton className="h-6 w-32" />
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
        <StaggerItem key="unloaded-state">
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
            <QrCode className="mb-3 size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Click &quot;Load Data&quot; to view check-in status.</p>
          </div>
        </StaggerItem>
      ) : sortedGroupedClasses.length === 0 ? (
        <StaggerItem key="empty-state">
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground">No students found in any cohort classes.</p>
          </div>
        </StaggerItem>
      ) : (
        <StaggerContainer key="loaded-cohorts" className="space-y-8">
          {sortedGroupedClasses.map(({ classObj, label, rows }) => {
            const checkedIn = rows.filter((r) => r.checkIn !== null).length

            return (
              <StaggerItem key={classObj.id} className="space-y-3">
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
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      )}
    </StaggerContainer>
  )
}
