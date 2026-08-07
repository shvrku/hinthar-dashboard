"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { RefreshCw, Download, Eye, Loader2, Search, QrCode, UserCheck } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { Student } from "@/lib/types"
import { useSortableData } from "@/lib/use-sortable-data"
import { useServerPagination } from "@/components/use-server-pagination"
import { StandardTablePagination } from "@/components/standard-table-pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
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

export default function CheckInManagementPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  // Current server page of students — always driven by listStudentsPage.
  const [pageStudents, setPageStudents] = React.useState<Student[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<Student | null>(null)
  const [regenerating, setRegenerating] = React.useState(false)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)
  const serverPg = useServerPagination(50)

  // Debounce search input ~300ms before it drives a server refetch.
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  const fetchPage = React.useCallback(async () => {
    const token = await getToken()
    if (!token) throw new Error("No auth token available")
    const api = createApi(token)
    const data = await api.listStudentsPage({
      page: serverPg.page,
      page_size: serverPg.pageSize,
      q: debouncedQuery || undefined,
    })
    setPageStudents(data.results)
    serverPg.setTotalItems(data.count)
  }, [getToken, serverPg.page, serverPg.pageSize, serverPg.setTotalItems, debouncedQuery])

  const loadStudents = React.useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setError(null)
    try {
      await fetchPage()
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [isSignedIn, fetchPage])

  // Once data has been loaded at least once, keep the server page in sync:
  // reset to page 1 when the search changes, and refetch whenever
  // page/pageSize/search change.
  const filterKeyRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (lastLoaded === null) return
    const filterKey = debouncedQuery
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
  }, [serverPg.page, serverPg.pageSize, debouncedQuery])

  // Sorting (client-side; only sorts the current server page)
  const { items: sortedStudents, requestSort, sortConfig } = useSortableData(pageStudents, "id", "asc")
  const displayedStudents = sortedStudents

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

  const totalStudentsCount = serverPg.totalItems

  const selectStudent = React.useCallback(async (student: Student) => {
    setError(null)
    // List payloads omit check_in_token (SEC-H2) — fetch via dedicated endpoint.
    if (student.check_in_token) {
      setSelected(student)
      return
    }
    setSelected({ ...student, check_in_token: undefined })
    if (!isSignedIn) return
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
    }
  }, [getToken, isSignedIn])

  const handleRegenerate = React.useCallback(async () => {
    if (!selected || !isSignedIn) return
    setRegenerating(true)
    setError(null)
    setSuccess(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const res = await api.regenerateCheckInToken(selected.id)
      const updatedToken = res.check_in_token
      
      setSelected((prev) => (prev ? { ...prev, check_in_token: updatedToken } : null))
      const studentId = selected.id
      setPageStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, check_in_token: updatedToken } : s))
      )
      setSuccess("Check-in token regenerated successfully.")
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to regenerate token")
    } finally {
      setRegenerating(false)
    }
  }, [selected, getToken, isSignedIn])

  const downloadQr = React.useCallback(() => {
    if (!selected) return
    const canvas = document.querySelector("canvas")
    if (!canvas) return
    const link = document.createElement("a")
    link.download = `check-in-${selected.name.replace(/\s+/g, "-").toLowerCase()}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }, [selected])

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-7xl">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <Table>
          <TableHeader>
            <TableRow>
              {["ID", "Name", "Check-in Token", "Actions"].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <AnimatedTableBody
            loading
            hasData={false}
            rowCount={5}
            skeletonRowCount={5}
            colSpan={4}
            skeleton={<TableSkeletonRows columns={4} rows={5} />}
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
        <p className="text-muted-foreground font-medium">Please sign in to view check-in codes.</p>
      </div>
    )
  }

  return (
    <StaggerContainer className="space-y-6">
      {/* Standardized Header */}
      <StaggerItem>
        <StandardPageHeader
          title="Check-In Management"
          description="View, generate, and export QR check-in codes for students."
          secondaryAction={buildReloadAction({
            hasLoaded: !!lastLoaded,
            loading,
            onClick: loadStudents,
          })}
        />
      </StaggerItem>

      {/* Metric Highlights Strip (Total Count Card + Auto-layout space) */}
      <StaggerItem>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Student Tokens</p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <QrCode className="size-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">{totalStudentsCount}</h2>
              {lastLoaded && (
                <span className="text-[11px] text-muted-foreground">Updated {lastLoaded}</span>
              )}
            </div>
          </Card>
        </div>
      </StaggerItem>

      {/* Toolbar */}
      <StaggerItem>
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {lastLoaded && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-3 py-1 text-xs">
                <UserCheck className="mr-1.5 size-3.5" />
                {`${totalStudentsCount} student${totalStudentsCount !== 1 ? "s" : ""}`}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Loaded {lastLoaded}
              </span>
            </div>
          )}
        </div>
      </StaggerItem>

      {/* Banners */}
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button size="xs" variant="ghost" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {success && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <span>{success}</span>
          <Button size="xs" variant="ghost" onClick={() => setSuccess(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row items-start">
        {/* Floating Student Table Card */}
        <StaggerItem className="min-w-0 flex-1 w-full">
          <TableRevealProvider>
          {tablePagination.totalItems > 0 && (
            <StandardTablePagination
              currentPage={tablePagination.currentPage}
              totalPages={tablePagination.totalPages}
              totalItems={tablePagination.totalItems}
              startIndex={tablePagination.startIndex}
              endIndex={tablePagination.endIndex}
              pageSize={tablePagination.pageSize}
              onPageChange={tablePagination.onPageChange}
              onPageSizeChange={tablePagination.onPageSizeChange}
              loading={loading}
              placement="top"
              className="mb-4"
            />
          )}
          <Card className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeadSortable
                      className="w-[100px]"
                      sortKey="id"
                      currentSortKey={sortConfig.key}
                      currentSortOrder={sortConfig.order}
                      onSort={requestSort}
                    >
                      ID
                    </TableHeadSortable>

                    <TableHeadSortable
                      className="w-[80px]"
                      sortKey="school_code"
                      currentSortKey={sortConfig.key}
                      currentSortOrder={sortConfig.order}
                      onSort={requestSort}
                    >
                      School
                    </TableHeadSortable>

                    <TableHeadSortable
                      sortKey="name"
                      currentSortKey={sortConfig.key}
                      currentSortOrder={sortConfig.order}
                      onSort={requestSort}
                    >
                      Name
                    </TableHeadSortable>

                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <AnimatedTableBody
                  loading={loading}
                  hasData={displayedStudents.length > 0}
                  rowCount={Math.min(serverPg.pageSize, 8)}
                  skeletonRowCount={Math.min(serverPg.pageSize, 8)}
                  colSpan={4}
                  skeleton={
                    <TableSkeletonRows
                      columns={4}
                      rows={Math.min(serverPg.pageSize, 8)}
                    />
                  }
                  emptyTitle="No students found"
                  emptyDescription="Try a different search or class filter."
                >
                  {displayedStudents.map((s) => (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer"
                      data-state={selected?.id === s.id ? "selected" : undefined}
                      onClick={() => setSelected(s)}
                    >
                      <TableCell className="font-semibold text-foreground">{s.unique_code}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{s.school_code}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelected(s)
                          }}
                        >
                          <Eye className="mr-1.5 size-3.5" />
                          QR
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </AnimatedTableBody>
              </Table>
            </Card>

            {tablePagination.totalItems > 0 && (
              <StandardTablePagination
                currentPage={tablePagination.currentPage}
                totalPages={tablePagination.totalPages}
                totalItems={tablePagination.totalItems}
                startIndex={tablePagination.startIndex}
                endIndex={tablePagination.endIndex}
                pageSize={tablePagination.pageSize}
                onPageChange={tablePagination.onPageChange}
                onPageSizeChange={tablePagination.onPageSizeChange}
                loading={loading}
                placement="bottom"
                className="mt-4"
              />
            )}
          </TableRevealProvider>
          </StaggerItem>

          {/* QR Detail Card */}
          <StaggerItem className="w-full lg:w-80 shrink-0 lg:sticky lg:top-20">
            {selected ? (
              <Card className="rounded-xl border border-border/80 bg-card shadow-2xs">
                <CardHeader>
                  <CardTitle className="text-base">{selected.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Code: {selected.unique_code} • School: {selected.school_code}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selected.check_in_token ? (
                    <div className="flex flex-col items-center gap-3">
                      <QrCanvas value={selected.check_in_token} size={180} className="rounded-lg shadow-xs" />
                      <p className="font-mono text-xs text-muted-foreground break-all text-center">
                        {selected.check_in_token}
                      </p>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No check-in token generated for this student.
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={handleRegenerate}
                      disabled={regenerating}
                    >
                      {regenerating ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 size-4" />
                      )}
                      Regenerate Token
                    </Button>
                    <Button onClick={downloadQr}>
                      <Download className="mr-2 size-4" />
                      Download QR Code
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center">
                <QrCode className="mb-3 size-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Select a student to view or download their QR code
                </p>
              </div>
            )}
          </StaggerItem>
        </div>
    </StaggerContainer>
  )
}
