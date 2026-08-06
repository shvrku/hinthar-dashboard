"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import {
  Search,
  Trash2,
  Undo2,
  Monitor,
  AlertTriangle,
} from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { CheckIn } from "@/lib/types"
import { useSortableData } from "@/lib/use-sortable-data"
import { useServerPagination } from "@/components/use-server-pagination"
import { StandardTablePagination } from "@/components/standard-table-pagination"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { StandardPageHeader, buildReloadAction } from "@/components/standard-page-header"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { cn, toLocalDateString } from "@/lib/utils"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableHeadSortable,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

function todayISO() {
  return toLocalDateString()
}

function checkInStudentId(row: CheckIn): number {
  if (typeof row.student === "object" && row.student !== null) return row.student.id
  if (row.student_id != null) return row.student_id
  return Number(row.student)
}

function checkInStudentCode(row: CheckIn): string | null {
  if (typeof row.student === "object" && row.student !== null) {
    return row.student.unique_code ?? null
  }
  return null
}

function formatTimestamp(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  })
}

function RowSkeleton() {
  return (
    <TableRow>
      {Array.from({ length: 7 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  )
}

export default function CheckInCorrectionsPage() {
  const { getToken, isSignedIn } = useAuth()
  const [rows, setRows] = React.useState<CheckIn[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)

  const [selectedDate, setSelectedDate] = React.useState(todayISO)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<"all" | "qr" | "manual">("all")

  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const [deletingId, setDeletingId] = React.useState<number | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [bulkConfirmOpen, setBulkConfirmOpen] = React.useState(false)
  const [bulkDeleting, setBulkDeleting] = React.useState(false)

  const serverPg = useServerPagination(50)

  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  const fetchPage = React.useCallback(async () => {
    const token = await getToken()
    if (!token) throw new Error("No auth token available")
    const api = createApi(token)
    const data = await api.listCheckInsPage({
      page: serverPg.page,
      page_size: serverPg.pageSize,
      date: selectedDate || undefined,
      q: debouncedQuery || undefined,
      check_in_type: typeFilter === "all" ? undefined : typeFilter,
    })
    setRows(data.results)
    serverPg.setTotalItems(data.count)
    setSelectedIds([])
  }, [
    getToken,
    serverPg.page,
    serverPg.pageSize,
    serverPg.setTotalItems,
    selectedDate,
    debouncedQuery,
    typeFilter,
  ])

  const loadData = React.useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await fetchPage()
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to load check-ins")
    } finally {
      setLoading(false)
    }
  }, [isSignedIn, fetchPage])

  const filterKeyRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (lastLoaded === null) return
    const filterKey = `${selectedDate}|${debouncedQuery}|${typeFilter}`
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
        else setError(err instanceof Error ? err.message : "Failed to load check-ins")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPg.page, serverPg.pageSize, selectedDate, debouncedQuery, typeFilter])

  const { items: sortedRows, requestSort, sortConfig } = useSortableData(rows, "timestamp", "desc")

  const allPageSelected =
    sortedRows.length > 0 && sortedRows.every((r) => selectedIds.includes(r.id))

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !sortedRows.some((r) => r.id === id)))
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const r of sortedRows) next.add(r.id)
        return Array.from(next)
      })
    }
  }

  const toggleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleDelete = async () => {
    if (deletingId == null) return
    setDeleting(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      await createApi(token).deleteCheckIn(deletingId)
      setSuccess(
        "Check-in removed. Auto-marked lesson attendance from this check-in was reverted to Absent. The student can check in again via Terminal."
      )
      setDeletingId(null)
      await fetchPage()
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to delete check-in")
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const res = await createApi(token).bulkDeleteCheckIns(selectedIds)
      const reverted =
        (res.reverted_session_attendances ?? 0) + (res.reverted_adhoc_attendances ?? 0)
      setSuccess(
        `Removed ${res.deleted_count} check-in(s)` +
          (reverted ? ` and reverted ${reverted} auto-marked attendance row(s)` : "") +
          ". Students can check in again via Terminal."
      )
      setBulkConfirmOpen(false)
      setSelectedIds([])
      await fetchPage()
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to delete check-ins")
    } finally {
      setBulkDeleting(false)
    }
  }

  const pendingDelete = deletingId != null ? rows.find((r) => r.id === deletingId) : null

  return (
    <StaggerContainer className="flex flex-col gap-6">
      <StaggerItem>
        <StandardPageHeader
          title="Check-In Corrections"
          description="Undo a mistaken campus check-in. Auto-marked lesson attendance from that check-in is reverted to Absent."
          secondaryAction={buildReloadAction({
            hasLoaded: !!lastLoaded,
            loading,
            onClick: loadData,
          })}
        />
      </StaggerItem>

      <StaggerItem>
        <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-foreground/70" />
          <p>
            Deleting a check-in clears campus presence for that day so the correct student can be
            scanned again. Lesson attendance statuses auto-marked by this exact check-in are also
            reverted to <span className="font-medium text-foreground">Absent</span>. Later manual
            roll changes are preserved; adjust any other changes on{" "}
            <Link href="/attendance/" className="underline underline-offset-2 hover:text-foreground">
              Session Attendance
            </Link>
            .
          </p>
        </div>
      </StaggerItem>

      {error && (
        <StaggerItem>
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        </StaggerItem>
      )}
      {success && (
        <StaggerItem>
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
            {success}
          </div>
        </StaggerItem>
      )}

      <StaggerItem>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
              aria-label="Check-in date"
            />
            <div className="relative min-w-[200px] flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search name or identifier…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
              {(["all", "qr", "manual"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors cursor-pointer",
                    typeFilter === t
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t === "all" ? "All types" : t === "qr" ? "QR" : "Manual"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkConfirmOpen(true)}
                className="gap-1.5"
              >
                <Trash2 className="size-4" />
                Delete ({selectedIds.length})
              </Button>
            )}
            <Link
              href="/check-in/terminal/"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            >
              <Monitor className="size-4" />
              Open Terminal
            </Link>
            {lastLoaded && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Loaded {lastLoaded}
              </span>
            )}
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <Card className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all on page"
                    disabled={sortedRows.length === 0}
                  />
                </TableHead>
                <TableHeadSortable
                  sortKey="student_name"
                  currentSortKey={sortConfig.key}
                  currentSortOrder={sortConfig.order}
                  onSort={requestSort}
                >
                  Student
                </TableHeadSortable>
                <TableHead>Identifier</TableHead>
                <TableHeadSortable
                  sortKey="timestamp"
                  currentSortKey={sortConfig.key}
                  currentSortOrder={sortConfig.order}
                  onSort={requestSort}
                >
                  Checked in
                </TableHeadSortable>
                <TableHead>Type</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)
              ) : lastLoaded === null ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Click &quot;Load Data&quot; to list check-ins for the selected date.
                  </TableCell>
                </TableRow>
              ) : sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No check-ins found for this date
                    {debouncedQuery ? " and search" : ""}.
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map((row) => {
                  const code = checkInStudentCode(row)
                  const isSelected = selectedIds.includes(row.id)
                  return (
                    <TableRow key={row.id} data-state={isSelected ? "selected" : undefined}>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectRow(row.id)}
                          aria-label={`Select check-in #${row.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{row.student_name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {code ?? `ID ${checkInStudentId(row)}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                        {formatTimestamp(row.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {row.check_in_type === "qr" ? "QR" : "Manual"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          title="Remove check-in"
                          onClick={() => setDeletingId(row.id)}
                        >
                          <Undo2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>
        {serverPg.totalItems > 0 && (
          <StandardTablePagination
            currentPage={serverPg.page}
            totalPages={serverPg.totalPages}
            totalItems={serverPg.totalItems}
            startIndex={serverPg.startIndex}
            endIndex={serverPg.endIndex}
            pageSize={serverPg.pageSize}
            onPageChange={serverPg.setPage}
            onPageSizeChange={serverPg.setPageSize}
            loading={loading}
          />
        )}
      </StaggerItem>

      <ConfirmDialog
        open={deletingId != null}
        title="Remove check-in?"
        description={
          pendingDelete
            ? `Remove campus check-in for ${pendingDelete.student_name} on ${pendingDelete.date}? They can check in again via Terminal.`
            : "Remove this check-in?"
        }
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        loading={deleting}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        title="Remove selected check-ins?"
        description={`Remove ${selectedIds.length} campus check-in(s)? Students can check in again via Terminal. Lesson attendance is not reverted.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkConfirmOpen(false)}
        loading={bulkDeleting}
      />
    </StaggerContainer>
  )
}
