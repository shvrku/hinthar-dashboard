"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import {
  RefreshCw,
  Download,
  Eye,
  Loader2,
  Search,
  QrCode,
  ShieldCheck,
  ShieldOff,
  X,
} from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { Class, Student } from "@/lib/types"
import { formatClassLabel, formatClassLabelText } from "@/lib/format-class"
import { useSortableData } from "@/lib/use-sortable-data"
import { useServerPagination } from "@/components/use-server-pagination"
import { StandardTablePagination } from "@/components/standard-table-pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { StandardPageHeader, buildReloadAction } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { AnimatedTableBody } from "@/components/animation/animated-table-body"
import { TableRevealProvider } from "@/components/animation/table-reveal-context"
import { QrCanvas } from "@/components/qr-canvas"
import { TableSkeletonRows } from "@/components/page-skeletons"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableHeadSortable,
  TableCell,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { downloadQrPng, downloadQrZip, qrDownloadFilename } from "@/lib/qr-download"
import { cn } from "@/lib/utils"

function classDisplay(s: Student): string {
  const labels = (s.class_labels ?? []).filter(Boolean).map(formatClassLabelText)
  if (labels.length === 0) return "Unassigned"
  return labels.join(", ")
}

function primaryClassKey(s: Student): string {
  const raw = s.class_labels?.[0]?.trim()
  return raw ? formatClassLabelText(raw) : "Unassigned"
}

function QrStatusBadge({ active }: { active: boolean | undefined }) {
  if (active === false) {
    return <Badge variant="destructive">Inactive</Badge>
  }
  return <Badge variant="success">Active</Badge>
}

/** Fixed-size stack so bulk mode never shifts the side panel layout. */
function QrStackPreview({
  count,
  frontToken,
}: {
  count: number
  frontToken?: string | null
}) {
  const layers = Math.min(3, Math.max(2, count))
  const behind = layers - 1
  const size = 168
  // Extra room so rotated back cards aren't clipped.
  const frame = 232

  return (
    <div
      className="relative mx-auto shrink-0 overflow-visible"
      style={{ width: frame, height: frame }}
      aria-label={`${count} QR codes selected`}
    >
      {Array.from({ length: behind }, (_, i) => {
        const fromBack = behind - i
        const offset = fromBack * 6
        const rot = fromBack % 2 === 0 ? -7 : 6
        return (
          <div
            key={i}
            aria-hidden
            className="absolute left-1/2 top-1/2 rounded-lg border border-border/80 bg-background shadow-sm ring-1 ring-black/5 dark:ring-white/10"
            style={{
              width: size,
              height: size,
              zIndex: i,
              transform: `translate(-50%, calc(-50% - ${offset}px)) rotate(${rot}deg)`,
            }}
          />
        )
      })}
      <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        {frontToken ? (
          <QrCanvas value={frontToken} size={size} className="rounded-lg shadow-md" />
        ) : (
          <div
            className="flex items-center justify-center rounded-lg border bg-background shadow-md"
            style={{ width: size, height: size }}
          >
            <QrCode className="size-14 text-muted-foreground/35" />
          </div>
        )}
      </div>
    </div>
  )
}

const SIDE_PANEL_HEIGHT = "h-[34rem]"
const SIDE_PANEL_CARD =
  `flex ${SIDE_PANEL_HEIGHT} w-full flex-col overflow-hidden rounded-xl border border-border/80 bg-card py-4 shadow-2xs`
const SIDE_PANEL_EMPTY =
  `flex ${SIDE_PANEL_HEIGHT} w-full flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center`
const QR_SLOT =
  "flex min-h-0 flex-1 flex-col items-center justify-center overflow-visible"
const SIDE_HEADER = "shrink-0 space-y-1.5 pb-3"
const ACTION_STACK = "mt-auto flex shrink-0 flex-col gap-2"

