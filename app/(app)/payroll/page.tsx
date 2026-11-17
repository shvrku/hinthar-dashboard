"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Banknote,
  Calculator,
  CheckCircle2,
  Clock,
  Download,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react"

import { ApiError, createApi } from "@/lib/api"
import { downloadCsv } from "@/lib/export-utils"
import { formatCohortIdentifier } from "@/lib/format-class"
import { useClassesQuery } from "@/hooks/use-api-queries"
import type {
  Teacher,
  TeacherPayout,
  TeacherPayoutStatus,
  TeacherRateCard,
  TeacherRateType,
} from "@/lib/types"
import { RequireRole } from "@/components/require-role"
import {
  CodeChip,
  DataModule,
  InspectorSheet,
  SystemHeader,
  TelemetryTag,
  type TelemetryStatus,
} from "@/components/design-system/v2-primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
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

function formatMoney(value: string | number | null | undefined, currency = "MMK"): string {
  const num = Number(value ?? 0)
  if (Number.isNaN(num)) return `0 ${currency}`
  return `${num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${currency}`
}

function payoutStatusTone(status: TeacherPayoutStatus): TelemetryStatus {
  if (status === "paid") return "present"
  if (status === "approved") return "info"
  return "late"
}

function currentMonthString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

interface OverrideDraftRow {
  class_obj_id: number
  class_label: string
  rate_per_session: string
  hourly_rate: string
}

function PayrollWorkspaceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const paramTab = searchParams.get("tab")
  const [activeTab, setActiveTab] = React.useState<string>(
    paramTab === "rates" ? "rates" : "payouts"
  )

  React.useEffect(() => {
    if (paramTab === "rates" || paramTab === "payouts") {
      setActiveTab(paramTab)
    }
  }, [paramTab])

  const handleTabChange = (nextTab: string) => {
    setActiveTab(nextTab)
    const params = new URLSearchParams(searchParams.toString())
    if (nextTab === "rates") {
      params.set("tab", "rates")
    } else {
      params.delete("tab")
    }
    const qs = params.toString()
    router.replace(qs ? `/payroll?${qs}` : "/payroll", { scroll: false })
  }

  const classesQuery = useClassesQuery(!!isLoaded && !!isSignedIn)
  const classes = classesQuery.data ?? []

  // Month & Filters
  const [selectedMonth, setSelectedMonth] = React.useState<string>(() => currentMonthString())
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | TeacherPayoutStatus>("ALL")
  const [payoutSearch, setPayoutSearch] = React.useState("")
  const [rateSearch, setRateSearch] = React.useState("")

  // Data state
  const [payouts, setPayouts] = React.useState<TeacherPayout[]>([])
  const [payoutsLoading, setPayoutsLoading] = React.useState(true)
  const [calculating, setCalculating] = React.useState(false)
  const [teachers, setTeachers] = React.useState<Teacher[]>([])
  const [rateCards, setRateCards] = React.useState<TeacherRateCard[]>([])
  const [ratesLoading, setRatesLoading] = React.useState(true)

  // Payout Drill-Down InspectorSheet
  const [inspectedPayout, setInspectedPayout] = React.useState<TeacherPayout | null>(null)
  const [bonusInput, setBonusInput] = React.useState("0")
  const [deductionInput, setDeductionInput] = React.useState("0")
  const [noteInput, setNoteInput] = React.useState("")
  const [savingAdjustment, setSavingAdjustment] = React.useState(false)
  const [transitioningId, setTransitioningId] = React.useState<number | null>(null)

  // Rate Card Config InspectorSheet
  const [rateSheetTeacher, setRateSheetTeacher] = React.useState<Teacher | null>(null)
  const [rateType, setRateType] = React.useState<TeacherRateType>("rate_per_session")
  const [basePerSession, setBasePerSession] = React.useState("0")
  const [baseHourly, setBaseHourly] = React.useState("0")
  const [currencyInput, setCurrencyInput] = React.useState("MMK")
  const [rateNotesInput, setRateNotesInput] = React.useState("")
  const [overrideRows, setOverrideRows] = React.useState<OverrideDraftRow[]>([])
  const [newOverrideClassId, setNewOverrideClassId] = React.useState("")
  const [newOverridePerSession, setNewOverridePerSession] = React.useState("")
  const [newOverrideHourly, setNewOverrideHourly] = React.useState("")
  const [savingRateCard, setSavingRateCard] = React.useState(false)

  const loadPayouts = React.useCallback(async () => {
    if (!isSignedIn) return
    setPayoutsLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await createApi(token).listTeacherPayouts({
        month: selectedMonth,
      })
      setPayouts(res)
      // Sync open drawer if inspectedPayout exists
      setInspectedPayout((prev) => {
        if (!prev) return null
        return res.find((p) => p.id === prev.id) ?? prev
      })
    } catch (err) {
      if (err instanceof ApiError) {
        toast.add({ title: err.userMessage, type: "error" })
      }
    } finally {
      setPayoutsLoading(false)
    }
  }, [getToken, isSignedIn, selectedMonth])

  const loadRatesAndTeachers = React.useCallback(async () => {
    if (!isSignedIn) return
    setRatesLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const api = createApi(token)
      const [tList, rcList] = await Promise.all([
        api.listTeachers(),
        api.listTeacherRateCards(),
      ])
      setTeachers(tList)
      setRateCards(rcList)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.add({ title: err.userMessage, type: "error" })
      }
    } finally {
      setRatesLoading(false)
    }
  }, [getToken, isSignedIn])

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      void loadPayouts()
    }
  }, [isLoaded, isSignedIn, loadPayouts])

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      void loadRatesAndTeachers()
    }
  }, [isLoaded, isSignedIn, loadRatesAndTeachers])

  const rateCardByTeacherId = React.useMemo(() => {
    const map = new Map<number, TeacherRateCard>()
    for (const rc of rateCards) {
      map.set(rc.teacher, rc)
    }
    return map
  }, [rateCards])

  // Open Payout Drill-Down
  const openPayoutDrawer = (payout: TeacherPayout) => {
    setInspectedPayout(payout)
    setBonusInput(payout.bonus)
    setDeductionInput(payout.deduction)
    setNoteInput(payout.adjustment_note || "")
  }

  // Open Rate Card Drawer for Teacher
  const openRateCardDrawer = (teacher: Teacher) => {
    const existing = rateCardByTeacherId.get(teacher.id)
    setRateSheetTeacher(teacher)
    setRateType(existing?.rate_type ?? "rate_per_session")
    setBasePerSession(existing?.rate_per_session ?? "0")
    setBaseHourly(existing?.hourly_rate ?? "0")
    setCurrencyInput(existing?.currency ?? "MMK")
    setRateNotesInput(existing?.notes ?? "")
    setOverrideRows(
      (existing?.cohort_overrides ?? []).map((ov) => ({
        class_obj_id: ov.class_obj,
        class_label: ov.class_label || `Cohort #${ov.class_obj}`,
        rate_per_session: ov.rate_per_session ?? "",
        hourly_rate: ov.hourly_rate ?? "",
      }))
    )
    setNewOverrideClassId("")
    setNewOverridePerSession("")
    setNewOverrideHourly("")
  }

  const handleRecalculateMonth = async () => {
    setCalculating(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await createApi(token).calculateTeacherPayouts({
        month: selectedMonth,
        force: true,
      })
      toast.add({
        title: `Recalculated ${res.calculated_count} teacher payout(s) for ${selectedMonth}`,
        type: "success",
      })
      await loadPayouts()
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Failed to recalculate payouts",
        type: "error",
      })
    } finally {
      setCalculating(false)
    }
  }

  const handleTransitionStatus = async (
    payout: TeacherPayout,
    nextStatus: TeacherPayoutStatus
  ) => {
    setTransitioningId(payout.id)
    try {
      const token = await getToken()
      if (!token) return
      const updated = await createApi(token).transitionTeacherPayoutStatus(
        payout.id,
        nextStatus
      )
      toast.add({
        title: `${payout.teacher_name} payout marked ${nextStatus.toUpperCase()}`,
        type: "success",
      })
      setPayouts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      if (inspectedPayout?.id === updated.id) {
        setInspectedPayout(updated)
      }
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Failed to update payout status",
        type: "error",
      })
    } finally {
      setTransitioningId(null)
    }
  }

  const handleSaveAdjustments = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspectedPayout) return
    setSavingAdjustment(true)
    try {
      const token = await getToken()
      if (!token) return
      const updated = await createApi(token).updateTeacherPayout(inspectedPayout.id, {
        bonus: bonusInput || "0",
        deduction: deductionInput || "0",
        adjustment_note: noteInput.trim(),
      })
      toast.add({
        title: `Updated payout adjustments for ${updated.teacher_name}`,
        type: "success",
      })
      setPayouts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      setInspectedPayout(updated)
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Failed to save adjustments",
        type: "error",
      })
    } finally {
      setSavingAdjustment(false)
    }
  }

  const handleAddOverrideRow = () => {
    if (!newOverrideClassId) return
    const cid = Number(newOverrideClassId)
    if (overrideRows.some((r) => r.class_obj_id === cid)) {
      toast.add({ title: "Override for this cohort already exists", type: "warning" })
      return
    }
    if (!newOverridePerSession.trim() && !newOverrideHourly.trim()) {
      toast.add({
        title: "Enter an override rate per session or hourly rate",
        type: "warning",
      })
      return
    }
    const cls = classes.find((c) => c.id === cid)
    setOverrideRows((prev) => [
      ...prev,
      {
        class_obj_id: cid,
        class_label: cls ? formatCohortIdentifier(cls) : `Cohort #${cid}`,
        rate_per_session: newOverridePerSession.trim(),
        hourly_rate: newOverrideHourly.trim(),
      },
    ])
    setNewOverrideClassId("")
    setNewOverridePerSession("")
    setNewOverrideHourly("")
  }

  const handleSaveRateCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rateSheetTeacher) return
    setSavingRateCard(true)
    try {
      const token = await getToken()
      if (!token) return
      await createApi(token).upsertTeacherRateCard({
        teacher_id: rateSheetTeacher.id,
        rate_type: rateType,
        rate_per_session: basePerSession || "0",
        hourly_rate: baseHourly || "0",
        currency: currencyInput.trim() || "MMK",
        notes: rateNotesInput.trim(),
        cohort_overrides: overrideRows.map((ov) => ({
          class_obj_id: ov.class_obj_id,
          rate_per_session: ov.rate_per_session ? ov.rate_per_session : null,
          hourly_rate: ov.hourly_rate ? ov.hourly_rate : null,
        })),
      })
      toast.add({
        title: `Saved rate card for ${rateSheetTeacher.name}`,
        type: "success",
      })
      setRateSheetTeacher(null)
      await Promise.all([loadRatesAndTeachers(), loadPayouts()])
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Failed to save teacher rate card",
        type: "error",
      })
    } finally {
      setSavingRateCard(false)
    }
  }

  // Filtered Payouts
  const filteredPayouts = React.useMemo(() => {
    const q = payoutSearch.trim().toLowerCase()
    return payouts.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false
      if (!q) return true
      return (
        p.teacher_name.toLowerCase().includes(q) ||
        (p.teacher_code ?? "").toLowerCase().includes(q)
      )
    })
  }, [payouts, statusFilter, payoutSearch])

  // Filtered Teachers for Rate Cards Tab
  const filteredTeachersForRates = React.useMemo(() => {
    const q = rateSearch.trim().toLowerCase()
    return teachers.filter((t) => {
      if (!q) return true
      return (
        t.name.toLowerCase().includes(q) ||
        (t.unique_code ?? "").toLowerCase().includes(q)
      )
    })
  }, [teachers, rateSearch])

  // KPI Aggregates
  const summaryStats = React.useMemo(() => {
    const totalSessions = payouts.reduce((acc, p) => acc + p.sessions_count, 0)
    const approvedOrPaid = payouts.filter(
      (p) => p.status === "approved" || p.status === "paid"
    ).length
    const totalNet = payouts.reduce((acc, p) => acc + Number(p.net_payout || 0), 0)
    return {
      facultyCount: payouts.length || teachers.length,
      totalSessions,
      approvedOrPaid,
      totalNet,
    }
  }, [payouts, teachers.length])

  const handleExportPayrollCsv = () => {
    const rows = filteredPayouts.map((p) => ({
      TeacherCode: p.teacher_code ?? `#${p.teacher}`,
      TeacherName: p.teacher_name,
      EmploymentType: p.employment_type ?? "",
      Month: selectedMonth,
      RateType: p.rate_type,
      BaseRate: p.base_rate,
      SessionsCount: p.sessions_count,
      CompletedSessions: p.completed_sessions_count,
      ScheduledSessions: p.scheduled_sessions_count,
      TotalHours: p.total_hours,
      SessionEarnings: p.session_earnings,
      Bonus: p.bonus,
      Deduction: p.deduction,
      NetPayout: p.net_payout,
      Currency: p.currency,
      Status: p.status.toUpperCase(),
    }))
    downloadCsv(`teacher-payouts-${selectedMonth}.csv`, rows)
  }

  const liveAdjustedNetPreview = React.useMemo(() => {
    if (!inspectedPayout) return 0
    const base = Number(inspectedPayout.session_earnings || 0)
    const bonus = Math.max(0, Number(bonusInput || 0))
    const ded = Math.max(0, Number(deductionInput || 0))
    return Math.max(0, base + bonus - ded)
  }, [inspectedPayout, bonusInput, deductionInput])

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* 1. Tactical Industrial SystemHeader */}
      <SystemHeader
        domain="FINANCE // PAYROLL"
        breadcrumb="TEACHER RATE ENGINE"
        title="Teacher Rate Cards & Automated Session Payouts"
        description="Configurable per-session and hourly teacher rate engine with cohort overrides, automated session computation, and payout workflow."
        metrics={[
          {
            label: "FACULTY",
            value: summaryStats.facultyCount,
          },
          {
            label: "SESSIONS IN PERIOD",
            value: summaryStats.totalSessions,
          },
          {
            label: "APPROVED / PAID",
            value: `${summaryStats.approvedOrPaid} / ${payouts.length}`,
            tone: summaryStats.approvedOrPaid > 0 ? "success" : "default",
          },
          {
            label: "TOTAL NET PAYOUT",
            value: formatMoney(summaryStats.totalNet),
          },
        ]}
        tabs={[
          {
            id: "payouts",
            label: "Monthly Session Payouts",
            count: payouts.length,
          },
          {
            id: "rates",
            label: "Teacher Rate Cards & Overrides",
            count: rateCards.length,
          },
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTabChange("rates")}
              className="shrink-0 rounded-sm font-mono text-xs uppercase"
            >
              <SlidersHorizontal className="mr-1.5 size-3.5" />
              Rate Cards
            </Button>
            <Button
              size="sm"
              onClick={() => void handleRecalculateMonth()}
              disabled={calculating}
              className="shrink-0 rounded-sm font-mono text-xs uppercase shadow-none"
            >
              {calculating ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Calculator className="mr-1.5 size-3.5" />
              )}
              Recalculate {selectedMonth}
            </Button>
          </div>
        }
      />

      {/* 2. Policy Callout Banner */}
      <div className="flex items-start gap-2.5 rounded-sm border border-border bg-muted/25 px-3.5 py-2.5 font-mono text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-foreground" />
        <div className="leading-relaxed">
          <span className="font-semibold uppercase tracking-wider text-foreground">
            Teacher Rate Engine Policy:
          </span>{" "}
          Earnings are automatically calculated from all{" "}
          <span className="font-bold text-foreground">scheduled</span> and{" "}
          <span className="font-bold text-foreground">completed</span> sessions taught (attributing
          substitute covers to the actual teaching faculty) multiplied by{" "}
          <span className="font-bold text-foreground">rate_per_session</span> or{" "}
          <span className="font-bold text-foreground">hourly_rate</span>, with Cohort Rate
          Overrides taking precedence. Toggle status from{" "}
          <span className="font-bold text-foreground">Draft → Approved → Paid</span>.
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: MONTHLY SESSION PAYOUTS                                        */}
      {/* ===================================================================== */}
      {activeTab === "payouts" && (
        <DataModule
          searchPlaceholder="Filter faculty by name or HIS26-... code..."
          searchValue={payoutSearch}
          onSearchChange={setPayoutSearch}
          filters={
            <>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) setSelectedMonth(e.target.value)
                }}
                className="h-8 w-40 shrink-0 rounded-sm border-border bg-background font-mono text-xs"
              />

              <div className="inline-flex shrink-0 items-center gap-0.5 rounded-[2px] border border-border bg-muted/40 p-0.5">
                {(["ALL", "draft", "approved", "paid"] as const).map((st) => (
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
              <Button
                variant="outline"
                size="xs"
                onClick={handleExportPayrollCsv}
                disabled={filteredPayouts.length === 0}
                className="h-7 shrink-0 rounded-sm font-mono text-[11px] uppercase"
              >
                <Download className="mr-1 size-3" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => void loadPayouts()}
                disabled={payoutsLoading}
                className="h-7 shrink-0 rounded-sm font-mono text-[11px] uppercase"
              >
                <RotateCcw
                  className={cn("mr-1 size-3", payoutsLoading && "animate-spin")}
                />
                Refresh
              </Button>
            </div>
          }
          totalCount={filteredPayouts.length}
          countLabel={`FACULTY PAYOUTS (${selectedMonth})`}
        >
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[850px]">
            <TableHeader>
              <TableRow className="h-9 bg-muted/20 hover:bg-muted/20">
                <TableHead className="px-3.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Identifier
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Teacher
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Rate Card
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sessions & Hours
                </TableHead>
                <TableHead className="text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Session Earnings
                </TableHead>
                <TableHead className="text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Bonus / Deduct
                </TableHead>
                <TableHead className="text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Net Payout
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-right pr-3.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payoutsLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={idx} className="h-11">
                    <TableCell colSpan={9} className="px-3.5">
                      <div className="h-4 w-full rounded-sm skeleton-shimmer" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredPayouts.length === 0 ? (
                <TableRow className="h-24">
                  <TableCell
                    colSpan={9}
                    className="text-center font-mono text-xs text-muted-foreground"
                  >
                    No teacher payout records match the current month or status filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayouts.map((p) => {
                  const nextAction: { label: string; target: TeacherPayoutStatus } | null =
                    p.status === "draft"
                      ? { label: "Approve", target: "approved" }
                      : p.status === "approved"
                        ? { label: "Mark Paid", target: "paid" }
                        : null

                  return (
                    <TableRow key={p.id} className="h-11 hover:bg-muted/30">
                      <TableCell className="px-3.5">
                        <CodeChip accent>{p.teacher_code || `#${p.teacher}`}</CodeChip>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-foreground">
                            {p.teacher_name}
                          </span>
                          <span className="font-mono text-[10px] uppercase text-muted-foreground">
                            {p.employment_type === "full_time" ? "FULL TIME" : "TUTOR"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.has_rate_card ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-xs tabular-nums text-foreground">
                              {formatMoney(p.base_rate, p.currency)}
                              {p.rate_type === "hourly_rate" ? "/hr" : "/sess"}
                            </span>
                            {p.cohort_overrides_count > 0 && (
                              <CodeChip>+{p.cohort_overrides_count} OVR</CodeChip>
                            )}
                          </div>
                        ) : (
                          <TelemetryTag status="neutral">RATE UNSET</TelemetryTag>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-foreground">
                        <div>
                          <span className="font-semibold">{p.sessions_count}</span>{" "}
                          <span className="text-muted-foreground">
                            ({p.completed_sessions_count}c / {p.scheduled_sessions_count}s ·{" "}
                            {p.total_hours}h)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                        {formatMoney(p.session_earnings, p.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        <span className="text-success">
                          +{Number(p.bonus || 0).toLocaleString()}
                        </span>{" "}
                        <span className="text-muted-foreground">/</span>{" "}
                        <span className="text-destructive">
                          -{Number(p.deduction || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold tabular-nums text-foreground">
                        {formatMoney(p.net_payout, p.currency)}
                      </TableCell>
                      <TableCell>
                        <TelemetryTag status={payoutStatusTone(p.status)}>
                          {p.status.toUpperCase()}
                        </TelemetryTag>
                      </TableCell>
                      <TableCell className="text-right pr-3.5">
                        <div className="inline-flex shrink-0 items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => openPayoutDrawer(p)}
                            className="h-7 shrink-0 rounded-sm px-2 font-mono text-[11px] uppercase"
                          >
                            Drill-Down
                          </Button>
                          {nextAction && (
                            <Button
                              size="xs"
                              disabled={transitioningId === p.id}
                              onClick={() =>
                                void handleTransitionStatus(p, nextAction.target)
                              }
                              className="h-7 shrink-0 rounded-sm px-2 font-mono text-[11px] uppercase"
                            >
                              {transitioningId === p.id && (
                                <Loader2 className="mr-1 size-3 animate-spin" />
                              )}
                              {nextAction.label}
                            </Button>
                          )}
                        </div>
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
      {/* TAB 2: TEACHER RATE CARDS & COHORT OVERRIDES                          */}
      {/* ===================================================================== */}
      {activeTab === "rates" && (
        <DataModule
          searchPlaceholder="Filter teachers by name or HIS26-... code..."
          searchValue={rateSearch}
          onSearchChange={setRateSearch}
          toolbarRight={
            <Button
              variant="outline"
              size="xs"
              onClick={() => void loadRatesAndTeachers()}
              disabled={ratesLoading}
              className="h-7 shrink-0 rounded-sm font-mono text-[11px] uppercase"
            >
              <RotateCcw
                className={cn("mr-1 size-3", ratesLoading && "animate-spin")}
              />
              Refresh
            </Button>
          }
          totalCount={filteredTeachersForRates.length}
          countLabel="TEACHER RATE CONFIGURATIONS"
        >
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[850px]">
            <TableHeader>
              <TableRow className="h-9 bg-muted/20 hover:bg-muted/20">
                <TableHead className="px-3.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Identifier
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Teacher Name
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Type
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Engine Mode
                </TableHead>
                <TableHead className="text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Rate / Session
                </TableHead>
                <TableHead className="text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Hourly Rate
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Cohort Rate Overrides
                </TableHead>
                <TableHead className="text-right pr-3.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratesLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={idx} className="h-11">
                    <TableCell colSpan={8} className="px-3.5">
                      <div className="h-4 w-full rounded-sm skeleton-shimmer" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredTeachersForRates.length === 0 ? (
                <TableRow className="h-24">
                  <TableCell
                    colSpan={8}
                    className="text-center font-mono text-xs text-muted-foreground"
                  >
                    No teachers found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeachersForRates.map((teacher) => {
                  const card = rateCardByTeacherId.get(teacher.id)
                  return (
                    <TableRow key={teacher.id} className="h-11 hover:bg-muted/30">
                      <TableCell className="px-3.5">
                        <CodeChip accent>{teacher.unique_code || `#${teacher.id}`}</CodeChip>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {teacher.name}
                      </TableCell>
                      <TableCell>
                        <TelemetryTag status="neutral">
                          {teacher.employment_type === "full_time" ? "FULL TIME" : "TUTOR"}
                        </TelemetryTag>
                      </TableCell>
                      <TableCell>
                        {card ? (
                          <TelemetryTag
                            status={card.rate_type === "hourly_rate" ? "info" : "active"}
                          >
                            {card.rate_type === "hourly_rate" ? "HOURLY RATE" : "PER SESSION"}
                          </TelemetryTag>
                        ) : (
                          <TelemetryTag status="late">UNCONFIGURED</TelemetryTag>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                        {card ? formatMoney(card.rate_per_session, card.currency) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                        {card ? formatMoney(card.hourly_rate, card.currency) : "—"}
                      </TableCell>
                      <TableCell>
                        {card && card.cohort_overrides.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {card.cohort_overrides.map((ov) => (
                              <CodeChip key={ov.class_obj}>
                                {ov.class_label || `#${ov.class_obj}`}:{" "}
                                {card.rate_type === "hourly_rate"
                                  ? `${ov.hourly_rate ?? "—"}`
                                  : `${ov.rate_per_session ?? "—"}`}
                              </CodeChip>
                            ))}
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">
                            None
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-3.5">
                        <Button
                          variant={card ? "outline" : "default"}
                          size="xs"
                          onClick={() => openRateCardDrawer(teacher)}
                          className="h-7 shrink-0 rounded-sm px-2.5 font-mono text-[11px] uppercase"
                        >
                          <SlidersHorizontal className="mr-1 size-3" />
                          {card ? "Edit Rate" : "Configure"}
                        </Button>
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
      {/* INSPECTOR SHEET 1: PAYOUT DRILL-DOWN & STATUS / ADJUSTMENTS           */}
      {/* ===================================================================== */}
      <InspectorSheet
        open={inspectedPayout !== null}
        onOpenChange={(open) => {
          if (!open) setInspectedPayout(null)
        }}
        code={inspectedPayout?.teacher_code || undefined}
        title={
          inspectedPayout
            ? `Payout Breakdown // ${inspectedPayout.teacher_name}`
            : "Payout Breakdown"
        }
        subtitle={
          inspectedPayout
            ? `${inspectedPayout.period_start} → ${inspectedPayout.period_end} · ${inspectedPayout.sessions_count} sessions (${inspectedPayout.total_hours} hrs)`
            : undefined
        }
        status={
          inspectedPayout
            ? {
                label: inspectedPayout.status.toUpperCase(),
                tone: payoutStatusTone(inspectedPayout.status),
              }
            : undefined
        }
        fields={
          inspectedPayout
            ? [
                {
                  label: "Engine Mode",
                  value:
                    inspectedPayout.rate_type === "hourly_rate"
                      ? "Hourly Rate"
                      : "Rate per Session",
                  mono: true,
                },
                {
                  label: "Base Rate",
                  value: formatMoney(inspectedPayout.base_rate, inspectedPayout.currency),
                  mono: true,
                },
                {
                  label: "Session Earnings",
                  value: formatMoney(
                    inspectedPayout.session_earnings,
                    inspectedPayout.currency
                  ),
                  mono: true,
                },
                {
                  label: "Net Payout",
                  value: formatMoney(inspectedPayout.net_payout, inspectedPayout.currency),
                  mono: true,
                },
              ]
            : undefined
        }
        footerActions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInspectedPayout(null)}
            className="rounded-sm font-mono text-xs uppercase"
          >
            Close
          </Button>
        }
      >
        {inspectedPayout && (
          <div className="space-y-5">
            {/* 1. Status Workflow Toggle */}
            <div className="space-y-2">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                PAYOUT WORKFLOW STATUS
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-[2px] border border-border bg-muted/40 p-1">
                {(["draft", "approved", "paid"] as const).map((st) => {
                  const active = inspectedPayout.status === st
                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={transitioningId === inspectedPayout.id}
                      onClick={() => void handleTransitionStatus(inspectedPayout, st)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-[2px] px-2 py-1.5 font-mono text-[11px] font-semibold uppercase transition-colors",
                        active
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                      )}
                    >
                      {active && <CheckCircle2 className="size-3" />}
                      {st}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Manual Bonus / Deduction Form */}
            <form
              onSubmit={handleSaveAdjustments}
              className="space-y-3 rounded-sm border border-border bg-muted/20 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  MANUAL ADJUSTMENTS
                </span>
                <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-foreground">
                  Preview Net: {formatMoney(liveAdjustedNetPreview, inspectedPayout.currency)}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase text-muted-foreground">
                    Bonus ({inspectedPayout.currency})
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={bonusInput}
                    onChange={(e) => setBonusInput(e.target.value)}
                    className="h-8 rounded-sm bg-background font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase text-muted-foreground">
                    Deduction ({inspectedPayout.currency})
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={deductionInput}
                    onChange={(e) => setDeductionInput(e.target.value)}
                    className="h-8 rounded-sm bg-background font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase text-muted-foreground">
                  Adjustment Note
                </label>
                <Input
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Optional reason for bonus or deduction..."
                  className="h-8 rounded-sm bg-background text-xs"
                />
              </div>
              <Button
                type="submit"
                size="xs"
                disabled={savingAdjustment}
                className="w-full h-8 rounded-sm font-mono text-[11px] uppercase"
              >
                {savingAdjustment ? (
                  <Loader2 className="mr-1.5 size-3 animate-spin" />
                ) : (
                  <Save className="mr-1.5 size-3" />
                )}
                Save Adjustments
              </Button>
            </form>

            {/* 3. Cohort Rate Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Layers className="size-3 text-foreground" />
                COHORT SUMMARY ({inspectedPayout.session_breakdown?.cohorts?.length ?? 0})
              </div>
              {(inspectedPayout.session_breakdown?.cohorts ?? []).length === 0 ? (
                <div className="rounded-sm border border-dashed border-border p-3 font-mono text-xs text-muted-foreground">
                  No scheduled or completed sessions recorded in this month.
                </div>
              ) : (
                <div className="divide-y divide-border rounded-sm border border-border">
                  {inspectedPayout.session_breakdown.cohorts.map((coh, i) => (
                    <div
                      key={`${coh.cohort_label}-${i}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <CodeChip accent className="shrink-0">
                            {coh.cohort_label}
                          </CodeChip>
                          {coh.is_cohort_override && (
                            <TelemetryTag status="info" className="shrink-0">
                              OVERRIDE
                            </TelemetryTag>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {coh.sessions_count} sess · {coh.total_hours}h @{" "}
                          {formatMoney(coh.rate_applied, inspectedPayout.currency)}
                          {coh.rate_type === "hourly_rate" ? "/hr" : "/sess"}
                        </div>
                      </div>
                      <div className="shrink-0 font-mono text-xs font-bold tabular-nums text-foreground">
                        {formatMoney(coh.subtotal, inspectedPayout.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Exact Sessions Taught Ledger */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Clock className="size-3 text-foreground" />
                EXACT SESSIONS TAUGHT ({inspectedPayout.session_breakdown?.sessions?.length ?? 0})
              </div>
              {(inspectedPayout.session_breakdown?.sessions ?? []).length === 0 ? (
                <div className="rounded-sm border border-dashed border-border p-3 font-mono text-xs text-muted-foreground">
                  0 sessions in period.
                </div>
              ) : (
                <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-sm border border-border">
                  {inspectedPayout.session_breakdown.sessions.map((s) => (
                    <div
                      key={`${s.kind}-${s.session_id}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
                            {s.date}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {s.start_time}–{s.end_time}
                          </span>
                          <CodeChip>{s.cohort_label}</CodeChip>
                          {s.is_substitute && (
                            <TelemetryTag status="late">SUB COVER</TelemetryTag>
                          )}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {s.subject_name} ·{" "}
                          <span className="uppercase">{s.status}</span> · {s.duration_hours}h
                        </div>
                      </div>
                      <div className="shrink-0 font-mono text-xs font-semibold tabular-nums text-foreground">
                        {formatMoney(s.amount, inspectedPayout.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </InspectorSheet>

      {/* ===================================================================== */}
      {/* INSPECTOR SHEET 2: TEACHER RATE CARD & COHORT OVERRIDES               */}
      {/* ===================================================================== */}
      <InspectorSheet
        open={rateSheetTeacher !== null}
        onOpenChange={(open) => {
          if (!open) setRateSheetTeacher(null)
        }}
        code={rateSheetTeacher?.unique_code || undefined}
        title={
          rateSheetTeacher
            ? `Rate Card // ${rateSheetTeacher.name}`
            : "Configure Teacher Rate"
        }
        subtitle="Set default per-session or hourly rate and optional cohort-specific overrides."
        footerActions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRateSheetTeacher(null)}
              className="shrink-0 rounded-sm font-mono text-xs uppercase"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              form="rate-card-form"
              type="submit"
              disabled={savingRateCard}
              className="shrink-0 rounded-sm font-mono text-xs uppercase"
            >
              {savingRateCard && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              <Banknote className="mr-1.5 size-3.5" />
              Save Rate Card
            </Button>
          </>
        }
      >
        <form id="rate-card-form" onSubmit={handleSaveRateCard} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Calculation Basis
            </label>
            <div className="grid grid-cols-2 gap-1 rounded-[2px] border border-border bg-muted/40 p-1">
              {(
                [
                  { id: "rate_per_session", label: "Per Session" },
                  { id: "hourly_rate", label: "Hourly Rate" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRateType(opt.id)}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-[2px] px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase transition-colors",
                    rateType === opt.id
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Rate / Session
              </label>
              <Input
                type="number"
                min="0"
                step="100"
                value={basePerSession}
                onChange={(e) => setBasePerSession(e.target.value)}
                className="h-9 rounded-sm font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Hourly Rate
              </label>
              <Input
                type="number"
                min="0"
                step="100"
                value={baseHourly}
                onChange={(e) => setBaseHourly(e.target.value)}
                className="h-9 rounded-sm font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Currency
              </label>
              <Input
                value={currencyInput}
                onChange={(e) => setCurrencyInput(e.target.value.toUpperCase())}
                placeholder="MMK"
                className="h-9 rounded-sm font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Notes (Optional)
            </label>
            <Input
              value={rateNotesInput}
              onChange={(e) => setRateNotesInput(e.target.value)}
              placeholder="Contract notes or tier classification..."
              className="h-9 rounded-sm text-xs"
            />
          </div>

          {/* Cohort Rate Overrides */}
          <div className="space-y-2.5 border-t border-border pt-3">
            <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Cohort Rate Overrides ({overrideRows.length})
            </div>

            {overrideRows.length > 0 && (
              <div className="divide-y divide-border rounded-sm border border-border">
                {overrideRows.map((ov) => (
                  <div
                    key={ov.class_obj_id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <CodeChip accent className="shrink-0">
                        {ov.class_label}
                      </CodeChip>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {ov.rate_per_session ? `${ov.rate_per_session}/sess` : ""}{" "}
                        {ov.hourly_rate ? `${ov.hourly_rate}/hr` : ""}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() =>
                        setOverrideRows((prev) =>
                          prev.filter((r) => r.class_obj_id !== ov.class_obj_id)
                        )
                      }
                      className="h-6 shrink-0 px-1.5 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 rounded-sm border border-dashed border-border bg-muted/20 p-2.5">
              <Select value={newOverrideClassId} onValueChange={(v) => v && setNewOverrideClassId(v)}>
                <SelectTrigger className="h-8 rounded-sm bg-background font-mono text-xs">
                  <span className="truncate">
                    {newOverrideClassId
                      ? formatCohortIdentifier(
                          classes.find((c) => String(c.id) === newOverrideClassId)!
                        )
                      : "Select Cohort to Override..."}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="font-mono text-xs">
                      {formatCohortIdentifier(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input
                  type="number"
                  min="0"
                  placeholder="Sess Override"
                  value={newOverridePerSession}
                  onChange={(e) => setNewOverridePerSession(e.target.value)}
                  className="h-8 rounded-sm bg-background font-mono text-xs"
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Hr Override"
                  value={newOverrideHourly}
                  onChange={(e) => setNewOverrideHourly(e.target.value)}
                  className="h-8 rounded-sm bg-background font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleAddOverrideRow}
                  className="h-8 shrink-0 rounded-sm px-2.5 font-mono text-[11px] uppercase"
                >
                  <Plus className="mr-1 size-3" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        </form>
      </InspectorSheet>
    </div>
  )
}

export default function PayrollPage() {
  return (
    <RequireRole mode="staff">
      <PayrollWorkspaceContent />
    </RequireRole>
  )
}
