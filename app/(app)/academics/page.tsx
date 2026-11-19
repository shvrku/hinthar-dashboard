"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardEdit,
  Download,
  ExternalLink,
  Eye,
  GraduationCap,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react"

import { ApiError, createApi } from "@/lib/api"
import { downloadCsv } from "@/lib/export-utils"
import { formatCohortIdentifier } from "@/lib/format-class"
import { formatStudentIdentifier } from "@/lib/format-student-code"
import { useClassesQuery, useSubjectsQuery } from "@/hooks/use-api-queries"
import AcademicsLoading from "./loading"
import type {
  AcademicTerm,
  AcademicYear,
  BroadsheetResponse,
  BroadsheetStudentRow,
  BulkExamMarkRecord,
  Exam,
  ExamConflictResponse,
  ExamPassFailStatus,
} from "@/lib/types"
import { RequireRole } from "@/components/require-role"
import { ParentPortalWorkspace } from "@/components/academics/parent-portal-workspace"
import {
  CodeChip,
  DataModule,
  InspectorSheet,
  SystemHeader,
  TelemetryTag,
  type TelemetryStatus,
} from "@/components/design-system/v2-primitives"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

function statusToTelemetry(status: ExamPassFailStatus): TelemetryStatus {
  if (status === "PASS") return "present"
  if (status === "FAIL") return "absent"
  if (status === "UNPUBLISHED") return "neutral"
  return "late"
}

function previewGrade(marks: number, maxMarks: number, isAbsent: boolean): string {
  if (isAbsent || maxMarks <= 0) return "F"
  const pct = (marks / maxMarks) * 100
  if (pct >= 90) return "A*"
  if (pct >= 80) return "A"
  if (pct >= 70) return "B"
  if (pct >= 60) return "C"
  if (pct >= 50) return "D"
  return "F"
}

function roundTwo(val: number): string {
  return (Math.round((val + Number.EPSILON) * 100) / 100).toFixed(2)
}

function AcademicsWorkspaceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const paramTab = searchParams.get("tab")
  const [activeTab, setActiveTab] = React.useState<string>(() => {
    if (paramTab === "schedule" || paramTab === "parent") return paramTab
    return "broadsheet"
  })

  React.useEffect(() => {
    if (paramTab === "schedule" || paramTab === "parent" || paramTab === "broadsheet") {
      setActiveTab(paramTab)
    }
  }, [paramTab])

  const handleTabChange = (nextTab: string) => {
    setActiveTab(nextTab)
    const params = new URLSearchParams(searchParams.toString())
    if (nextTab === "broadsheet") {
      params.delete("tab")
    } else {
      params.set("tab", nextTab)
    }
    const qs = params.toString()
    router.replace(qs ? `/academics?${qs}` : "/academics", { scroll: false })
  }

  // Reference metadata
  const classesQuery = useClassesQuery(!!isLoaded && !!isSignedIn)
  const subjectsQuery = useSubjectsQuery(!!isLoaded && !!isSignedIn)
  const classes = classesQuery.data ?? []
  const subjects = subjectsQuery.data ?? []

  // Academic Years & Fixed Terms
  const [years, setYears] = React.useState<AcademicYear[]>([])
  const [yearsLoading, setYearsLoading] = React.useState(true)
  const [selectedYearId, setSelectedYearId] = React.useState<string>("")
  const [selectedTermType, setSelectedTermType] = React.useState<"midterm" | "final">("midterm")
  const [selectedClassId, setSelectedClassId] = React.useState<string>("")
  const [togglingTermId, setTogglingTermId] = React.useState<number | null>(null)

  // Broadsheet state
  const [broadsheet, setBroadsheet] = React.useState<BroadsheetResponse | null>(null)
  const [broadsheetLoading, setBroadsheetLoading] = React.useState(true)
  const [broadsheetSearch, setBroadsheetSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "PASS" | "FAIL" | "PENDING">("ALL")

  // Inline mark entry mode inside broadsheet
  const [inlineEditMode, setInlineEditMode] = React.useState(false)
  const [editingRowStudentId, setEditingRowStudentId] = React.useState<number | null>(null)
  const [inlineDrafts, setInlineDrafts] = React.useState<Record<string, string>>({})
  const [savingInline, setSavingInline] = React.useState(false)

  // Exam schedule list state
  const [exams, setExams] = React.useState<Exam[]>([])
  const [examsLoading, setExamsLoading] = React.useState(true)
  const [scheduleSearch, setScheduleSearch] = React.useState("")
  const [scheduleTermFilter, setScheduleTermFilter] = React.useState<"ALL" | "midterm" | "final">("ALL")
  const [scheduleClassFilter, setScheduleClassFilter] = React.useState<string>("all")

  // Create / Delete Academic Year InspectorSheet
  const [yearSheetOpen, setYearSheetOpen] = React.useState(false)
  const [yearName, setYearName] = React.useState("2026-2027")
  const [yearStart, setYearStart] = React.useState("2026-06-01")
  const [yearEnd, setYearEnd] = React.useState("2027-05-31")
  const [savingYear, setSavingYear] = React.useState(false)
  const [deleteYearTarget, setDeleteYearTarget] = React.useState<AcademicYear | null>(null)
  const [deletingYear, setDeletingYear] = React.useState(false)

  // Create / Edit Exam InspectorSheet
  const [examSheetOpen, setExamSheetOpen] = React.useState(false)
  const [editingExam, setEditingExam] = React.useState<Exam | null>(null)
  const [examTermId, setExamTermId] = React.useState<string>("")
  const [examClassId, setExamClassId] = React.useState<string>("")
  const [examSubjectId, setExamSubjectId] = React.useState<string>("")
  const [examTitle, setExamTitle] = React.useState<string>("")
  const [examDate, setExamDate] = React.useState<string>("2026-10-15")
  const [examStartTime, setExamStartTime] = React.useState<string>("09:00")
  const [examEndTime, setExamEndTime] = React.useState<string>("11:00")
  const [examRoom, setExamRoom] = React.useState<string>("HALL-101")
  const [examMaxMarks, setExamMaxMarks] = React.useState<string>("100")
  const [examPassMarks, setExamPassMarks] = React.useState<string>("50")
  const [conflictCheck, setConflictCheck] = React.useState<ExamConflictResponse | null>(null)
  const [checkingConflict, setCheckingConflict] = React.useState(false)
  const [savingExam, setSavingExam] = React.useState(false)

  // Delete Exam Dialog
  const [deleteExamTarget, setDeleteExamTarget] = React.useState<Exam | null>(null)
  const [deletingExam, setDeletingExam] = React.useState(false)

  // Bulk Mark Entry InspectorSheet
  const [marksSheetOpen, setMarksSheetOpen] = React.useState(false)
  const [marksExam, setMarksExam] = React.useState<Exam | null>(null)
  const [marksSheetRows, setMarksSheetRows] = React.useState<
    Array<{
      student_id: number
      unique_code: string
      name: string
      marks_obtained: string
      is_absent: boolean
      remarks: string
    }>
  >([])
  const [loadingMarksSheet, setLoadingMarksSheet] = React.useState(false)
  const [savingMarksSheet, setSavingMarksSheet] = React.useState(false)

  // Auto-select first cohort once classes load
  React.useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(String(classes[0].id))
    }
  }, [classes, selectedClassId])

  const loadYears = React.useCallback(async () => {
    if (!isSignedIn) return
    setYearsLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await createApi(token).listAcademicYears()
      setYears(res)
      if (res.length > 0) {
        setSelectedYearId((prev) => {
          if (prev && res.some((y) => String(y.id) === prev)) return prev
          const activeYr = res.find((y) => y.is_active) ?? res[0]
          return String(activeYr.id)
        })
      } else {
        setSelectedYearId("")
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.add({ title: err.userMessage, type: "error" })
      }
    } finally {
      setYearsLoading(false)
    }
  }, [getToken, isSignedIn])

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      void loadYears()
    }
  }, [isLoaded, isSignedIn, loadYears])

  const selectedYear = React.useMemo(
    () => years.find((y) => String(y.id) === selectedYearId) ?? null,
    [years, selectedYearId]
  )

  const midtermTerm = React.useMemo(
    () => selectedYear?.terms.find((t) => t.number === 1 || t.term_type === "midterm") ?? null,
    [selectedYear]
  )
  const finalTerm = React.useMemo(
    () => selectedYear?.terms.find((t) => t.number === 2 || t.term_type === "final") ?? null,
    [selectedYear]
  )

  const activeTerm: AcademicTerm | null =
    selectedTermType === "midterm" ? midtermTerm : finalTerm

  const loadBroadsheet = React.useCallback(async () => {
    if (!isSignedIn || !activeTerm || !selectedClassId) {
      setBroadsheet(null)
      if (!yearsLoading && !classesQuery.isLoading) {
        setBroadsheetLoading(false)
      }
      return
    }
    setBroadsheetLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await createApi(token).getClassBroadsheet(
        activeTerm.id,
        Number(selectedClassId)
      )
      setBroadsheet(res)
      setInlineDrafts({})
      setEditingRowStudentId(null)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.add({ title: err.userMessage, type: "error" })
      }
    } finally {
      setBroadsheetLoading(false)
    }
  }, [getToken, isSignedIn, activeTerm, selectedClassId, yearsLoading, classesQuery.isLoading])

  const loadExams = React.useCallback(async () => {
    if (!isSignedIn || !selectedYearId) {
      setExams([])
      if (!yearsLoading) {
        setExamsLoading(false)
      }
      return
    }
    setExamsLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await createApi(token).listExams({
        academic_year_id: selectedYearId,
      })
      setExams(res)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.add({ title: err.userMessage, type: "error" })
      }
    } finally {
      setExamsLoading(false)
    }
  }, [getToken, isSignedIn, selectedYearId, yearsLoading])

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      void loadBroadsheet()
    }
  }, [isLoaded, isSignedIn, loadBroadsheet])

  React.useEffect(() => {
    if (isLoaded && isSignedIn && !yearsLoading) {
      void loadExams()
    }
  }, [isLoaded, isSignedIn, yearsLoading, loadExams])

  // Toggle Term Publish
  const handleToggleTermPublish = async (term: AcademicTerm) => {
    setTogglingTermId(term.id)
    try {
      const token = await getToken()
      if (!token) return
      const updated = await createApi(token).toggleTermPublish(term.id)
      toast.add({
        title: updated.is_published
          ? `${updated.name} results published to Parent Portal`
          : `${updated.name} results unpublished (hidden from parents)`,
        type: "success",
      })
      await Promise.all([loadYears(), loadBroadsheet()])
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Failed to toggle term publish",
        type: "error",
      })
    } finally {
      setTogglingTermId(null)
    }
  }

  // Academic Year Auto-Sync & Conflict Validation
  const openCreateYearSheet = React.useCallback(() => {
    let nextStart = new Date().getFullYear()
    for (const y of years) {
      const m = /^(\d{4})-(\d{4})$/.exec(y.name.trim())
      const endYr = m ? Number(m[2]) : Number(y.end_date.slice(0, 4))
      if (!Number.isNaN(endYr) && endYr >= nextStart) {
        nextStart = endYr
      }
    }
    const nextEnd = nextStart + 1
    setYearName(`${nextStart}-${nextEnd}`)
    setYearStart(`${nextStart}-06-01`)
    setYearEnd(`${nextEnd}-05-31`)
    setYearSheetOpen(true)
  }, [years])

  const handleYearNameChange = (val: string) => {
    setYearName(val)
    const match = /^(\d{4})-(\d{4})$/.exec(val.trim())
    if (match) {
      const y1 = Number(match[1])
      const y2 = Number(match[2])
      if (y2 === y1 + 1) {
        const startSuffix = /^\d{4}-\d{2}-\d{2}$/.test(yearStart)
          ? yearStart.slice(4)
          : "-06-01"
        const endSuffix = /^\d{4}-\d{2}-\d{2}$/.test(yearEnd)
          ? yearEnd.slice(4)
          : "-05-31"
        setYearStart(`${y1}${startSuffix}`)
        setYearEnd(`${y2}${endSuffix}`)
      }
    }
  }

  const handleYearStartChange = (val: string) => {
    setYearStart(val)
    const yMatch = /^(\d{4})-\d{2}-\d{2}$/.exec(val)
    if (yMatch) {
      const y1 = Number(yMatch[1])
      const y2 = y1 + 1
      const endSuffix = /^\d{4}-\d{2}-\d{2}$/.test(yearEnd)
        ? yearEnd.slice(4)
        : "-05-31"
      setYearName(`${y1}-${y2}`)
      setYearEnd(`${y2}${endSuffix}`)
    }
  }

  const yearConflicts = React.useMemo(() => {
    const issues: string[] = []
    const trimmed = yearName.trim()
    const match = /^(\d{4})-(\d{4})$/.exec(trimmed)
    let startYr: number | null = null
    let endYr: number | null = null

    if (!match) {
      issues.push("Label must follow YYYY-YYYY format (e.g. 2026-2027).")
    } else {
      startYr = Number(match[1])
      endYr = Number(match[2])
      if (endYr <= startYr) {
        issues.push(
          `Invalid year order (${trimmed}): end year (${endYr}) must be after start year (${startYr}), e.g. ${startYr}-${startYr + 1}.`
        )
      } else if (endYr !== startYr + 1) {
        issues.push(
          `Academic year label must span two consecutive years (expected ${startYr}-${startYr + 1}).`
        )
      }
    }

    if (!yearStart || !yearEnd) {
      issues.push("Start Date and End Date are required.")
    } else {
      if (yearEnd <= yearStart) {
        issues.push("End Date must be after Start Date.")
      }
      if (startYr !== null && endYr !== null && endYr === startYr + 1) {
        const startDateYear = Number(yearStart.slice(0, 4))
        const endDateYear = Number(yearEnd.slice(0, 4))
        if (startDateYear !== startYr) {
          issues.push(
            `Start Date year (${startDateYear}) does not match label start year (${startYr}).`
          )
        }
        if (endDateYear !== endYr) {
          issues.push(
            `End Date year (${endDateYear}) does not match label end year (${endYr}).`
          )
        }
      }
    }

    if (trimmed && years.some((y) => y.name.toLowerCase() === trimmed.toLowerCase())) {
      issues.push(`Academic Year "${trimmed}" already exists.`)
    }

    if (yearStart && yearEnd && yearEnd > yearStart) {
      for (const y of years) {
        if (yearStart <= y.end_date && yearEnd >= y.start_date) {
          issues.push(
            `Date overlap: ${yearStart} → ${yearEnd} overlaps existing Academic Year ${y.name} (${y.start_date} → ${y.end_date}).`
          )
        }
      }
    }

    return issues
  }, [yearName, yearStart, yearEnd, years])

  const examDateOutOfRange = React.useMemo(() => {
    if (!selectedYear || !examDate) return false
    return examDate < selectedYear.start_date || examDate > selectedYear.end_date
  }, [selectedYear, examDate])

  // Create Academic Year
  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault()
    if (yearConflicts.length > 0) return
    if (!yearName.trim() || !yearStart || !yearEnd) return
    setSavingYear(true)
    try {
      const token = await getToken()
      if (!token) return
      const created = await createApi(token).createAcademicYear({
        name: yearName.trim(),
        start_date: yearStart,
        end_date: yearEnd,
        is_active: true,
      })
      toast.add({
        title: `Created ${created.name} with Midterm & Final Term`,
        type: "success",
      })
      setYearSheetOpen(false)
      await loadYears()
      setSelectedYearId(String(created.id))
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Failed to create academic year",
        type: "error",
      })
    } finally {
      setSavingYear(false)
    }
  }

  const handleDeleteYear = async () => {
    if (!deleteYearTarget) return
    setDeletingYear(true)
    try {
      const token = await getToken()
      if (!token) return
      await createApi(token).deleteAcademicYear(deleteYearTarget.id)
      toast.add({
        title: `Deleted Academic Year ${deleteYearTarget.name}`,
        type: "success",
      })
      setDeleteYearTarget(null)
      await Promise.all([loadYears(), loadExams(), loadBroadsheet()])
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Failed to delete academic year",
        type: "error",
      })
    } finally {
      setDeletingYear(false)
    }
  }

  // Open Schedule / Edit Exam Drawer
  const openNewExamSheet = () => {
    setEditingExam(null)
    setExamTermId(activeTerm ? String(activeTerm.id) : midtermTerm ? String(midtermTerm.id) : "")
    setExamClassId(selectedClassId || (classes[0] ? String(classes[0].id) : ""))
    setExamSubjectId(subjects[0] ? String(subjects[0].id) : "")
    setExamTitle("")
    const todayIso = new Date().toISOString().slice(0, 10)
    const clampedDate = selectedYear
      ? todayIso < selectedYear.start_date
        ? selectedYear.start_date
        : todayIso > selectedYear.end_date
          ? selectedYear.end_date
          : todayIso
      : todayIso
    setExamDate(clampedDate)
    setExamStartTime("09:00")
    setExamEndTime("11:00")
    setExamRoom("HALL-101")
    setExamMaxMarks("100")
    setExamPassMarks("50")
    setConflictCheck(null)
    setExamSheetOpen(true)
  }

  const openEditExamSheet = (exam: Exam) => {
    setEditingExam(exam)
    setExamTermId(String(exam.term))
    setExamClassId(String(exam.class_obj))
    setExamSubjectId(String(exam.subject))
    setExamTitle(exam.title)
    setExamDate(exam.exam_date)
    setExamStartTime(exam.start_time.slice(0, 5))
    setExamEndTime(exam.end_time.slice(0, 5))
    setExamRoom(exam.room)
    setExamMaxMarks(exam.max_marks)
    setExamPassMarks(exam.pass_marks)
    setConflictCheck(null)
    setExamSheetOpen(true)
  }

  // Live exam conflict pre-check
  React.useEffect(() => {
    if (!examSheetOpen || !examClassId || !examDate || !examStartTime || !examEndTime) {
      setConflictCheck(null)
      return
    }
    if (examEndTime <= examStartTime) {
      setConflictCheck(null)
      return
    }
    const timer = window.setTimeout(async () => {
      setCheckingConflict(true)
      try {
        const token = await getToken()
        if (!token) return
        const res = await createApi(token).checkExamConflicts({
          class_id: Number(examClassId),
          exam_date: examDate,
          start_time: examStartTime,
          end_time: examEndTime,
          room: examRoom,
          exclude_id: editingExam?.id,
          term_id: examTermId ? Number(examTermId) : undefined,
          subject_id: examSubjectId ? Number(examSubjectId) : undefined,
        })
        setConflictCheck(res)
      } catch {
        setConflictCheck(null)
      } finally {
        setCheckingConflict(false)
      }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [
    examSheetOpen,
    examClassId,
    examTermId,
    examSubjectId,
    examDate,
    examStartTime,
    examEndTime,
    examRoom,
    editingExam?.id,
    getToken,
  ])

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!examTermId || !examClassId || !examSubjectId) return
    setSavingExam(true)
    try {
      const token = await getToken()
      if (!token) return
      const api = createApi(token)
      const payload = {
        term: Number(examTermId),
        class_obj: Number(examClassId),
        subject: Number(examSubjectId),
        title: examTitle.trim(),
        exam_date: examDate,
        start_time: examStartTime,
        end_time: examEndTime,
        room: examRoom.trim(),
        max_marks: examMaxMarks || "100",
        pass_marks: examPassMarks || "50",
      }
      if (editingExam) {
        await api.updateExam(editingExam.id, payload)
        toast.add({ title: "Exam schedule updated", type: "success" })
      } else {
        await api.createExam(payload)
        toast.add({ title: "Exam scheduled successfully", type: "success" })
      }
      setExamSheetOpen(false)
      await Promise.all([loadExams(), loadBroadsheet()])
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Failed to save exam",
        type: "error",
      })
    } finally {
      setSavingExam(false)
    }
  }

  const handleDeleteExam = async () => {
    if (!deleteExamTarget) return
    setDeletingExam(true)
    try {
      const token = await getToken()
      if (!token) return
      await createApi(token).deleteExam(deleteExamTarget.id)
      toast.add({ title: "Exam deleted", type: "success" })
      setDeleteExamTarget(null)
      await Promise.all([loadExams(), loadBroadsheet()])
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Failed to delete exam",
        type: "error",
      })
    } finally {
      setDeletingExam(false)
    }
  }

  // Open Bulk Mark Entry Drawer for an Exam
  const openBulkMarksForExam = async (examId: number) => {
    setMarksSheetOpen(true)
    setLoadingMarksSheet(true)
    try {
      const token = await getToken()
      if (!token) return
      const api = createApi(token)

      let targetExam = exams.find((x) => x.id === examId) ?? null
      if (!targetExam) {
        const list = await api.listExams({ term_id: activeTerm?.id })
        targetExam = list.find((x) => x.id === examId) ?? null
      }
      if (!targetExam) {
        toast.add({ title: "Exam not found", type: "error" })
        setMarksSheetOpen(false)
        return
      }
      setMarksExam(targetExam)

      // Fetch broadsheet for the exam's term & class to get full enrolled roster + current marks
      const bs = await api.getClassBroadsheet(targetExam.term, targetExam.class_obj)
      const rows = bs.students.map((st) => {
        const cell = st.marks_by_exam[String(targetExam!.id)]
        return {
          student_id: st.student_id,
          unique_code: formatStudentIdentifier(st.student_code ?? st.unique_code, st.student_id),
          name: st.name,
          marks_obtained: cell?.marks_obtained ?? "",
          is_absent: cell?.is_absent ?? false,
          remarks: cell?.remarks ?? "",
        }
      })
      setMarksSheetRows(rows)
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Failed to load exam roster",
        type: "error",
      })
      setMarksSheetOpen(false)
    } finally {
      setLoadingMarksSheet(false)
    }
  }

  const handleSaveBulkMarks = async () => {
    if (!marksExam) return
    const records: BulkExamMarkRecord[] = []
    for (const row of marksSheetRows) {
      const trimmed = row.marks_obtained.trim()
      if (trimmed === "" && !row.is_absent) continue
      records.push({
        student_id: row.student_id,
        marks_obtained: row.is_absent ? (trimmed || "0") : trimmed,
        is_absent: row.is_absent,
        remarks: row.remarks.trim(),
      })
    }
    if (records.length === 0) {
      toast.add({ title: "Enter at least one mark before saving", type: "warning" })
      return
    }
    setSavingMarksSheet(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await createApi(token).bulkSaveExamMarks(marksExam.id, records)
      if (res.broadsheet) {
        setBroadsheet(res.broadsheet)
      }
      toast.add({
        title: `Saved ${res.saved_count} mark record(s) for ${marksExam.subject_name}`,
        type: "success",
      })
      setMarksSheetOpen(false)
      void loadExams()
      if (!res.broadsheet) {
        await loadBroadsheet()
      }
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Failed to save exam marks",
        type: "error",
      })
    } finally {
      setSavingMarksSheet(false)
    }
  }

  // Inline Broadsheet Mark Save
  const inlineDirtyCount = Object.keys(inlineDrafts).length

  const handleSaveInlineMarks = async () => {
    if (inlineDirtyCount === 0) return
    const records: BulkExamMarkRecord[] = []
    for (const [key, val] of Object.entries(inlineDrafts)) {
      const [examIdStr, studentIdStr] = key.split(":")
      const trimmed = val.trim()
      if (trimmed === "") continue
      const existingCell = broadsheet?.students
        .find((s) => s.student_id === Number(studentIdStr))
        ?.marks_by_exam[examIdStr]
      records.push({
        exam_id: Number(examIdStr),
        student_id: Number(studentIdStr),
        marks_obtained: trimmed,
        is_absent: existingCell?.is_absent ?? false,
        remarks: existingCell?.remarks ?? "",
      })
    }
    if (records.length === 0) {
      setInlineDrafts({})
      setEditingRowStudentId(null)
      return
    }
    setSavingInline(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await createApi(token).bulkUpsertExamResults(records, {
        term_id: activeTerm?.id,
        class_id: selectedClassId ? Number(selectedClassId) : undefined,
      })
      if (res.broadsheet) {
        setBroadsheet(res.broadsheet)
      }
      toast.add({
        title: `Saved ${res.saved_count} inline exam score(s)`,
        type: "success",
      })
      setInlineDrafts({})
      setEditingRowStudentId(null)
      void loadExams()
      if (!res.broadsheet) {
        await loadBroadsheet()
      }
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Failed to save inline marks",
        type: "error",
      })
    } finally {
      setSavingInline(false)
    }
  }

  // Live Broadsheet Recalculation (Total, Avg %, Grade A*-F, Rank, Status) when typing inline drafts
  const computedBroadsheetStudents = React.useMemo<BroadsheetStudentRow[]>(() => {
    const list = broadsheet?.students ?? []
    const termExams = broadsheet?.exams ?? []
    const hasDrafts = Object.keys(inlineDrafts).length > 0

    const mapped = list.map((row) => {
      const normalizedCode = formatStudentIdentifier(
        row.student_code ?? row.unique_code,
        row.student_id
      )
      if (!hasDrafts || termExams.length === 0) {
        return { ...row, unique_code: normalizedCode }
      }

      let totalObtained = 0
      let totalMax = 0
      let examsTaken = 0
      let allPassed = true

      for (const exam of termExams) {
        const draftKey = `${exam.id}:${row.student_id}`
        const cell = row.marks_by_exam[String(exam.id)]
        const rawDraft = draftKey in inlineDrafts ? inlineDrafts[draftKey] : undefined
        const maxVal = Number(exam.max_marks)
        const passVal = Number(exam.pass_marks)

        if (rawDraft !== undefined) {
          const trimmed = rawDraft.trim()
          if (trimmed !== "") {
            const num = Number(trimmed)
            if (!Number.isNaN(num) && num >= 0 && maxVal > 0) {
              examsTaken += 1
              totalObtained += num
              totalMax += maxVal
              if (num < passVal) {
                allPassed = false
              }
            }
          }
          continue
        }

        if (cell && cell.marks_obtained != null) {
          examsTaken += 1
          totalObtained += Number(cell.marks_obtained)
          totalMax += maxVal
          if (!cell.passed) {
            allPassed = false
          }
        }
      }

      if (examsTaken === 0 || totalMax <= 0) {
        return {
          ...row,
          unique_code: normalizedCode,
          total_marks_obtained: null,
          total_max_marks: null,
          exams_taken: 0,
          average_percentage: null,
          letter_grade: null,
          pass_fail_status: "PENDING" as ExamPassFailStatus,
          rank: null,
        }
      }

      const avgPct = (totalObtained / totalMax) * 100
      const roundedAvg = roundTwo(avgPct)
      const grade = previewGrade(totalObtained, totalMax, false)
      const pfStatus: ExamPassFailStatus =
        allPassed && Number(roundedAvg) >= 50 ? "PASS" : "FAIL"

      return {
        ...row,
        unique_code: normalizedCode,
        total_marks_obtained: roundTwo(totalObtained),
        total_max_marks: roundTwo(totalMax),
        exams_taken: examsTaken,
        average_percentage: roundedAvg,
        letter_grade: grade,
        pass_fail_status: pfStatus,
        rank: null,
      }
    })

    if (!hasDrafts) return mapped

    const graded = mapped
      .filter((r) => r.average_percentage != null)
      .sort((a, b) => {
        const avgDiff = Number(b.average_percentage) - Number(a.average_percentage)
        if (avgDiff !== 0) return avgDiff
        const totDiff = Number(b.total_marks_obtained ?? 0) - Number(a.total_marks_obtained ?? 0)
        if (totDiff !== 0) return totDiff
        return a.name.localeCompare(b.name)
      })

    let prevScore = ""
    let prevRank = 0
    const rankMap = new Map<number, number>()
    graded.forEach((r, idx) => {
      const scoreKey = `${r.average_percentage}|${r.total_marks_obtained}`
      if (scoreKey !== prevScore) {
        prevRank = idx + 1
        prevScore = scoreKey
      }
      rankMap.set(r.student_id, prevRank)
    })

    return mapped.map((r) => ({
      ...r,
      rank: rankMap.get(r.student_id) ?? null,
    }))
  }, [broadsheet?.students, broadsheet?.exams, inlineDrafts])

  // Filtered Broadsheet Rows
  const filteredBroadsheetStudents = React.useMemo<BroadsheetStudentRow[]>(() => {
    const q = broadsheetSearch.trim().toLowerCase()
    return computedBroadsheetStudents.filter((row) => {
      if (statusFilter !== "ALL" && row.pass_fail_status !== statusFilter) {
        return false
      }
      if (!q) return true
      return (
        row.name.toLowerCase().includes(q) ||
        row.unique_code.toLowerCase().includes(q) ||
        (row.exam_candidate_number ?? "").toLowerCase().includes(q)
      )
    })
  }, [computedBroadsheetStudents, broadsheetSearch, statusFilter])

  // Filtered Schedule Exams
  const filteredExams = React.useMemo(() => {
    const q = scheduleSearch.trim().toLowerCase()
    return exams.filter((e) => {
      if (scheduleTermFilter !== "ALL" && e.term_type !== scheduleTermFilter) {
        return false
      }
      if (scheduleClassFilter !== "all" && String(e.class_obj) !== scheduleClassFilter) {
        return false
      }
      if (!q) return true
      return (
        e.subject_name.toLowerCase().includes(q) ||
        e.class_label.toLowerCase().includes(q) ||
        e.room.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q)
      )
    })
  }, [exams, scheduleTermFilter, scheduleClassFilter, scheduleSearch])

  const handleExportBroadsheetCsv = () => {
    if (!broadsheet) return
    const rows = filteredBroadsheetStudents.map((st) => {
      const record: Record<string, unknown> = {
        Rank: st.rank ?? "—",
        Identifier: formatStudentIdentifier(st.student_code ?? st.unique_code, st.student_id),
        Student: st.name,
      }
      for (const exam of broadsheet.exams) {
        const cell = st.marks_by_exam[String(exam.id)]
        record[`${exam.subject_name} (/${exam.max_marks})`] =
          cell?.marks_obtained ?? (cell?.is_absent ? "ABS" : "")
      }
      record["Total Marks"] = st.total_marks_obtained ?? ""
      record["Total Max"] = st.total_max_marks ?? ""
      record["Average %"] = st.average_percentage ?? ""
      record["Grade"] = st.letter_grade ?? ""
      record["Status"] = st.pass_fail_status
      return record
    })
    downloadCsv(
      `broadsheet-${broadsheet.class_obj.label}-${broadsheet.term.name}.csv`,
      rows
    )
  }

  const isBroadsheetBootstrapping =
    !isLoaded ||
    yearsLoading ||
    classesQuery.isLoading ||
    broadsheetLoading ||
    (years.length > 0 && Boolean(activeTerm) && Boolean(selectedClassId) && broadsheet === null)

  const isExamsBootstrapping = !isLoaded || yearsLoading || examsLoading

  const passRateNum =
    broadsheet?.summary.pass_rate != null ? Number(broadsheet.summary.pass_rate) : null

  return (
    <div className="min-w-0 max-w-full space-y-4 p-4 sm:p-6">
      {/* 1. Tactical Industrial SystemHeader */}
      <SystemHeader
        domain="ACADEMICS"
        breadcrumb="EXAM TRACKING & BROADSHEET"
        title="Midterm & Final Exam Ledger"
        description="Formal Midterm & Final Term exam scheduling, cohort class result broadsheets, bulk mark entry, and parent portal preview."
        metrics={[
          {
            label: "ENROLLED",
            value: broadsheet?.summary.enrolled_count ?? 0,
          },
          {
            label: "EXAMS SCHEDULED",
            value: broadsheet?.summary.exams_scheduled_count ?? exams.length,
          },
          {
            label: "CLASS AVG",
            value:
              broadsheet?.summary.class_average_percentage != null
                ? `${broadsheet.summary.class_average_percentage}%`
                : "—",
          },
          {
            label: "PASS RATE",
            value: passRateNum != null ? `${broadsheet?.summary.pass_rate}%` : "—",
            tone:
              passRateNum == null
                ? "default"
                : passRateNum >= 75
                  ? "success"
                  : passRateNum >= 50
                    ? "warning"
                    : "destructive",
          },
        ]}
        tabs={[
          {
            id: "broadsheet",
            label: "School Broadsheet",
            count: broadsheet?.summary.enrolled_count ?? 0,
          },
          {
            id: "schedule",
            label: "Exam Schedule & Terms",
            count: exams.length,
          },
          {
            id: "parent",
            label: "Parent View Preview",
          },
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {activeTerm && (
              <Button
                variant={activeTerm.is_published ? "outline" : "default"}
                size="sm"
                disabled={togglingTermId === activeTerm.id}
                onClick={() => void handleToggleTermPublish(activeTerm)}
                className="shrink-0 rounded-sm font-mono text-xs uppercase"
              >
                {togglingTermId === activeTerm.id ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Eye className="mr-1.5 size-3.5" />
                )}
                {activeTerm.is_published
                  ? `${activeTerm.name}: Published`
                  : `Publish ${activeTerm.name}`}
              </Button>
            )}
            <Button
              size="sm"
              onClick={openNewExamSheet}
              disabled={!selectedYear}
              className="shrink-0 rounded-sm font-mono text-xs uppercase shadow-none"
            >
              <Plus className="mr-1.5 size-3.5" />
              Schedule Exam
            </Button>
            <Link
              href="/classes"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "shrink-0 rounded-sm font-mono text-xs uppercase"
              )}
            >
              <Layers className="mr-1.5 size-3.5" />
              Cohorts & Subjects
              <ExternalLink className="ml-1.5 size-3" />
            </Link>
          </div>
        }
      />

      {/* 2. Operational Policy Callout Banner */}
      <div className="flex items-start gap-2.5 rounded-sm border border-border bg-muted/25 px-3.5 py-2.5 font-mono text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-foreground" />
        <div className="leading-relaxed">
          <span className="font-semibold uppercase tracking-wider text-foreground">
            Exam & Publication Policy:
          </span>{" "}
          Each Academic Year provisions fixed{" "}
          <span className="font-bold text-foreground">Midterm</span> and{" "}
          <span className="font-bold text-foreground">Final Term</span> exam periods. Same-cohort
          time overlaps are blocked on schedule save. Toggle{" "}
          <span className="font-bold text-foreground">is_published</span> per term to release
          marks and remarks to the Parent Results Portal.
        </div>
      </div>

      {/* Empty Academic Year Guard */}
      {!yearsLoading && years.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border bg-card px-6 py-10 text-center">
          <GraduationCap className="mb-2 size-7 text-foreground" />
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
            No Academic Years Configured
          </p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            Create an Academic Year (e.g. 2026-2027) to automatically generate its Midterm and Final Term exam containers.
          </p>
          <Button
            size="sm"
            onClick={openCreateYearSheet}
            className="mt-4 rounded-sm font-mono text-xs uppercase"
          >
            <Plus className="mr-1.5 size-3.5" />
            Create Academic Year
          </Button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 1: SCHOOL VIEW (CLASS RESULTS BROADSHEET)                         */}
      {/* ===================================================================== */}
      {activeTab === "broadsheet" && (yearsLoading || years.length > 0) && (
        <DataModule
          searchPlaceholder="Filter broadsheet by student name or SPD26-... code..."
          searchValue={broadsheetSearch}
          onSearchChange={setBroadsheetSearch}
          filters={
            <>
              {/* Academic Year Picker + Create Year Button */}
              <div className="flex shrink-0 items-center gap-1">
                <Select
                  value={selectedYearId}
                  onValueChange={(val) => {
                    if (val) setSelectedYearId(val)
                  }}
                >
                  <SelectTrigger className="h-8 w-36 shrink-0 rounded-sm border-border bg-background font-mono text-xs">
                    <span className="truncate">
                      {selectedYear?.name ?? "Academic Year"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.id} value={String(y.id)} className="font-mono text-xs">
                        {y.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={openCreateYearSheet}
                  title="Create Academic Year"
                  className="h-8 shrink-0 rounded-sm px-2 font-mono text-[11px]"
                >
                  <Plus className="size-3.5" />
                </Button>
                {selectedYear && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setDeleteYearTarget(selectedYear)}
                    title={`Delete Academic Year ${selectedYear.name}`}
                    className="h-8 shrink-0 rounded-sm px-2 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>

              {/* Fixed Term Switcher (Midterm / Final Term) */}
              <div className="inline-flex shrink-0 items-center gap-0.5 rounded-[2px] border border-border bg-muted/40 p-0.5">
                {(
                  [
                    { id: "midterm", label: "MIDTERM" },
                    { id: "final", label: "FINAL TERM" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTermType(t.id)}
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-[2px] px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase transition-colors",
                      selectedTermType === t.id
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Term Publish Indicator */}
              {activeTerm && (
                <TelemetryTag
                  status={activeTerm.is_published ? "present" : "neutral"}
                  className="shrink-0"
                >
                  {activeTerm.is_published ? "PUBLISHED" : "UNPUBLISHED"}
                </TelemetryTag>
              )}

              {/* Cohort / Class Selector */}
              <Select
                value={selectedClassId}
                onValueChange={(val) => {
                  if (val) setSelectedClassId(val)
                }}
              >
                <SelectTrigger className="h-8 min-w-[180px] shrink-0 rounded-sm border-border bg-background font-mono text-xs">
                  <span className="truncate">
                    {classes.find((c) => String(c.id) === selectedClassId)
                      ? formatCohortIdentifier(
                          classes.find((c) => String(c.id) === selectedClassId)!
                        )
                      : "Select Cohort..."}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="font-mono text-xs">
                      {formatCohortIdentifier(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Pass/Fail Segment Filter */}
              <div className="inline-flex shrink-0 items-center gap-0.5 rounded-[2px] border border-border bg-muted/40 p-0.5">
                {(["ALL", "PASS", "FAIL", "PENDING"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-[2px] px-2 py-0.5 font-mono text-[11px] font-semibold uppercase transition-colors",
                      statusFilter === st
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </>
          }
          toolbarRight={
            <div className="flex flex-wrap items-center gap-2">
              {inlineDirtyCount > 0 && (
                <>
                  <Button
                    size="xs"
                    onClick={() => void handleSaveInlineMarks()}
                    disabled={savingInline}
                    className="h-7 shrink-0 rounded-sm px-2.5 font-mono text-[11px] uppercase"
                  >
                    {savingInline ? (
                      <Loader2 className="mr-1 size-3 animate-spin" />
                    ) : (
                      <Save className="mr-1 size-3" />
                    )}
                    Save Inline ({inlineDirtyCount})
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setInlineDrafts({})
                      setEditingRowStudentId(null)
                    }}
                    className="h-7 shrink-0 rounded-sm px-2 font-mono text-[11px] uppercase"
                  >
                    Discard
                  </Button>
                </>
              )}

              <Button
                variant="default"
                size="xs"
                onClick={() => {
                  if (broadsheet && broadsheet.exams.length > 0) {
                    void openBulkMarksForExam(broadsheet.exams[0].id)
                  } else {
                    openNewExamSheet()
                  }
                }}
                disabled={isBroadsheetBootstrapping || !activeTerm || !selectedClassId}
                className="h-7 shrink-0 rounded-sm font-mono text-[11px] uppercase shadow-none"
              >
                <Pencil className="mr-1 size-3" />
                Enter Marks
              </Button>

              <Button
                variant={inlineEditMode ? "secondary" : "outline"}
                size="xs"
                onClick={() => {
                  setInlineEditMode((prev) => !prev)
                  setEditingRowStudentId(null)
                  setInlineDrafts({})
                }}
                disabled={isBroadsheetBootstrapping || !broadsheet || broadsheet.exams.length === 0}
                className="h-7 shrink-0 rounded-sm font-mono text-[11px] uppercase"
              >
                <ClipboardEdit className="mr-1 size-3" />
                {inlineEditMode ? "Exit Inline Grid" : "Inline Grid"}
              </Button>

              <Button
                variant="outline"
                size="xs"
                onClick={handleExportBroadsheetCsv}
                disabled={isBroadsheetBootstrapping || !broadsheet || filteredBroadsheetStudents.length === 0}
                className="h-7 shrink-0 rounded-sm font-mono text-[11px] uppercase"
              >
                <Download className="mr-1 size-3" />
                CSV
              </Button>

              <Button
                variant="outline"
                size="xs"
                onClick={() => void loadBroadsheet()}
                disabled={isBroadsheetBootstrapping}
                className="h-7 shrink-0 rounded-sm font-mono text-[11px] uppercase"
              >
                <RotateCcw
                  className={cn("mr-1 size-3", isBroadsheetBootstrapping && "animate-spin")}
                />
                Refresh
              </Button>
            </div>
          }
          totalCount={filteredBroadsheetStudents.length}
          countLabel="STUDENTS IN COHORT BROADSHEET"
        >
          {!isBroadsheetBootstrapping && broadsheet && broadsheet.exams.length === 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                <div className="space-y-0.5 font-mono text-xs">
                  <p className="font-semibold uppercase tracking-wider text-foreground">
                    No Exams Scheduled for {broadsheet.class_obj.label} — {broadsheet.term.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    EXAMS SCHEDULED is currently 0 for this cohort and term. Schedule subject exams to populate dynamic score columns and enable bulk mark entry.
                  </p>
                </div>
              </div>
              <Button
                size="xs"
                onClick={openNewExamSheet}
                className="h-7 shrink-0 rounded-sm font-mono text-[11px] uppercase shadow-none"
              >
                <Plus className="mr-1 size-3" />
                Schedule Exam
              </Button>
            </div>
          )}

          <div className="w-full max-w-full overflow-x-auto pb-2 custom-scrollbar">
            <Table
              className="min-w-[900px]"
              style={{
                minWidth: `${Math.max(900, 380 + Math.max(1, broadsheet?.exams.length ?? 0) * 140 + 340)}px`,
              }}
            >
              <TableHeader>
                <TableRow className="h-10 bg-muted/20 hover:bg-muted/20">
                  <TableHead className="w-[120px] min-w-[120px] px-3.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Identifier
                  </TableHead>
                  <TableHead className="min-w-[180px] md:sticky md:left-0 z-20 bg-zinc-950 border-r border-border/60 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Student Name
                  </TableHead>
                  <TableHead className="w-16 px-3.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Rank
                  </TableHead>
                {broadsheet && broadsheet.exams.length > 0 ? (
                  broadsheet.exams.map((exam) => (
                    <TableHead
                      key={exam.id}
                      className="min-w-[135px] font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      <button
                        type="button"
                        onClick={() => void openBulkMarksForExam(exam.id)}
                        title="Click to bulk enter marks for this exam"
                        className="flex flex-col items-start text-left transition-colors hover:text-foreground"
                      >
                        <span className="flex items-center gap-1 text-foreground">
                          {exam.subject_name}
                          <Pencil className="size-2.5 text-muted-foreground" />
                        </span>
                        <span className="text-[10px] font-normal text-muted-foreground">
                          /{exam.max_marks} · {exam.exam_date}
                        </span>
                      </button>
                    </TableHead>
                  ))
                ) : (
                  <TableHead className="min-w-[180px] font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Subject Exams
                  </TableHead>
                )}
                <TableHead className="text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total
                </TableHead>
                <TableHead className="text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Avg %
                </TableHead>
                <TableHead className="text-center font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Grade
                </TableHead>
                <TableHead className="text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="w-16 text-right pr-3.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Edit
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isBroadsheetBootstrapping ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={idx} className="h-11">
                    <TableCell
                      colSpan={8 + Math.max(1, broadsheet?.exams.length ?? 0)}
                      className="px-3.5"
                    >
                      <div className="h-4 w-full rounded-sm skeleton-shimmer" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredBroadsheetStudents.length === 0 ? (
                <TableRow className="h-24">
                  <TableCell
                    colSpan={8 + Math.max(1, broadsheet?.exams.length ?? 0)}
                    className="text-center font-mono text-xs text-muted-foreground"
                  >
                    No students match the current cohort/status filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBroadsheetStudents.map((row) => {
                  const rowEditable = inlineEditMode || editingRowStudentId === row.student_id
                  const rowExams = broadsheet?.exams ?? []
                  return (
                    <TableRow key={row.student_id} className="h-11 hover:bg-muted/30">
                      <TableCell className="w-[120px] min-w-[120px] px-3.5 font-mono">
                        <CodeChip accent>
                          {formatStudentIdentifier(row.student_code ?? row.unique_code, row.student_id)}
                        </CodeChip>
                      </TableCell>
                      <TableCell className="min-w-[180px] md:sticky md:left-0 z-10 bg-zinc-950 border-r border-border/60 text-xs font-semibold text-foreground">
                        {row.name}
                      </TableCell>
                      <TableCell className="px-3.5 font-mono text-xs font-bold tabular-nums text-foreground">
                        {row.rank != null ? `#${row.rank}` : "—"}
                      </TableCell>
                      {rowExams.length > 0 ? (
                        rowExams.map((exam) => {
                          const cell = row.marks_by_exam[String(exam.id)]
                          const draftKey = `${exam.id}:${row.student_id}`
                          const hasDraft = draftKey in inlineDrafts
                          const displayVal = hasDraft
                            ? inlineDrafts[draftKey]
                            : (cell?.marks_obtained ?? "")

                          if (rowEditable) {
                            return (
                              <TableCell key={exam.id}>
                                <Input
                                  type="number"
                                  min="0"
                                  max={exam.max_marks}
                                  step="0.5"
                                  value={displayVal}
                                  placeholder="—"
                                  onChange={(e) => {
                                    const val = e.target.value
                                    setInlineDrafts((prev) => ({
                                      ...prev,
                                      [draftKey]: val,
                                    }))
                                  }}
                                  className={cn(
                                    "h-7 w-24 rounded-sm bg-background font-mono text-xs tabular-nums",
                                    hasDraft && "border-warning ring-1 ring-warning"
                                  )}
                                />
                              </TableCell>
                            )
                          }

                          return (
                            <TableCell key={exam.id}>
                              {cell && cell.marks_obtained != null ? (
                                <button
                                  type="button"
                                  title="Click to edit score inline or use subject header for bulk modal"
                                  onClick={() => setEditingRowStudentId(row.student_id)}
                                  className="inline-flex items-center gap-1.5 rounded-[2px] px-1.5 py-0.5 font-mono text-xs tabular-nums transition-colors hover:bg-muted"
                                >
                                  <span
                                    className={cn(
                                      "font-semibold",
                                      cell.passed ? "text-foreground" : "text-destructive"
                                    )}
                                  >
                                    {cell.is_absent ? "ABS" : cell.marks_obtained}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {cell.grade}
                                  </span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  title="Click to enter score inline"
                                  onClick={() => setEditingRowStudentId(row.student_id)}
                                  className="rounded-[2px] px-1.5 py-0.5 font-mono text-xs text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                                >
                                  —
                                </button>
                              )}
                            </TableCell>
                          )
                        })
                      ) : (
                        <TableCell className="font-mono text-[11px] text-muted-foreground/70">
                          No exams scheduled
                        </TableCell>
                      )}
                      <TableCell className="text-right font-mono text-xs font-semibold tabular-nums text-foreground">
                        {row.total_marks_obtained != null
                          ? `${row.total_marks_obtained} / ${row.total_max_marks}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold tabular-nums text-foreground">
                        {row.average_percentage != null
                          ? `${row.average_percentage}%`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.letter_grade ? (
                          <CodeChip accent>{row.letter_grade}</CodeChip>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <TelemetryTag status={statusToTelemetry(row.pass_fail_status)}>
                          {row.pass_fail_status}
                        </TelemetryTag>
                      </TableCell>
                      <TableCell className="text-right pr-3.5">
                        {rowExams.length > 0 ? (
                          rowEditable ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              disabled={savingInline}
                              onClick={() => {
                                if (inlineDirtyCount > 0) {
                                  void handleSaveInlineMarks()
                                } else {
                                  setEditingRowStudentId(null)
                                }
                              }}
                              title="Save row marks"
                              className="h-7 rounded-sm px-2 font-mono text-[10px] uppercase"
                            >
                              {savingInline ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Save className="size-3" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => setEditingRowStudentId(row.student_id)}
                              title={`Inline edit marks for ${row.name}`}
                              className="h-7 rounded-sm px-2 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="size-3" />
                            </Button>
                          )
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
            </Table>
          </div>
        </DataModule>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: EXAM SCHEDULE & FIXED TERMS MANAGEMENT                         */}
      {/* ===================================================================== */}
      {activeTab === "schedule" && (
        <div className="min-w-0 max-w-full space-y-4">
          {/* Academic Year & Fixed Term Publication Controls */}
          <div className="rounded-sm border border-border bg-card p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  ACADEMIC YEAR //
                </span>
                <Select
                  value={selectedYearId}
                  onValueChange={(val) => {
                    if (val) setSelectedYearId(val)
                  }}
                >
                  <SelectTrigger className="h-8 w-44 shrink-0 rounded-sm border-border bg-background font-mono text-xs">
                    <span className="truncate">
                      {selectedYear?.name ?? "Select Academic Year"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.id} value={String(y.id)} className="font-mono text-xs">
                        {y.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedYear && (
                  <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                    {selectedYear.start_date} → {selectedYear.end_date}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedYear && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setDeleteYearTarget(selectedYear)}
                    title={`Delete Academic Year ${selectedYear.name}`}
                    className="h-8 shrink-0 rounded-sm px-2.5 font-mono text-[11px] uppercase text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="mr-1 size-3" />
                    Delete Year
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="xs"
                  onClick={openCreateYearSheet}
                  className="h-8 shrink-0 rounded-sm font-mono text-[11px] uppercase"
                >
                  <Plus className="mr-1 size-3" />
                  New Academic Year
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {[midtermTerm, finalTerm].map((term, idx) => {
                if (!term) return null
                const termExamCount = exams.filter((e) => e.term === term.id).length
                return (
                  <div
                    key={term.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-muted/20 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                          TERM 0{idx + 1} // {term.name}
                        </span>
                        <TelemetryTag status={term.is_published ? "present" : "neutral"}>
                          {term.is_published ? "PUBLISHED" : "UNPUBLISHED"}
                        </TelemetryTag>
                      </div>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {termExamCount} exam{termExamCount === 1 ? "" : "s"} scheduled ·{" "}
                        {term.is_published
                          ? "Visible to parents in Parent Portal"
                          : "Withheld from Parent Portal"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="whitespace-nowrap font-mono text-[10px] uppercase text-muted-foreground">
                        Parent Visible
                      </span>
                      <Switch
                        checked={term.is_published}
                        disabled={togglingTermId === term.id}
                        onCheckedChange={() => void handleToggleTermPublish(term)}
                        aria-label={`Toggle ${term.name} publication`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Exam Schedule DataModule */}
          <DataModule
            searchPlaceholder="Filter exams by subject, cohort, or room..."
            searchValue={scheduleSearch}
            onSearchChange={setScheduleSearch}
            filters={
              <>
                <div className="inline-flex shrink-0 items-center gap-0.5 rounded-[2px] border border-border bg-muted/40 p-0.5">
                  {(
                    [
                      { id: "ALL", label: "ALL TERMS" },
                      { id: "midterm", label: "MIDTERM" },
                      { id: "final", label: "FINAL TERM" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setScheduleTermFilter(opt.id)}
                      className={cn(
                        "shrink-0 whitespace-nowrap rounded-[2px] px-2 py-0.5 font-mono text-[11px] font-semibold uppercase transition-colors",
                        scheduleTermFilter === opt.id
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <Select
                  value={scheduleClassFilter}
                  onValueChange={(val) => setScheduleClassFilter(val ?? "all")}
                >
                  <SelectTrigger className="h-8 w-44 shrink-0 rounded-sm border-border bg-background font-mono text-xs">
                    <span className="truncate">
                      {scheduleClassFilter === "all"
                        ? "All Cohorts"
                        : formatCohortIdentifier(
                            classes.find((c) => String(c.id) === scheduleClassFilter)!
                          )}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="all" className="font-mono text-xs">
                      All Cohorts
                    </SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} className="font-mono text-xs">
                        {formatCohortIdentifier(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            }
            toolbarRight={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="xs"
                  onClick={openNewExamSheet}
                  disabled={!selectedYear}
                  className="h-7 shrink-0 rounded-sm font-mono text-[11px] uppercase"
                >
                  <Plus className="mr-1 size-3" />
                  Schedule Exam
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => void loadExams()}
                  disabled={examsLoading}
                  className="h-7 shrink-0 rounded-sm font-mono text-[11px] uppercase"
                >
                  <RotateCcw
                    className={cn("mr-1 size-3", examsLoading && "animate-spin")}
                  />
                  Refresh
                </Button>
              </div>
            }
            totalCount={filteredExams.length}
            countLabel="SCHEDULED EXAMS"
          >
            <div className="w-full max-w-full overflow-x-auto pb-2 custom-scrollbar">
              <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="h-9 bg-muted/20 hover:bg-muted/20">
                  <TableHead className="px-3.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Exam Date
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Time Window
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Term
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Cohort
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Subject
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Room
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Max / Pass
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Graded
                  </TableHead>
                  <TableHead className="text-right pr-3.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isExamsBootstrapping ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="h-10">
                      <TableCell colSpan={9} className="px-3.5">
                        <div className="h-4 w-full rounded-sm skeleton-shimmer" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredExams.length === 0 ? (
                  <TableRow className="h-24">
                    <TableCell
                      colSpan={9}
                      className="text-center font-mono text-xs text-muted-foreground"
                    >
                      No exams scheduled for the current selection.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExams.map((exam) => (
                    <TableRow key={exam.id} className="h-10 hover:bg-muted/30">
                      <TableCell className="px-3.5 font-mono text-xs font-semibold tabular-nums text-foreground">
                        {exam.exam_date}
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                        {exam.start_time.slice(0, 5)} – {exam.end_time.slice(0, 5)}
                      </TableCell>
                      <TableCell>
                        <TelemetryTag
                          status={exam.term_type === "midterm" ? "info" : "active"}
                        >
                          {exam.term_name}
                        </TelemetryTag>
                      </TableCell>
                      <TableCell>
                        <CodeChip accent>{exam.class_label}</CodeChip>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {exam.subject_name}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {exam.room || "TBA"}
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-foreground">
                        {exam.max_marks} / {exam.pass_marks}
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                        {exam.results_count}
                      </TableCell>
                      <TableCell className="text-right pr-3.5">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="default"
                            size="xs"
                            onClick={() => void openBulkMarksForExam(exam.id)}
                            className="h-7 rounded-sm px-2 font-mono text-[11px] uppercase"
                          >
                            <ClipboardEdit className="mr-1 size-3" />
                            Marks
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => openEditExamSheet(exam)}
                            className="h-7 rounded-sm px-2 font-mono text-[11px]"
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setDeleteExamTarget(exam)}
                            className="h-7 rounded-sm px-2 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </DataModule>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: PARENT PORTAL PREVIEW                                          */}
      {/* ===================================================================== */}
      {activeTab === "parent" && <ParentPortalWorkspace embedded />}

      {/* ===================================================================== */}
      {/* INSPECTOR SHEET 1: CREATE ACADEMIC YEAR                               */}
      {/* ===================================================================== */}
      <InspectorSheet
        open={yearSheetOpen}
        onOpenChange={setYearSheetOpen}
        code="ACADEMIC YEAR"
        title="Create Academic Year"
        subtitle="Automatically provisions fixed Midterm and Final Term exam containers."
        footerActions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setYearSheetOpen(false)}
              className="rounded-sm font-mono text-xs uppercase"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              form="create-year-form"
              type="submit"
              disabled={savingYear || yearConflicts.length > 0}
              className="rounded-sm font-mono text-xs uppercase"
            >
              {savingYear && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Create Year & Terms
            </Button>
          </>
        }
      >
        <form id="create-year-form" onSubmit={handleCreateYear} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Academic Year Label
            </label>
            <Input
              required
              value={yearName}
              onChange={(e) => handleYearNameChange(e.target.value)}
              placeholder="e.g. 2027-2028"
              className="h-9 rounded-sm font-mono text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Start Date
              </label>
              <Input
                type="date"
                required
                value={yearStart}
                onChange={(e) => handleYearStartChange(e.target.value)}
                className="h-9 rounded-sm font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                End Date
              </label>
              <Input
                type="date"
                required
                value={yearEnd}
                onChange={(e) => setYearEnd(e.target.value)}
                className="h-9 rounded-sm font-mono text-xs"
              />
            </div>
          </div>

          {yearConflicts.length > 0 ? (
            <div className="space-y-1.5 rounded-sm border border-destructive/40 bg-destructive/10 p-3 font-mono text-xs text-destructive">
              <div className="flex items-center gap-1.5 font-bold uppercase">
                <AlertTriangle className="size-3.5" />
                Academic Year Conflict
              </div>
              {yearConflicts.map((msg) => (
                <p key={msg} className="leading-snug">
                  {msg}
                </p>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-sm border border-success/30 bg-success/10 p-2.5 font-mono text-xs text-success">
              <CheckCircle2 className="size-3.5 shrink-0" />
              Valid consecutive Academic Year window without date overlaps.
            </div>
          )}

          <div className="rounded-sm border border-border bg-muted/25 p-3 font-mono text-[11px] text-muted-foreground">
            Creating this record automatically initializes{" "}
            <strong className="text-foreground">Term 1: Midterm</strong> and{" "}
            <strong className="text-foreground">Term 2: Final Term</strong> (both initially
            unpublished).
          </div>
        </form>
      </InspectorSheet>

      {/* ===================================================================== */}
      {/* INSPECTOR SHEET 2: SCHEDULE / EDIT EXAM WITH CONFLICT DETECTION       */}
      {/* ===================================================================== */}
      <InspectorSheet
        open={examSheetOpen}
        onOpenChange={setExamSheetOpen}
        code={editingExam ? `EXAM #${editingExam.id}` : "NEW EXAM"}
        title={editingExam ? "Edit Scheduled Exam" : "Schedule Formal Exam"}
        subtitle="Assign to Midterm or Final Term with automatic cohort overlap validation."
        footerActions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExamSheetOpen(false)}
              className="rounded-sm font-mono text-xs uppercase"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              form="exam-schedule-form"
              type="submit"
              disabled={
                savingExam ||
                examDateOutOfRange ||
                Boolean(conflictCheck?.has_conflicts)
              }
              className="rounded-sm font-mono text-xs uppercase"
            >
              {savingExam && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              {editingExam ? "Save Changes" : "Schedule Exam"}
            </Button>
          </>
        }
      >
        <form id="exam-schedule-form" onSubmit={handleSaveExam} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Fixed Exam Term
            </label>
            <Select value={examTermId} onValueChange={(v) => v && setExamTermId(v)}>
              <SelectTrigger className="h-9 rounded-sm font-mono text-xs">
                <span className="truncate">
                  {selectedYear?.terms.find((t) => String(t.id) === examTermId)?.name ??
                    "Select Term"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {(selectedYear?.terms ?? []).map((t) => (
                  <SelectItem key={t.id} value={String(t.id)} className="font-mono text-xs">
                    {selectedYear?.name} — {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Cohort / Class
              </label>
              <Select value={examClassId} onValueChange={(v) => v && setExamClassId(v)}>
                <SelectTrigger className="h-9 rounded-sm font-mono text-xs">
                  <span className="truncate">
                    {classes.find((c) => String(c.id) === examClassId)
                      ? formatCohortIdentifier(
                          classes.find((c) => String(c.id) === examClassId)!
                        )
                      : "Select Cohort"}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="font-mono text-xs">
                      {formatCohortIdentifier(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Subject
              </label>
              <Select value={examSubjectId} onValueChange={(v) => v && setExamSubjectId(v)}>
                <SelectTrigger className="h-9 rounded-sm font-mono text-xs">
                  <span className="truncate">
                    {subjects.find((s) => String(s.id) === examSubjectId)?.name ??
                      "Select Subject"}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)} className="font-mono text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Exam Date
              </label>
              <Input
                type="date"
                required
                min={selectedYear?.start_date}
                max={selectedYear?.end_date}
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="h-9 rounded-sm font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Start Time
              </label>
              <Input
                type="time"
                required
                value={examStartTime}
                onChange={(e) => setExamStartTime(e.target.value)}
                className="h-9 rounded-sm font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                End Time
              </label>
              <Input
                type="time"
                required
                value={examEndTime}
                onChange={(e) => setExamEndTime(e.target.value)}
                className="h-9 rounded-sm font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Room
              </label>
              <Input
                value={examRoom}
                onChange={(e) => setExamRoom(e.target.value)}
                placeholder="HALL-101"
                className="h-9 rounded-sm font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Max Marks
              </label>
              <Input
                type="number"
                min="1"
                step="0.5"
                required
                value={examMaxMarks}
                onChange={(e) => setExamMaxMarks(e.target.value)}
                className="h-9 rounded-sm font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pass Marks
              </label>
              <Input
                type="number"
                min="0"
                step="0.5"
                required
                value={examPassMarks}
                onChange={(e) => setExamPassMarks(e.target.value)}
                className="h-9 rounded-sm font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Paper / Title (Optional)
            </label>
            <Input
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              placeholder="Auto-generated if left blank"
              className="h-9 rounded-sm text-xs"
            />
          </div>

          {/* Conflict Detection Callout */}
          {examDateOutOfRange && selectedYear ? (
            <div className="space-y-1.5 rounded-sm border border-destructive/40 bg-destructive/10 p-3 font-mono text-xs text-destructive">
              <div className="flex items-center gap-1.5 font-bold uppercase">
                <AlertTriangle className="size-3.5" />
                Exam Date Out of Bounds
              </div>
              <p className="leading-snug">
                Exam date ({examDate}) must fall within Academic Year{" "}
                {selectedYear.name} ({selectedYear.start_date} →{" "}
                {selectedYear.end_date}).
              </p>
            </div>
          ) : checkingConflict ? (
            <div className="flex items-center gap-2 rounded-sm border border-border bg-muted/25 p-2.5 font-mono text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Checking cohort exam conflicts...
            </div>
          ) : conflictCheck?.has_conflicts ? (
            <div className="space-y-1.5 rounded-sm border border-destructive/40 bg-destructive/10 p-3 font-mono text-xs text-destructive">
              <div className="flex items-center gap-1.5 font-bold uppercase">
                <AlertTriangle className="size-3.5" />
                Scheduling Conflict Blocked
              </div>
              {conflictCheck.cohort_conflicts.map((c) => (
                <p key={c.id} className="leading-snug">
                  {c.message}
                </p>
              ))}
            </div>
          ) : conflictCheck?.has_room_warnings ? (
            <div className="space-y-1.5 rounded-sm border border-warning/40 bg-warning/10 p-3 font-mono text-xs text-warning">
              <div className="flex items-center gap-1.5 font-bold uppercase">
                <AlertTriangle className="size-3.5" />
                Room Overlap Notice
              </div>
              {conflictCheck.room_conflicts.map((c) => (
                <p key={c.id} className="leading-snug">
                  {c.message}
                </p>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-sm border border-success/30 bg-success/10 p-2.5 font-mono text-xs text-success">
              <CheckCircle2 className="size-3.5" />
              No cohort overlap detected for this date and time window.
            </div>
          )}
        </form>
      </InspectorSheet>

      {/* ===================================================================== */}
      {/* INSPECTOR SHEET 3: BULK MARK ENTRY PER EXAM                           */}
      {/* ===================================================================== */}
      <InspectorSheet
        open={marksSheetOpen}
        onOpenChange={setMarksSheetOpen}
        code={marksExam ? marksExam.class_label : "MARKS"}
        title={marksExam ? `Bulk Marks // ${marksExam.subject_name}` : "Bulk Mark Entry"}
        subtitle={
          marksExam
            ? `${marksExam.term_name} · ${marksExam.exam_date} · Max ${marksExam.max_marks} (Pass ${marksExam.pass_marks})`
            : undefined
        }
        fields={
          marksExam
            ? [
                { label: "Cohort", value: marksExam.class_label, mono: true },
                { label: "Exam Date", value: marksExam.exam_date, mono: true },
                {
                  label: "Pass Threshold",
                  value: `${marksExam.pass_marks} / ${marksExam.max_marks}`,
                  mono: true,
                },
              ]
            : undefined
        }
        footerActions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMarksSheetOpen(false)}
              className="rounded-sm font-mono text-xs uppercase"
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSaveBulkMarks()}
              disabled={savingMarksSheet || loadingMarksSheet}
              className="rounded-sm font-mono text-xs uppercase"
            >
              {savingMarksSheet && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              <Save className="mr-1.5 size-3.5" />
              Save All Marks
            </Button>
          </>
        }
      >
        {broadsheet && broadsheet.exams.length > 1 && (
          <div className="mb-3 space-y-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Switch Scheduled Subject Exam
            </span>
            <div className="flex flex-wrap gap-1.5">
              {broadsheet.exams.map((ex) => {
                const active = marksExam?.id === ex.id
                return (
                  <button
                    key={ex.id}
                    type="button"
                    disabled={loadingMarksSheet || savingMarksSheet}
                    onClick={() => void openBulkMarksForExam(ex.id)}
                    className={cn(
                      "rounded-[2px] border px-2 py-1 font-mono text-[11px] font-semibold transition-colors",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {ex.subject_name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {loadingMarksSheet ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 w-full rounded-sm skeleton-shimmer" />
            ))}
          </div>
        ) : marksSheetRows.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border p-4 text-center font-mono text-xs text-muted-foreground">
            No students currently enrolled in this cohort.
          </div>
        ) : (
          <div className="space-y-2.5">
            {marksSheetRows.map((row, idx) => {
              const maxVal = Number(marksExam?.max_marks ?? 100)
              const passVal = Number(marksExam?.pass_marks ?? 50)
              const numericMarks = Number(row.marks_obtained)
              const hasScore = row.marks_obtained.trim() !== "" && !Number.isNaN(numericMarks)
              const passed = !row.is_absent && hasScore && numericMarks >= passVal
              const grade =
                row.is_absent || hasScore
                  ? previewGrade(hasScore ? numericMarks : 0, maxVal, row.is_absent)
                  : "—"

              return (
                <div
                  key={row.student_id}
                  className="space-y-2 rounded-sm border border-border bg-muted/20 p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CodeChip accent>{row.unique_code}</CodeChip>
                      <span className="truncate text-xs font-semibold text-foreground">
                        {row.name}
                      </span>
                    </div>
                    {hasScore || row.is_absent ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <CodeChip>{grade}</CodeChip>
                        <TelemetryTag status={passed ? "present" : "absent"}>
                          {row.is_absent ? "ABSENT" : passed ? "PASS" : "FAIL"}
                        </TelemetryTag>
                      </div>
                    ) : (
                      <TelemetryTag status="neutral" className="shrink-0">
                        PENDING
                      </TelemetryTag>
                    )}
                  </div>

                  <div className="grid grid-cols-[100px_auto_1fr] items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max={marksExam?.max_marks ?? "100"}
                      step="0.5"
                      disabled={row.is_absent}
                      value={row.is_absent ? "0" : row.marks_obtained}
                      placeholder={`/ ${marksExam?.max_marks ?? "100"}`}
                      onChange={(e) => {
                        const val = e.target.value
                        setMarksSheetRows((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, marks_obtained: val } : item
                          )
                        )
                      }}
                      className="h-8 rounded-sm bg-background font-mono text-xs tabular-nums"
                    />

                    <label className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-[11px] uppercase text-muted-foreground">
                      <Checkbox
                        checked={row.is_absent}
                        onCheckedChange={(checked) => {
                          const abs = checked === true
                          setMarksSheetRows((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? {
                                    ...item,
                                    is_absent: abs,
                                    marks_obtained: abs ? "0" : item.marks_obtained,
                                  }
                                : item
                            )
                          )
                        }}
                      />
                      ABS
                    </label>

                    <Input
                      value={row.remarks}
                      placeholder="Teacher remarks..."
                      onChange={(e) => {
                        const val = e.target.value
                        setMarksSheetRows((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, remarks: val } : item
                          )
                        )
                      }}
                      className="h-8 rounded-sm bg-background text-xs"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </InspectorSheet>

      {/* Delete Exam Confirmation */}
      <ConfirmDialog
        open={deleteExamTarget !== null}
        title="Delete Scheduled Exam"
        description={
          deleteExamTarget
            ? `Delete ${deleteExamTarget.subject_name} (${deleteExamTarget.class_label} · ${deleteExamTarget.term_name})? All recorded marks for this exam will be permanently removed.`
            : ""
        }
        onConfirm={handleDeleteExam}
        onCancel={() => setDeleteExamTarget(null)}
        loading={deletingExam}
      />

      {/* Delete Academic Year Confirmation */}
      <ConfirmDialog
        open={deleteYearTarget !== null}
        title="Delete Academic Year"
        description={
          deleteYearTarget
            ? `Delete Academic Year "${deleteYearTarget.name}" (${deleteYearTarget.start_date} → ${deleteYearTarget.end_date})? Its Midterm/Final Term containers and any scheduled exams will be permanently removed.`
            : ""
        }
        onConfirm={handleDeleteYear}
        onCancel={() => setDeleteYearTarget(null)}
        loading={deletingYear}
      />
    </div>
  )
}

export default function AcademicsPage() {
  return (
    <RequireRole mode="staff" skeleton={<AcademicsLoading />}>
      <AcademicsWorkspaceContent />
    </RequireRole>
  )
}
