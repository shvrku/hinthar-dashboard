"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Trash2,
  User,
} from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { useClassesQuery } from "@/hooks/use-api-queries"
import { formatClassLabel } from "@/lib/format-class"
import {
  SCHOOL_CODES,
  type Class,
  type ClassStudent,
  type Student,
  type StudentAnalyticsRange,
  type StudentAttendanceSummary,
  type StudentPayload,
} from "@/lib/types"
import { cn } from "@/lib/utils"
import { isStaffOrAbove } from "@/lib/roles"
import { RequireRole } from "@/components/require-role"
import { useCurrentUser } from "@/components/current-user-provider"
import { SearchableSelect } from "@/components/searchable-select"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { PageSkeleton, STUDENT_DETAIL_PAGE_LAYOUT } from "@/components/page-skeletons"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import {
  StudentAttendanceOverview,
  StudentClassLabelsCard,
  StudentIdentityCard,
  StudentQrCard,
} from "@/components/students/student-record"

function StudentDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { user: me, role } = useCurrentUser()
  const studentId = Number(params.id)
  const isStaff = isStaffOrAbove(role)
  const isOwner = role === "student" && me?.student_profile_id === studentId

  const classesQuery = useClassesQuery(!!isLoaded && !!isSignedIn && isStaff)
  const allClasses = classesQuery.data ?? []

  const [student, setStudent] = React.useState<Student | null>(null)
  const [enrollments, setEnrollments] = React.useState<ClassStudent[]>([])
  const [summary, setSummary] = React.useState<StudentAttendanceSummary | null>(null)
  const [range, setRange] = React.useState<StudentAnalyticsRange>("month")

  const [loading, setLoading] = React.useState(true)
  const [summaryLoading, setSummaryLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const [editOpen, setEditOpen] = React.useState(false)
  const [editSaving, setEditSaving] = React.useState(false)
  const [formName, setFormName] = React.useState("")
  const [formDob, setFormDob] = React.useState("")
  const [formContact, setFormContact] = React.useState("")
  const [formSchool, setFormSchool] = React.useState("")
  const [formUci, setFormUci] = React.useState("")

  const [enrollClassId, setEnrollClassId] = React.useState("")
  const [enrolling, setEnrolling] = React.useState(false)
  const [unenrollingId, setUnenrollingId] = React.useState<number | null>(null)

  const [qrLoading, setQrLoading] = React.useState(false)
  const [tokenLoading, setTokenLoading] = React.useState(false)

  const flashSuccess = React.useCallback((msg: string) => {
    setSuccess(msg)
    window.setTimeout(() => setSuccess(null), 3500)
  }, [])

  const loadCore = React.useCallback(async () => {
    if (!isSignedIn || !Number.isFinite(studentId)) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      if (isStaff) {
        const [studentRes, enrollmentRes] = await Promise.all([
          api.getStudent(studentId),
          api.listClassStudentsPage({ student_id: studentId, page_size: 200 }),
        ])
        setStudent(studentRes)
        setEnrollments(enrollmentRes.results)
      } else {
        const studentRes = await api.getStudent(studentId)
        setStudent(studentRes)
        setEnrollments([])
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to load student")
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn, studentId, isStaff])

  const loadSummary = React.useCallback(async () => {
    if (!isSignedIn || !Number.isFinite(studentId)) return
    setSummaryLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const data = await createApi(token).getStudentAttendanceSummary(studentId, range)
      setSummary(data)
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to load analytics")
    } finally {
      setSummaryLoading(false)
    }
  }, [getToken, isSignedIn, studentId, range])

  React.useEffect(() => {
    if (isLoaded && isSignedIn) void loadCore()
  }, [isLoaded, isSignedIn, loadCore])

  React.useEffect(() => {
    if (isLoaded && isSignedIn && student) void loadSummary()
  }, [isLoaded, isSignedIn, student, loadSummary])

  const openEdit = () => {
    if (!student) return
    setFormName(student.name)
    setFormDob(student.dob ?? "")
    setFormContact(student.contact ?? "")
    setFormSchool(student.school_code)
    setFormUci(student.exam_candidate_number ?? "")
    setEditOpen(true)
  }

  const saveProfile = async () => {
    if (!student) return
    setEditSaving(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const payload: StudentPayload = {
        name: formName.trim(),
        school_code: formSchool,
        dob: formDob || null,
        contact: formContact.trim() || null,
        exam_candidate_number: formUci.trim() || null,
      }
      const updated = await createApi(token).updateStudent(student.id, payload)
      setStudent(updated)
      setEditOpen(false)
      flashSuccess("Profile updated.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setEditSaving(false)
    }
  }

  const handleEnroll = async () => {
    if (!student || !enrollClassId) return
    setEnrolling(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const entry = await createApi(token).createClassStudent(Number(enrollClassId), student.id)
      setEnrollments((prev) => [...prev, entry])
      setEnrollClassId("")
      flashSuccess("Enrolled in class.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to enroll")
    } finally {
      setEnrolling(false)
    }
  }

  const handleUnenroll = async (classStudentId: number) => {
    setUnenrollingId(classStudentId)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      await createApi(token).deleteClassStudent(classStudentId)
      setEnrollments((prev) => prev.filter((e) => e.id !== classStudentId))
      flashSuccess("Removed from class.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to unenroll")
    } finally {
      setUnenrollingId(null)
    }
  }

  const refreshQrToken = async () => {
    if (!student) return
    setTokenLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const res = await createApi(token).regenerateCheckInToken(student.id)
      setStudent((prev) =>
        prev
          ? {
              ...prev,
              check_in_token: res.check_in_token,
              check_in_token_active: res.check_in_token_active ?? true,
            }
          : null
      )
      flashSuccess("QR token regenerated.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to regenerate token")
    } finally {
      setTokenLoading(false)
    }
  }

  const toggleQrActive = async (activate: boolean) => {
    if (!student) return
    setQrLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const res = activate
        ? await api.activateCheckInToken(student.id)
        : await api.deactivateCheckInToken(student.id)
      setStudent((prev) => (prev ? { ...prev, check_in_token_active: res.check_in_token_active } : null))
      flashSuccess(activate ? "QR check-in activated." : "QR check-in deactivated.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to update QR status")
    } finally {
      setQrLoading(false)
    }
  }

  const enrolledClassIds = React.useMemo(
    () =>
      new Set(
        enrollments.map((e) =>
          typeof e.class_obj === "object" && e.class_obj ? e.class_obj.id : e.class_obj_id ?? 0
        )
      ),
    [enrollments]
  )

  const classOptions = React.useMemo(
    () =>
      allClasses
        .filter((c) => !enrolledClassIds.has(c.id))
        .map((c) => ({ value: String(c.id), label: formatClassLabel(c) })),
    [allClasses, enrolledClassIds]
  )

  if (!isLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Please sign in to view this student.
      </div>
    )
  }

  if (!Number.isFinite(studentId)) {
    return (
      <div className="container mx-auto max-w-3xl py-16 text-center">
        <p className="text-muted-foreground">Invalid student id.</p>
      </div>
    )
  }

  if (!isStaff && !isOwner) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          You can only view your own student record.
        </p>
        <Button variant="outline" render={<Link href="/" />}>
          Go back
        </Button>
      </div>
    )
  }

  return (
    <StaggerContainer className="container mx-auto max-w-6xl space-y-6 px-4">
      {isStaff ? (
        <StaggerItem>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/students/"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "-ml-2 h-8 w-fit gap-1.5 px-2 text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowLeft className="size-3.5" />
              Back to Students
            </Link>
          </div>
        </StaggerItem>
      ) : null}

      {error ? (
        <StaggerItem>
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        </StaggerItem>
      ) : null}
      {success ? (
        <StaggerItem>
          <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground">
            {success}
          </div>
        </StaggerItem>
      ) : null}

      {loading ? (
        <PageSkeleton blocks={STUDENT_DETAIL_PAGE_LAYOUT} />
      ) : !student ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <User />
            </EmptyMedia>
            <EmptyTitle>Student not found</EmptyTitle>
            <EmptyDescription>This student may have been removed.</EmptyDescription>
          </EmptyHeader>
          {isStaff ? (
            <Button variant="outline" onClick={() => router.push("/students/")}>
              Back to Students
            </Button>
          ) : null}
        </Empty>
      ) : (
        <>
          <StudentIdentityCard
            student={student}
            showContact={isStaff}
            actions={
              isStaff ? (
                <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={openEdit}>
                  <Pencil className="size-4" />
                  Edit profile
                </Button>
              ) : undefined
            }
          />

          <div className="grid gap-6 lg:grid-cols-3">
            {isStaff ? (
              <Card className="border-border/80 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="size-5 text-muted-foreground" />
                    Enrolled classes
                  </CardTitle>
                  <CardDescription>Cohorts this student belongs to.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {enrollments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Not enrolled in any class yet.</p>
                  ) : (
                    <ul className="divide-y rounded-xl border">
                      {enrollments.map((entry) => {
                        const cls =
                          typeof entry.class_obj === "object" && entry.class_obj
                            ? (entry.class_obj as Class)
                            : allClasses.find((c) => c.id === entry.class_obj_id)
                        const label = cls ? formatClassLabel(cls) : `Class #${entry.class_obj_id ?? "?"}`
                        return (
                          <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                            <div>
                              <p className="font-medium">{label}</p>
                              {cls ? (
                                <Link
                                  href={`/classes/${cls.id}/`}
                                  className="text-xs text-muted-foreground hover:text-primary"
                                >
                                  View in classes
                                </Link>
                              ) : null}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              disabled={unenrollingId === entry.id}
                              onClick={() => void handleUnenroll(entry.id)}
                              aria-label={`Remove from ${label}`}
                            >
                              {unenrollingId === entry.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                      <label className="mb-1.5 block text-xs text-muted-foreground">Add to class</label>
                      <SearchableSelect
                        options={classOptions}
                        value={enrollClassId}
                        onValueChange={setEnrollClassId}
                        placeholder="Select class…"
                        searchPlaceholder="Search classes…"
                      />
                    </div>
                    <Button
                      className="shrink-0 gap-1.5"
                      disabled={!enrollClassId || enrolling}
                      onClick={() => void handleEnroll()}
                    >
                      {enrolling ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                      Enroll
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <StudentClassLabelsCard labels={student.class_labels ?? []} />
            )}

            <StudentQrCard
              student={student}
              showSecret={isStaff}
              actions={
                isStaff ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      disabled={tokenLoading}
                      onClick={() => void refreshQrToken()}
                    >
                      {tokenLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="size-4" />
                      )}
                      Regenerate
                    </Button>
                    {student.check_in_token_active === false ? (
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5"
                        disabled={qrLoading}
                        onClick={() => void toggleQrActive(true)}
                      >
                        {qrLoading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="size-4" />
                        )}
                        Activate
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 gap-1.5"
                        disabled={qrLoading}
                        onClick={() => void toggleQrActive(false)}
                      >
                        {qrLoading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ShieldOff className="size-4" />
                        )}
                        Deactivate
                      </Button>
                    )}
                  </div>
                ) : undefined
              }
            />
          </div>

          <StudentAttendanceOverview
            summary={summary}
            range={range}
            onRangeChange={setRange}
            summaryLoading={summaryLoading}
            onRefresh={() => void loadSummary()}
            extraActions={
              isStaff ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => router.push("/check-in/terminal/")}
                >
                  <Monitor className="size-3.5" />
                  Open terminal
                </Button>
              ) : undefined
            }
          />
        </>
      )}

      {isStaff ? (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent onClose={() => setEditOpen(false)}>
            <DialogHeader>
              <DialogTitle>Edit student</DialogTitle>
              <DialogDescription>Update profile fields for {student?.name}.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <label htmlFor="edit-name" className="text-sm font-medium">
                  Name
                </label>
                <Input id="edit-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="edit-dob" className="text-sm font-medium">
                  Date of birth
                </label>
                <Input
                  id="edit-dob"
                  type="date"
                  value={formDob}
                  onChange={(e) => setFormDob(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="edit-contact" className="text-sm font-medium">
                  Contact
                </label>
                <Input
                  id="edit-contact"
                  value={formContact}
                  onChange={(e) => setFormContact(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <span className="text-sm font-medium">School</span>
                <Select value={formSchool} onValueChange={(v) => setFormSchool(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="School" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHOOL_CODES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="edit-uci" className="text-sm font-medium">
                  UCI
                </label>
                <Input id="edit-uci" value={formUci} onChange={(e) => setFormUci(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>
                Cancel
              </Button>
              <Button onClick={() => void saveProfile()} disabled={editSaving || !formName.trim()}>
                {editSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </StaggerContainer>
  )
}

export default function StudentDetailPage() {
  return (
    <RequireRole mode="any">
      <StudentDetailContent />
    </RequireRole>
  )
}
