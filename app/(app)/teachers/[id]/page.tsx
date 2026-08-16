"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { ArrowLeft, CalendarDays, Loader2, Pencil, UserCheck } from "lucide-react"
import { ApiError, createApi } from "@/lib/api"
import type { AnalyticsRange, Teacher, TeacherAttendanceSummary, TeacherPayload } from "@/lib/types"
import { EMPLOYMENT_TYPES, SCHOOL_CODES } from "@/lib/types"
import { cn } from "@/lib/utils"
import { RequireRole } from "@/components/require-role"
import {
  AttendanceOverviewSkeleton,
  PageSkeleton,
  TEACHER_DETAIL_PAGE_LAYOUT,
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

const TeacherAccountabilityCharts = dynamic(
  () =>
    import("@/components/charts/teacher-attendance-charts").then((m) => m.TeacherAccountabilityCharts),
  { ssr: false, loading: () => <ChartChunkSkeleton className="h-72" /> }
)
const TeacherPersonalOutcomeChart = dynamic(
  () =>
    import("@/components/charts/teacher-attendance-charts").then((m) => m.TeacherPersonalOutcomeChart),
  { ssr: false, loading: () => <ChartChunkSkeleton className="h-56 max-w-[280px] mx-auto" /> }
)

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [{ value: "week", label: "This week" }, { value: "month", label: "This month" }, { value: "all", label: "All time" }]
const STATUS_LABELS: Record<string, string> = { present: "Present", late: "Late", absent: "Absent", excused: "Excused" }
const OUTCOME_LABELS: Record<string, string> = { unmarked: "Unmarked", present: "Present", covered: "Covered", cover_taught: "Cover taught", no_show: "No show", cancelled: "Cancelled" }

function TeacherDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const teacherId = Number(params.id)
  const [teacher, setTeacher] = React.useState<Teacher | null>(null)
  const [summary, setSummary] = React.useState<TeacherAttendanceSummary | null>(null)
  const [range, setRange] = React.useState<AnalyticsRange>("month")
  const [loading, setLoading] = React.useState(true)
  const [summaryLoading, setSummaryLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState<TeacherPayload>({ name: "", school_code: "HIS", employment_type: null, join_date: null, contact: null })

  const loadCore = React.useCallback(async () => {
    if (!isSignedIn || !Number.isFinite(teacherId)) return
    setLoading(true); setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      setTeacher(await createApi(token).getTeacher(teacherId))
    } catch (err) { setError(err instanceof ApiError ? err.userMessage : err instanceof Error ? err.message : "Failed to load teacher") } finally { setLoading(false) }
  }, [getToken, isSignedIn, teacherId])
  const loadSummary = React.useCallback(async () => {
    if (!isSignedIn || !Number.isFinite(teacherId)) return
    setSummaryLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      setSummary(await createApi(token).getTeacherAttendanceSummary(teacherId, range))
    } catch (err) { setError(err instanceof ApiError ? err.userMessage : err instanceof Error ? err.message : "Failed to load attendance") } finally { setSummaryLoading(false) }
  }, [getToken, isSignedIn, range, teacherId])
  React.useEffect(() => {
    if (!(isLoaded && isSignedIn)) return
    const timer = window.setTimeout(() => void loadCore(), 0)
    return () => window.clearTimeout(timer)
  }, [isLoaded, isSignedIn, loadCore])
  React.useEffect(() => {
    if (!(isLoaded && isSignedIn && teacher)) return
    const timer = window.setTimeout(() => void loadSummary(), 0)
    return () => window.clearTimeout(timer)
  }, [isLoaded, isSignedIn, teacher, loadSummary])

  const openEdit = () => {
    if (!teacher) return
    setForm({ name: teacher.name, school_code: teacher.school_code, employment_type: teacher.employment_type, join_date: teacher.join_date?.slice(0, 10) ?? null, contact: teacher.contact })
    setEditOpen(true)
  }
  const saveTeacher = async () => {
    if (!teacher || !form.name.trim()) return
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      setTeacher(await createApi(token).updateTeacher(teacher.id, { ...form, name: form.name.trim(), contact: form.contact?.trim() || null, join_date: form.join_date || null }))
      setEditOpen(false)
    } catch (err) { setError(err instanceof ApiError ? err.userMessage : "Failed to update teacher") } finally { setSaving(false) }
  }
  const accountabilityStatus = React.useMemo(() => summary?.accountability.by_status.filter((entry) => entry.count > 0).map((entry) => ({ ...entry, name: STATUS_LABELS[entry.status] ?? entry.status })) ?? [], [summary])
  const accountabilitySubjects = React.useMemo(
    () =>
      (summary?.accountability.by_subject ?? summary?.accountability.by_class ?? []).map((entry) => ({
        name: "subject_label" in entry ? entry.subject_label : entry.class_label,
        present: entry.present,
        late: entry.late,
        absent: entry.absent,
        excused: entry.excused,
      })),
    [summary]
  )
  const outcomes = React.useMemo(() => summary?.personal.by_outcome.filter((entry) => entry.count > 0).map((entry) => ({ ...entry, name: OUTCOME_LABELS[entry.outcome] ?? entry.outcome })) ?? [], [summary])
  const employmentItems = React.useMemo(
    () => [{ value: "none", label: "None" }, ...EMPLOYMENT_TYPES.map((item) => ({ value: item.value, label: item.label }))],
    []
  )

  if (!isLoaded) return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>
  if (!isSignedIn) return <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Please sign in to view this teacher.</div>
  if (!Number.isFinite(teacherId)) return <div className="container mx-auto py-16 text-center text-muted-foreground">Invalid teacher id.</div>

  return <StaggerContainer className="container mx-auto max-w-6xl px-4 space-y-6">
    <StaggerItem>
      <Link href="/teachers/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 h-8 w-fit gap-1.5 px-2 text-muted-foreground hover:text-foreground")}><ArrowLeft className="size-3.5" />Back to Teachers</Link>
    </StaggerItem>
    {error && <StaggerItem><div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div></StaggerItem>}
    {loading ? <PageSkeleton blocks={TEACHER_DETAIL_PAGE_LAYOUT} /> : !teacher ? <Empty className="border"><EmptyHeader><EmptyMedia variant="icon"><UserCheck /></EmptyMedia><EmptyTitle>Teacher not found</EmptyTitle><EmptyDescription>This teacher may have been removed.</EmptyDescription></EmptyHeader><Button variant="outline" onClick={() => router.push("/teachers/")}>Back to Teachers</Button></Empty> : <>
      <Card className="border-border/80"><CardContent className="p-6 md:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="space-y-3"><div className="flex gap-2"><Badge variant="secondary">{teacher.school_code}</Badge><Badge variant="outline">{EMPLOYMENT_TYPES.find((item) => item.value === teacher.employment_type)?.label ?? "Unspecified"}</Badge></div><h1 className="text-2xl font-bold tracking-tight">{teacher.name}</h1><dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Identifier</dt><dd className="font-medium">{teacher.unique_code}</dd></div><div><dt className="text-muted-foreground">Joined</dt><dd className="font-medium">{teacher.join_date ?? "—"}</dd></div><div><dt className="text-muted-foreground">Contact</dt><dd className="font-medium">{teacher.contact ?? "—"}</dd></div></dl></div><Button variant="outline" size="sm" onClick={openEdit}><Pencil data-icon="inline-start" />Edit profile</Button></div></CardContent></Card>
      <Card className="border-border/80"><CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Teaching accountability</CardTitle><CardDescription>Lesson attendance for sessions this teacher taught (assigned or cover).{summary && <span className="block">{summary.date_from} → {summary.date_to}</span>}</CardDescription></div><Tabs value={range} onValueChange={(value) => setRange(value as AnalyticsRange)}><TabsList>{RANGE_OPTIONS.map((option) => <TabsTrigger key={option.value} value={option.value} disabled={summaryLoading}>{option.label}</TabsTrigger>)}</TabsList></Tabs></CardHeader><CardContent>{summaryLoading ? <AttendanceOverviewSkeleton /> : !summary ? <p className="text-sm text-muted-foreground">No analytics available.</p> : <div className="space-y-6"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{(["present", "late", "absent", "excused"] as const).map((key) => <div key={key} className="rounded-xl border bg-muted/30 p-3 text-center"><p className="text-xl font-bold">{summary.accountability[key]}</p><p className="text-[10px] uppercase text-muted-foreground">{STATUS_LABELS[key]}</p></div>)}</div><p className="text-sm text-muted-foreground">{summary.accountability.sessions_taught} sessions taught · {summary.accountability.total_marks} marks · attended {summary.accountability.rate_attended == null ? "—" : `${Math.round(summary.accountability.rate_attended * 100)}%`}</p><TeacherAccountabilityCharts statusData={accountabilityStatus} subjectData={accountabilitySubjects} /></div>}</CardContent></Card>
      <Card className="border-border/80"><CardHeader><CardTitle>Personal attendance</CardTitle><CardDescription>Session outcomes for this teacher.</CardDescription></CardHeader><CardContent>{summaryLoading ? <AttendanceOverviewSkeleton /> : summary && <div className="grid gap-6 lg:grid-cols-[1fr_280px]"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{(["present", "covered", "cover_taught", "no_show", "cancelled", "unmarked"] as const).map((key) => <div key={key} className="rounded-xl border bg-muted/30 p-4"><p className="text-2xl font-bold">{summary.personal[key]}</p><p className="text-xs text-muted-foreground">{OUTCOME_LABELS[key]}</p></div>)}</div><TeacherPersonalOutcomeChart outcomes={outcomes} /></div>}</CardContent></Card>
      <Card className="border-border/80"><CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2"><CalendarDays />Recent sessions</CardTitle><CardDescription>Assigned versus substitute teacher. Manage substitutes on Sessions.</CardDescription></div><Link href="/sessions/" className={buttonVariants({ variant: "outline", size: "sm" })}>Manage on Sessions</Link></CardHeader><CardContent>{!summary ? <p className="text-sm text-muted-foreground">No sessions available.</p> : summary.personal.recent_sessions.length === 0 ? <p className="text-sm text-muted-foreground">No recent sessions in this range.</p> : <div className="divide-y rounded-xl border">{summary.personal.recent_sessions.map((session) => {
        const hasSubstitute = Boolean(session.actual_teacher_id)
        return (
          <div key={`${session.kind}-${session.session_id}`} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{session.date} · {session.class_label ?? "Ad-hoc"}{session.subject_label ? ` · ${session.subject_label}` : ""}</p>
                <Badge variant="secondary">{session.status}</Badge>
                <Badge variant="outline">{OUTCOME_LABELS[session.outcome] ?? session.outcome}</Badge>
                {hasSubstitute ? <Badge variant="secondary">Substitute</Badge> : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Assigned: {session.assigned_teacher_name ?? "—"}
                {hasSubstitute ? ` · Substitute: ${session.actual_teacher_name}` : ""}
              </p>
            </div>
            {session.kind === "adhoc" ? <p className="text-xs text-muted-foreground">Ad-hoc session</p> : null}
          </div>
        )
      })}</div>}</CardContent></Card>
      <Dialog open={editOpen} onOpenChange={setEditOpen}><DialogContent onClose={() => setEditOpen(false)}><DialogHeader><DialogTitle>Edit teacher</DialogTitle><DialogDescription>Update profile and employment details.</DialogDescription></DialogHeader><div className="flex flex-col gap-4"><div><label className="text-sm font-medium" htmlFor="teacher-name">Name</label><Input id="teacher-name" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} /></div><div><label className="text-sm font-medium">School</label><Select items={SCHOOL_CODES} value={form.school_code} onValueChange={(value) => setForm((item) => ({ ...item, school_code: value ?? "HIS" }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SCHOOL_CODES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div><div><label className="text-sm font-medium">Employment type</label><Select items={employmentItems} value={form.employment_type ?? "none"} onValueChange={(value) => setForm((item) => ({ ...item, employment_type: value === "none" ? null : value as TeacherPayload["employment_type"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{EMPLOYMENT_TYPES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div><div><label className="text-sm font-medium" htmlFor="join-date">Join date</label><Input id="join-date" type="date" value={form.join_date ?? ""} onChange={(event) => setForm((item) => ({ ...item, join_date: event.target.value || null }))} /></div><div><label className="text-sm font-medium" htmlFor="contact">Contact</label><Input id="contact" value={form.contact ?? ""} onChange={(event) => setForm((item) => ({ ...item, contact: event.target.value }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button disabled={saving || !form.name.trim()} onClick={() => void saveTeacher()}>{saving && <Loader2 data-icon="inline-start" className="animate-spin" />}Save</Button></DialogFooter></DialogContent></Dialog>
    </>}</StaggerContainer>
}

export default function TeacherDetailPage() {
  return <RequireRole mode="staff"><TeacherDetailContent /></RequireRole>
}
