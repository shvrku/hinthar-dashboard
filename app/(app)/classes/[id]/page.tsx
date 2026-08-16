"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { ArrowLeft, CalendarDays, GraduationCap, Loader2, Pencil, Plus, Trash2, Users } from "lucide-react"
import { ApiError, createApi } from "@/lib/api"
import {
  formatClassLabel,
  COHORT_IDENTIFIER_MAX_LENGTH,
  COHORT_SUB_CATEGORY_MAX_LENGTH,
  COHORT_IDENTIFIER_PLACEHOLDER,
  COHORT_SUB_CATEGORY_PLACEHOLDER,
  COHORT_IDENTIFIER_HINT,
  COHORT_SUB_CATEGORY_HINT,
  sanitizeCohortIdentifierInput,
  sanitizeCohortSubCategoryInput,
} from "@/lib/format-class"
import { formatBackendDate, cn } from "@/lib/utils"
import type { AnalyticsRange, Class, ClassAttendanceSummary, ClassPayload, ClassStudent, Student, TimetableSlot } from "@/lib/types"
import { RequireRole } from "@/components/require-role"
import { SearchableSelect } from "@/components/searchable-select"
import { TimetableWeekSnippet } from "@/components/timetable-week-snippet"
import {
  AttendanceOverviewSkeleton,
  CLASS_DETAIL_PAGE_LAYOUT,
  PageSkeleton,
} from "@/components/page-skeletons"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { ChartChunkSkeleton } from "@/components/charts/chart-chunk-skeleton"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EDUCATION_LEVELS } from "@/lib/types"

const ClassCampusChart = dynamic(
  () => import("@/components/charts/class-attendance-charts").then((m) => m.ClassCampusChart),
  { ssr: false, loading: () => <ChartChunkSkeleton className="h-52" /> }
)
const ClassLessonCharts = dynamic(
  () => import("@/components/charts/class-attendance-charts").then((m) => m.ClassLessonCharts),
  { ssr: false, loading: () => <ChartChunkSkeleton className="h-52" /> }
)

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
]
const STATUS_LABELS: Record<string, string> = { present: "Present", late: "Late", absent: "Absent", excused: "Excused" }

function formatPercent(value: number | null | undefined) {
  return value == null ? "—" : `${Math.round(value * 100)}%`
}

function ClassDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const classId = Number(params.id)
  const [classItem, setClassItem] = React.useState<Class | null>(null)
  const [roster, setRoster] = React.useState<ClassStudent[]>([])
  const [students, setStudents] = React.useState<Student[]>([])
  const [slots, setSlots] = React.useState<TimetableSlot[]>([])
  const [summary, setSummary] = React.useState<ClassAttendanceSummary | null>(null)
  const [range, setRange] = React.useState<AnalyticsRange>("month")
  const [loading, setLoading] = React.useState(true)
  const [summaryLoading, setSummaryLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [educationLevel, setEducationLevel] = React.useState<ClassPayload["education_level"]>("IAL")
  const [cohort, setCohort] = React.useState("")
  const [subcategory, setSubcategory] = React.useState("")
  const [studentId, setStudentId] = React.useState("")
  const [enrolling, setEnrolling] = React.useState(false)
  const [removingId, setRemovingId] = React.useState<number | null>(null)

  const loadCore = React.useCallback(async () => {
    if (!isSignedIn || !Number.isFinite(classId)) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const [foundClass, rosterPage, studentPage, timetable] = await Promise.all([
        api.getClass(classId),
        api.listClassStudentsPage({ class_id: classId, page_size: 200 }),
        api.listStudentsPage({ page_size: 200 }),
        api.listTimetableSlots({ class_id: classId }),
      ])
      setClassItem(foundClass)
      setRoster(rosterPage.results)
      setStudents(studentPage.results)
      setSlots(timetable)
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : err instanceof Error ? err.message : "Failed to load class")
    } finally {
      setLoading(false)
    }
  }, [classId, getToken, isSignedIn])

  const loadSummary = React.useCallback(async () => {
    if (!isSignedIn || !Number.isFinite(classId)) return
    setSummaryLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      setSummary(await createApi(token).getClassAttendanceSummary(classId, range))
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : err instanceof Error ? err.message : "Failed to load attendance")
    } finally {
      setSummaryLoading(false)
    }
  }, [classId, getToken, isSignedIn, range])

  React.useEffect(() => {
    if (!(isLoaded && isSignedIn)) return
    const timer = window.setTimeout(() => void loadCore(), 0)
    return () => window.clearTimeout(timer)
  }, [isLoaded, isSignedIn, loadCore])
  React.useEffect(() => {
    if (!(isLoaded && isSignedIn && classItem)) return
    const timer = window.setTimeout(() => void loadSummary(), 0)
    return () => window.clearTimeout(timer)
  }, [isLoaded, isSignedIn, classItem, loadSummary])

  const rosterStudents = React.useMemo(() => roster.map((entry) => {
    const student = typeof entry.student === "object" ? entry.student as Student : students.find((item) => item.id === entry.student_id || item.id === entry.student)
    return { entry, student }
  }), [roster, students])
  const enrolledIds = React.useMemo(() => new Set(rosterStudents.map(({ student }) => student?.id)), [rosterStudents])
  const studentOptions = React.useMemo(() => students.filter((student) => !enrolledIds.has(student.id)).map((student) => ({
    value: String(student.id), label: student.name, subLabel: student.unique_code,
  })), [enrolledIds, students])
  const campusData = React.useMemo(() => summary?.campus.daily.map((day) => ({
    date: formatBackendDate(day.date),
    checked_in: day.checked_in,
  })) ?? [], [summary])
  const statusData = React.useMemo(() => summary?.lesson.by_status.filter((item) => item.count > 0).map((item) => ({
    ...item, name: STATUS_LABELS[item.status] ?? item.status,
  })) ?? [], [summary])
  const subjectData = React.useMemo(() => summary?.lesson.by_subject.map((item) => ({
    name: item.subject_label, present: item.present, late: item.late, absent: item.absent, excused: item.excused,
  })) ?? [], [summary])

  const openEdit = () => {
    if (!classItem) return
    setEducationLevel(classItem.education_level)
    setCohort(classItem.cohort_identifier)
    setSubcategory(classItem.cohort_sub_category ?? "")
    setEditOpen(true)
  }
  const saveClass = async () => {
    if (!classItem || !cohort.trim()) return
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      setClassItem(await createApi(token).updateClass(classItem.id, { education_level: educationLevel, cohort_identifier: cohort.trim(), cohort_sub_category: subcategory.trim() || null }))
      setEditOpen(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : "Failed to update class")
    } finally { setSaving(false) }
  }
  const enroll = async () => {
    if (!studentId || !classItem) return
    setEnrolling(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const enrollment = await createApi(token).createClassStudent(classItem.id, Number(studentId))
      setRoster((items) => [...items, enrollment])
      setStudentId("")
    } catch (err) { setError(err instanceof ApiError ? err.userMessage : "Failed to enroll student") } finally { setEnrolling(false) }
  }
  const remove = async (id: number) => {
    setRemovingId(id)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      await createApi(token).deleteClassStudent(id)
      setRoster((items) => items.filter((item) => item.id !== id))
    } catch (err) { setError(err instanceof ApiError ? err.userMessage : "Failed to remove student") } finally { setRemovingId(null) }
  }

  if (!isLoaded) return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>
  if (!isSignedIn) return <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Please sign in to view this class.</div>
  if (!Number.isFinite(classId)) return <div className="container mx-auto py-16 text-center text-muted-foreground">Invalid class id.</div>

  return <StaggerContainer className="container mx-auto max-w-6xl px-4 space-y-6">
    <StaggerItem>
      <Link href="/classes/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 h-8 w-fit gap-1.5 px-2 text-muted-foreground hover:text-foreground")}><ArrowLeft className="size-3.5" />Back to Classes</Link>
    </StaggerItem>
    {error && <StaggerItem><div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div></StaggerItem>}
    {loading ? <PageSkeleton blocks={CLASS_DETAIL_PAGE_LAYOUT} /> : !classItem ? <Empty className="border"><EmptyHeader><EmptyMedia variant="icon"><GraduationCap /></EmptyMedia><EmptyTitle>Class not found</EmptyTitle><EmptyDescription>This class may have been removed.</EmptyDescription></EmptyHeader><Button variant="outline" onClick={() => router.push("/classes/")}>Back to Classes</Button></Empty> : <>
      <Card className="border-border/80"><CardContent className="p-6 md:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="space-y-3"><Badge variant="secondary">{classItem.education_level}</Badge><h1 className="text-2xl font-bold tracking-tight">{formatClassLabel(classItem)}</h1><dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Identifier (letter)</dt><dd className="font-medium">{classItem.cohort_identifier}</dd></div><div><dt className="text-muted-foreground">Sub-category</dt><dd className="font-medium">{classItem.cohort_sub_category ?? "—"}</dd></div></dl></div><Button variant="outline" size="sm" onClick={openEdit}><Pencil data-icon="inline-start" />Edit class</Button></div></CardContent></Card>

      <div className="grid gap-6">
        <Card><CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-lg"><CalendarDays />Weekly timetable</CardTitle><CardDescription>Snippet of this class week — open the full editor to add or change slots.</CardDescription></div></CardHeader><CardContent><TimetableWeekSnippet slots={slots} classId={classItem.id} /></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Users />Roster <Badge variant="secondary">{roster.length}</Badge></CardTitle><CardDescription>Enroll and manage students in this cohort.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">
          {rosterStudents.length ? <div className="divide-y rounded-xl border">{rosterStudents.map(({ entry, student }) => <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3"><Link href={student ? `/students/${student.id}/` : "/students/"} className="min-w-0 hover:text-primary"><p className="truncate font-medium">{student?.name ?? `Student #${entry.student_id ?? "?"}`}</p><p className="text-xs text-muted-foreground">{student?.unique_code}</p></Link><Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" disabled={removingId === entry.id} onClick={() => void remove(entry.id)} aria-label="Unenroll student">{removingId === entry.id ? <Loader2 className="animate-spin" /> : <Trash2 />}</Button></div>)}</div> : <p className="text-sm text-muted-foreground">No students enrolled yet.</p>}
          <div className="flex flex-col gap-2 sm:flex-row"><SearchableSelect className="flex-1" options={studentOptions} value={studentId} onValueChange={setStudentId} placeholder="Select a student…" searchPlaceholder="Search students…" /><Button disabled={!studentId || enrolling} onClick={() => void enroll()}>{enrolling ? <Loader2 className="animate-spin" /> : <Plus data-icon="inline-start" />}Enroll</Button></div>
        </CardContent></Card>
      </div>

      <Card className="border-border/80"><CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Attendance overview</CardTitle><CardDescription>Campus check-ins and lesson roll are reported separately.{summary && <span className="block">{summary.date_from} → {summary.date_to}</span>}</CardDescription></div><Tabs value={range} onValueChange={(value) => setRange(value as AnalyticsRange)}><TabsList>{RANGE_OPTIONS.map((option) => <TabsTrigger key={option.value} value={option.value} disabled={summaryLoading}>{option.label}</TabsTrigger>)}</TabsList></Tabs></CardHeader><CardContent>{summaryLoading ? <AttendanceOverviewSkeleton /> : !summary ? <p className="text-sm text-muted-foreground">No attendance data available.</p> : <div className="grid gap-8 xl:grid-cols-2">
        <section className="flex flex-col gap-4"><div><h3 className="font-semibold">Campus check-in</h3><p className="text-xs text-muted-foreground">Daily on-site presence across the roster.</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border bg-muted/30 p-4"><p className="text-2xl font-bold">{summary.campus.check_ins}</p><p className="text-xs text-muted-foreground">check-ins</p></div><div className="rounded-xl border bg-muted/30 p-4"><p className="text-2xl font-bold">{formatPercent(summary.campus.rate)}</p><p className="text-xs text-muted-foreground">attendance rate</p></div></div><ClassCampusChart data={campusData} /></section>
        <section className="flex flex-col gap-4"><div><h3 className="font-semibold">Lesson roll</h3><p className="text-xs text-muted-foreground">Marks recorded during class sessions.</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{(["present", "late", "absent", "excused"] as const).map((key) => <div key={key} className="rounded-xl border bg-muted/30 p-3 text-center"><p className="text-xl font-bold">{summary.lesson[key]}</p><p className="text-[10px] uppercase text-muted-foreground">{STATUS_LABELS[key]}</p></div>)}</div><ClassLessonCharts statusData={statusData} subjectData={subjectData} /></section>
      </div>}</CardContent></Card>
      <Button onClick={() => router.push(`/attendance/class/${classItem.id}/`)}>Take roll</Button>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent onClose={() => setEditOpen(false)}>
          <DialogHeader>
            <DialogTitle>Edit class</DialogTitle>
            <DialogDescription>Update this cohort&apos;s identifier and sub-category.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium">Education level</label>
              <Select items={EDUCATION_LEVELS} value={educationLevel} onValueChange={(value) => setEducationLevel(value as ClassPayload["education_level"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EDUCATION_LEVELS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="cohort">Identifier (letter)</label>
              <Input id="cohort" value={cohort} onChange={(event) => setCohort(sanitizeCohortIdentifierInput(event.target.value))} maxLength={COHORT_IDENTIFIER_MAX_LENGTH} placeholder={COHORT_IDENTIFIER_PLACEHOLDER} />
              <p className="mt-1 text-xs text-muted-foreground">{COHORT_IDENTIFIER_HINT}</p>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="subcategory">Sub-category</label>
              <Input id="subcategory" value={subcategory} onChange={(event) => setSubcategory(sanitizeCohortSubCategoryInput(event.target.value))} maxLength={COHORT_SUB_CATEGORY_MAX_LENGTH} placeholder={COHORT_SUB_CATEGORY_PLACEHOLDER} />
              <p className="mt-1 text-xs text-muted-foreground">{COHORT_SUB_CATEGORY_HINT}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button disabled={saving || !cohort.trim()} onClick={() => void saveClass()}>{saving && <Loader2 data-icon="inline-start" className="animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>}</StaggerContainer>
}

export default function ClassDetailPage() {
  return <RequireRole mode="staff"><ClassDetailContent /></RequireRole>
}