export default function CheckInManagementPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [pageStudents, setPageStudents] = React.useState<Student[]>([])
  const [classes, setClasses] = React.useState<Class[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<Student | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set())
  const [actionBusy, setActionBusy] = React.useState(false)
  const [tokenLoading, setTokenLoading] = React.useState(false)
  const tokenFetchIdRef = React.useRef<number | null>(null)
  const [bulkBusy, setBulkBusy] = React.useState(false)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const [classFilter, setClassFilter] = React.useState<string>("all")
  const [groupByClass, setGroupByClass] = React.useState(true)
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)
  const serverPg = useServerPagination(50)

  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  const flashSuccess = React.useCallback((msg: string) => {
    setSuccess(msg)
    window.setTimeout(() => setSuccess(null), 3000)
  }, [])

  const fetchPage = React.useCallback(async () => {
    const token = await getToken()
    if (!token) throw new Error("No auth token available")
    const api = createApi(token)
    const data = await api.listStudentsPage({
      page: serverPg.page,
      page_size: serverPg.pageSize,
      q: debouncedQuery || undefined,
      class_id: classFilter === "all" ? undefined : classFilter,
    })
    setPageStudents(data.results)
    serverPg.setTotalItems(data.count)
    setSelectedIds(new Set())
    setSelected(null)
    tokenFetchIdRef.current = null
    setTokenLoading(false)
  }, [getToken, serverPg.page, serverPg.pageSize, serverPg.setTotalItems, debouncedQuery, classFilter])

  const loadMeta = React.useCallback(async () => {
    const token = await getToken()
    if (!token) return
    const data = await createApi(token).listClasses()
    setClasses(data)
  }, [getToken])

  const loadStudents = React.useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setError(null)
    try {
      await Promise.all([fetchPage(), loadMeta()])
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [isSignedIn, fetchPage, loadMeta])

  const filterKeyRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (lastLoaded === null) return
    const filterKey = `${debouncedQuery}|${classFilter}`
    const filterChanged = filterKeyRef.current !== null && filterKey !== filterKeyRef.current
    filterKeyRef.current = filterKey
    if (filterChanged && serverPg.page !== 1) {
      serverPg.setPage(1)
      return
    }
    let cancelled = false
    setLoading(true)
    void fetchPage()
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError) setError(err.userMessage)
        else setError(err instanceof Error ? err.message : "Failed to load data")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPg.page, serverPg.pageSize, debouncedQuery, classFilter])

  React.useEffect(() => {
    if (isLoaded && isSignedIn) void loadStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn])

  const { items: sortedStudents, requestSort, sortConfig } = useSortableData(
    pageStudents,
    "name",
    "asc"
  )

  const groupedRows = React.useMemo(() => {
    if (!groupByClass) {
      return [{ key: "all", label: null as string | null, students: sortedStudents }]
    }
    const map = new Map<string, Student[]>()
    for (const s of sortedStudents) {
      const key = primaryClassKey(s)
      const list = map.get(key) ?? []
      list.push(s)
      map.set(key, list)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, students]) => ({ key, label: key, students }))
  }, [groupByClass, sortedStudents])

  const tablePagination = {
    currentPage: serverPg.page,
    totalPages: serverPg.totalPages,
    totalItems: serverPg.totalItems,
    startIndex: serverPg.startIndex,
    endIndex: serverPg.endIndex,
    pageSize: serverPg.pageSize,
    onPageChange: serverPg.setPage,
    onPageSizeChange: serverPg.setPageSize,
  }

  const loadFocusedStudent = React.useCallback(
    async (student: Student) => {
      setError(null)
      setSelected({ ...student, check_in_token: student.check_in_token })
      tokenFetchIdRef.current = student.id
      if (student.check_in_token || !isSignedIn) {
        setTokenLoading(false)
        return
      }
      setTokenLoading(true)
      try {
        const token = await getToken()
        if (!token) return
        const { check_in_token } = await createApi(token).getCheckInToken(student.id)
        setSelected((prev) =>
          prev && prev.id === student.id ? { ...prev, check_in_token } : prev
        )
      } catch (err) {
        if (err instanceof ApiError) setError(err.userMessage)
        else setError(err instanceof Error ? err.message : "Failed to load check-in token")
      } finally {
        if (tokenFetchIdRef.current === student.id) setTokenLoading(false)
      }
    },
    [getToken, isSignedIn]
  )

  /** Exclusive single select (QR button). */
  const selectStudent = React.useCallback(
    async (student: Student) => {
      setSelectedIds(new Set([student.id]))
      await loadFocusedStudent(student)
    },
    [loadFocusedStudent]
  )

  const patchStudentLocal = React.useCallback((id: number, patch: Partial<Student>) => {
    setPageStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    setSelected((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev))
  }, [])

  const handleRegenerate = React.useCallback(async () => {
    if (!selected || !isSignedIn || tokenLoading) return
    setActionBusy(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const res = await createApi(token).regenerateCheckInToken(selected.id)
      patchStudentLocal(selected.id, {
        check_in_token: res.check_in_token,
        check_in_token_active: res.check_in_token_active ?? true,
      })
      flashSuccess("Check-in token regenerated.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to regenerate token")
    } finally {
      setActionBusy(false)
    }
  }, [selected, getToken, isSignedIn, tokenLoading, patchStudentLocal, flashSuccess])

  const toggleActive = React.useCallback(
    async (activate: boolean) => {
      if (!selected || !isSignedIn || tokenLoading) return
      setActionBusy(true)
      setError(null)
      try {
        const token = await getToken()
        if (!token) throw new Error("No auth token available")
        const api = createApi(token)
        const res = activate
          ? await api.activateCheckInToken(selected.id)
          : await api.deactivateCheckInToken(selected.id)
        patchStudentLocal(selected.id, { check_in_token_active: res.check_in_token_active })
        flashSuccess(activate ? "QR check-in activated." : "QR check-in deactivated.")
      } catch (err) {
        if (err instanceof ApiError) setError(err.userMessage)
        else setError(err instanceof Error ? err.message : "Failed to update QR status")
      } finally {
        setActionBusy(false)
      }
    },
    [selected, getToken, isSignedIn, tokenLoading, patchStudentLocal, flashSuccess]
  )

  const downloadSelectedQr = React.useCallback(async () => {
    if (!selected?.check_in_token || tokenLoading) return
    try {
      await downloadQrPng(
        selected.check_in_token,
        qrDownloadFilename(selected)
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download QR")
    }
  }, [selected, tokenLoading])

  const pageIds = React.useMemo(() => sortedStudents.map((s) => s.id), [sortedStudents])
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))

  const applySelectionSideEffects = React.useCallback(
    (next: Set<number>) => {
      if (next.size === 0) {
        tokenFetchIdRef.current = null
        setTokenLoading(false)
        setSelected(null)
        return
      }
      if (next.size === 1) {
        const onlyId = Array.from(next)[0]
        const student = pageStudents.find((s) => s.id === onlyId)
        if (student) void loadFocusedStudent(student)
        return
      }
      // Bulk: keep current focus if still selected; otherwise focus first selected.
      if (selected && next.has(selected.id)) return
      const fallback = pageStudents.find((s) => next.has(s.id))
      if (fallback) void loadFocusedStudent(fallback)
    },
    [pageStudents, loadFocusedStudent, selected]
  )

  const toggleSelectAllPage = React.useCallback(
    (checked: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (checked) pageIds.forEach((id) => next.add(id))
        else pageIds.forEach((id) => next.delete(id))
        queueMicrotask(() => applySelectionSideEffects(next))
        return next
      })
    },
    [pageIds, applySelectionSideEffects]
  )

  const toggleSelectOne = React.useCallback(
    (id: number, checked: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (checked) next.add(id)
        else next.delete(id)
        queueMicrotask(() => applySelectionSideEffects(next))
        return next
      })
    },
    [applySelectionSideEffects]
  )

  /** Row click: add to selection, or remove if already selected. */
  const toggleRowSelection = React.useCallback(
    (student: Student) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(student.id)) next.delete(student.id)
        else next.add(student.id)
        queueMicrotask(() => applySelectionSideEffects(next))
        return next
      })
    },
    [applySelectionSideEffects]
  )

  const runBulk = React.useCallback(
    async (mode: "activate" | "deactivate" | "download") => {
      if (!isSignedIn || selectedIds.size === 0 || tokenLoading) return
      setBulkBusy(true)
      setError(null)
      try {
        const authToken = await getToken()
        if (!authToken) throw new Error("No auth token available")
        const api = createApi(authToken)
        const ids = Array.from(selectedIds)
        if (mode === "download") {
          const items: { token: string; filename: string }[] = []
          for (const id of ids) {
            const student = pageStudents.find((s) => s.id === id)
            const { check_in_token } = await api.getCheckInToken(id)
            if (!check_in_token) continue
            items.push({
              token: check_in_token,
              filename: qrDownloadFilename(
                student ?? { id, unique_code: null, name: null }
              ),
            })
          }
          if (items.length === 0) throw new Error("No QR tokens available for the selection.")
          await downloadQrZip(items, `check-in-qr-${items.length}.zip`)
          flashSuccess(`Downloaded ${items.length} QR code${items.length === 1 ? "" : "s"}.`)
        } else {
          let ok = 0
          for (const id of ids) {
            const res =
              mode === "activate"
                ? await api.activateCheckInToken(id)
                : await api.deactivateCheckInToken(id)
            patchStudentLocal(id, { check_in_token_active: res.check_in_token_active })
            ok += 1
          }
          flashSuccess(
            mode === "activate"
              ? `Activated QR for ${ok} student${ok === 1 ? "" : "s"}.`
              : `Deactivated QR for ${ok} student${ok === 1 ? "" : "s"}.`
          )
        }
      } catch (err) {
        if (err instanceof ApiError) setError(err.userMessage)
        else setError(err instanceof Error ? err.message : "Bulk action failed")
      } finally {
        setBulkBusy(false)
      }
    },
    [isSignedIn, selectedIds, tokenLoading, getToken, pageStudents, patchStudentLocal, flashSuccess]
  )

  const classOptions = React.useMemo(
    () =>
      classes.map((c) => ({
        value: String(c.id),
        label: formatClassLabel(c),
      })),
    [classes]
  )

  const selectionStats = React.useMemo(() => {
    let active = 0
    let inactive = 0
    for (const id of selectedIds) {
      const s = pageStudents.find((row) => row.id === id)
      if (s?.check_in_token_active === false) inactive += 1
      else active += 1
    }
    const mixed = active > 0 && inactive > 0
    return {
      active,
      inactive,
      mixed,
      // Activate/deactivate only when selection is uniform
      canActivate: !mixed && inactive > 0,
      canDeactivate: !mixed && active > 0,
    }
  }, [selectedIds, pageStudents])

  const isBulkSelection = selectedIds.size > 1
  const stackFrontToken =
    selected && selectedIds.has(selected.id) ? selected.check_in_token : null

  const clearSelection = React.useCallback(() => {
    tokenFetchIdRef.current = null
    setTokenLoading(false)
    setSelectedIds(new Set())
    setSelected(null)
  }, [])

  if (!isLoaded) {
    return (
      <div className="container mx-auto max-w-7xl px-4 pb-6 sm:px-6 md:px-8 md:pb-8">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <Table>
          <TableHeader>
            <TableRow>
              {["", "ID", "Class", "Name", "Status", "Actions"].map((h) => (
                <TableHead key={h || "check"}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <AnimatedTableBody
            loading
            hasData={false}
            rowCount={5}
            skeletonRowCount={5}
            colSpan={6}
            skeleton={<TableSkeletonRows columns={6} rows={5} />}
          >
            {null}
          </AnimatedTableBody>
        </Table>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="font-medium text-muted-foreground">Please sign in to view check-in codes.</p>
      </div>
    )
  }

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <StandardPageHeader
          title="Check-In Management"
          secondaryAction={buildReloadAction({
            hasLoaded: !!lastLoaded,
            loading,
            onClick: loadStudents,
          })}
        />
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Students
              </p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <QrCode className="size-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                {serverPg.totalItems}
              </h2>
              {lastLoaded && (
                <span className="text-[11px] text-muted-foreground">Updated {lastLoaded}</span>
              )}
            </div>
          </Card>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={classFilter} onValueChange={(v) => v && setClassFilter(v)}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue>
                {classFilter === "all"
                  ? "All classes"
                  : (classOptions.find((o) => o.value === classFilter)?.label ?? "Class")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={groupByClass ? "default" : "outline"}
            size="sm"
            onClick={() => setGroupByClass((v) => !v)}
          >
            Group by class
          </Button>
        </div>
      </StaggerItem>

      {error && (
        <div className="mb-2 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button size="xs" variant="ghost" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}
      {success && (
        <div className="mb-2 flex items-center justify-between rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <span>{success}</span>
          <Button size="xs" variant="ghost" onClick={() => setSuccess(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <TableRevealProvider>
        <div className="grid grid-cols-1 items-start gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {tablePagination.totalItems > 0 && (
            <StandardTablePagination
              {...tablePagination}
              loading={loading}
              placement="top"
              className="lg:col-start-1"
            />
          )}
          <StaggerItem className="min-w-0 w-full lg:col-start-1">
            <Card className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xs">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allPageSelected}
                        onCheckedChange={(v) => toggleSelectAllPage(v === true)}
                        aria-label="Select all on page"
                      />
                    </TableHead>
                    <TableHeadSortable
                      className="w-[110px]"
                      sortKey="unique_code"
                      currentSortKey={sortConfig.key}
                      currentSortOrder={sortConfig.order}
                      onSort={requestSort}
                    >
                      ID
                    </TableHeadSortable>
                    <TableHead className="w-[160px]">Class</TableHead>
                    <TableHeadSortable
                      sortKey="name"
                      currentSortKey={sortConfig.key}
                      currentSortOrder={sortConfig.order}
                      onSort={requestSort}
                    >
                      Name
                    </TableHeadSortable>
                    <TableHead className="w-[100px]">QR</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <AnimatedTableBody
                  loading={loading}
                  hasData={sortedStudents.length > 0}
                  rowCount={Math.min(serverPg.pageSize, 8)}
                  skeletonRowCount={Math.min(serverPg.pageSize, 8)}
                  colSpan={6}
                  skeleton={
                    <TableSkeletonRows columns={6} rows={Math.min(serverPg.pageSize, 8)} />
                  }
                  emptyTitle="No students found"
                  emptyDescription="Try a different search or class filter."
                >
                  {groupedRows.flatMap((group) => [
                    ...(group.label
                      ? [
                          <TableRow key={`g-${group.key}`} className="hover:bg-transparent">
                            <TableCell
                              colSpan={6}
                              className="bg-muted/40 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                            >
                              {group.label}
                            </TableCell>
                          </TableRow>,
                        ]
                      : []),
                    ...group.students.map((s) => (
                      <TableRow
                        key={s.id}
                        className="cursor-pointer"
                        data-state={
                          selectedIds.has(s.id) || selected?.id === s.id ? "selected" : undefined
                        }
                        onClick={() => toggleRowSelection(s)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(s.id)}
                            onCheckedChange={(v) => toggleSelectOne(s.id, v === true)}
                            aria-label={`Select ${s.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {s.unique_code}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{classDisplay(s)}</span>
                        </TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>
                          <QrStatusBadge active={s.check_in_token_active} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              void selectStudent(s)
                            }}
                          >
                            <Eye className="mr-1.5 size-3.5" />
                            QR
                          </Button>
                        </TableCell>
                      </TableRow>
                    )),
                  ])}
                </AnimatedTableBody>
              </Table>
            </Card>
          </StaggerItem>

          <StaggerItem
            className={cn(
              "w-full shrink-0 lg:sticky lg:top-12 lg:col-start-2",
              tablePagination.totalItems > 0 && "lg:row-start-2"
            )}
          >
          {isBulkSelection ? (
            <Card className={SIDE_PANEL_CARD}>
              <CardHeader className={SIDE_HEADER}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">Bulk QR</CardTitle>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {selectedIds.size} selected
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {selectionStats.mixed ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Mixed
                      </Badge>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Clear selection"
                      onClick={clearSelection}
                      disabled={bulkBusy || tokenLoading}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex h-5 items-center gap-1.5">
                  {selectionStats.active > 0 ? (
                    <Badge variant="success" className="text-[10px]">
                      {selectionStats.active} active
                    </Badge>
                  ) : null}
                  {selectionStats.inactive > 0 ? (
                    <Badge variant="destructive" className="text-[10px]">
                      {selectionStats.inactive} inactive
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col gap-3 pt-0">
                <div className={QR_SLOT}>
                  {tokenLoading ? (
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                  ) : (
                    <QrStackPreview count={selectedIds.size} frontToken={stackFrontToken} />
                  )}
                </div>
                <div className={ACTION_STACK}>
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <RefreshCw className="mr-2 size-4" />
                    Regenerate Token
                  </Button>
                  <Button
                    variant={
                      !bulkBusy && !tokenLoading && selectionStats.canActivate ? "default" : "outline"
                    }
                    className="w-full justify-start"
                    disabled={bulkBusy || tokenLoading || !selectionStats.canActivate}
                    onClick={() => void runBulk("activate")}
                  >
                    {bulkBusy ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 size-4" />
                    )}
                    Activate
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    disabled={bulkBusy || tokenLoading || !selectionStats.canDeactivate}
                    onClick={() => void runBulk("deactivate")}
                  >
                    <ShieldOff className="mr-2 size-4" />
                    Deactivate
                  </Button>
                  <Button
                    className="w-full justify-start"
                    disabled={bulkBusy || tokenLoading}
                    onClick={() => void runBulk("download")}
                  >
                    <Download className="mr-2 size-4" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : selected ? (
            <Card className={SIDE_PANEL_CARD}>
              <CardHeader className={SIDE_HEADER}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">{selected.name}</CardTitle>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {selected.unique_code} • {classDisplay(selected)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    aria-label="Clear selection"
                    onClick={clearSelection}
                    disabled={actionBusy}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="flex h-5 items-center">
                  <QrStatusBadge active={selected.check_in_token_active} />
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col gap-3 pt-0">
                <div className={QR_SLOT}>
                  {tokenLoading ? (
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                  ) : selected.check_in_token ? (
                    <QrCanvas
                      value={selected.check_in_token}
                      size={168}
                      className="rounded-lg shadow-xs"
                    />
                  ) : (
                    <p className="px-2 text-center text-sm text-muted-foreground">
                      No token yet — regenerate to create one.
                    </p>
                  )}
                </div>
                <div className={ACTION_STACK}>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleRegenerate}
                    disabled={actionBusy || tokenLoading}
                  >
                    {actionBusy ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 size-4" />
                    )}
                    Regenerate Token
                  </Button>
                  <Button
                    variant={
                      !actionBusy &&
                      !tokenLoading &&
                      !!selected.check_in_token &&
                      selected.check_in_token_active === false
                        ? "default"
                        : "outline"
                    }
                    className="w-full justify-start"
                    onClick={() => void toggleActive(true)}
                    disabled={
                      actionBusy ||
                      tokenLoading ||
                      !selected.check_in_token ||
                      selected.check_in_token_active !== false
                    }
                  >
                    <ShieldCheck className="mr-2 size-4" />
                    Activate
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={() => void toggleActive(false)}
                    disabled={
                      actionBusy ||
                      tokenLoading ||
                      !selected.check_in_token ||
                      selected.check_in_token_active === false
                    }
                  >
                    <ShieldOff className="mr-2 size-4" />
                    Deactivate
                  </Button>
                  <Button
                    className="w-full justify-start"
                    onClick={() => void downloadSelectedQr()}
                    disabled={tokenLoading || !selected.check_in_token}
                  >
                    <Download className="mr-2 size-4" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className={SIDE_PANEL_EMPTY}>
              <QrCode className={cn("mb-3 size-10 text-muted-foreground/40")} />
              <p className="text-sm text-muted-foreground">
                Click a row to select. Click again to deselect.
              </p>
            </div>
          )}
        </StaggerItem>
          {tablePagination.totalItems > 0 && (
            <StandardTablePagination
              {...tablePagination}
              loading={loading}
              placement="bottom"
              className="lg:col-start-1"
            />
          )}
        </div>
      </TableRevealProvider>
    </StaggerContainer>
  )
}
