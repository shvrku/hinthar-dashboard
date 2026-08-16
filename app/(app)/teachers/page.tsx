"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Loader2, Search, UserCheck, Upload } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { BulkImportModal } from "@/components/bulk-import-modal"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { AnimatedTableBody } from "@/components/animation/animated-table-body"
import { TableRevealProvider } from "@/components/animation/table-reveal-context"
import {
  type Teacher,
  type TeacherPayload,
  EMPLOYMENT_TYPES,
  SCHOOL_CODES,
} from "@/lib/types"
import { useSortableData } from "@/lib/use-sortable-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { StandardPageHeader, buildReloadAction } from "@/components/standard-page-header"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useServerPagination } from "@/components/use-server-pagination"
import { StandardTablePagination } from "@/components/standard-table-pagination"
import {
  Table,
  TableHeader,
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
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { cn, toLocalDateString } from "@/lib/utils"
import { TeacherTableSkeletonRows } from "@/components/page-skeletons"

// ---------------------------------------------------------------------------
// Truncated cell content with tooltip
// ---------------------------------------------------------------------------
function TruncatedContent({
  value,
  className = "",
}: {
  value: string | null | undefined
  className?: string
}) {
  if (!value || !value.trim()) return <span className="text-muted-foreground">—</span>
  const text = value.trim()
  return (
    <Tooltip>
      <TooltipTrigger onClick={(event) => event.stopPropagation()} className={cn("group/trunc relative block w-full text-left focus:outline-none cursor-pointer", className)}>
        <span className="block truncate transition-colors duration-150 group-hover/trunc:text-primary group-hover/trunc:underline decoration-dashed decoration-primary/40 underline-offset-3">
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs break-words text-xs font-normal shadow-lg border border-border/80 bg-popover text-popover-foreground px-3 py-2 rounded-xl space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Full Text</p>
        <p className="text-xs font-medium text-foreground">{text}</p>
      </TooltipContent>
    </Tooltip>
  )
}

interface FormData {
  name: string
  employment_type: string
  join_date: string
  contact: string
}

const EMPTY_FORM: FormData = {
  name: "",
  employment_type: "",
  join_date: "",
  contact: "",
}

function TeacherFormModal({
  editing,
  initial,
  onSave,
  onClose,
  saving,
  schoolCode,
  onSchoolCodeChange,
}: {
  editing: Teacher | null
  initial: FormData
  onSave: (data: TeacherPayload) => void
  onClose: () => void
  saving: boolean
  schoolCode: string
  onSchoolCodeChange: (sc: string) => void
}) {
  const [form, setForm] = React.useState<FormData>(initial)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return

    const payload: TeacherPayload = {
      name: form.name.trim(),
      school_code: schoolCode,
      employment_type:
        form.employment_type === "" ? null : (form.employment_type as TeacherPayload["employment_type"]),
      join_date: form.join_date || null,
      contact: form.contact.trim() === "" ? null : form.contact.trim(),
    }
    onSave(payload)
  }

  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Teacher" : "Add Teacher"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update teacher information and employment settings."
              : "Create a new teacher profile."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              School Code <span className="text-destructive">*</span>
            </label>
            <Select
              value={schoolCode}
              onValueChange={(value) => onSchoolCodeChange(value ?? "")}
            >
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue placeholder="Select School Code" />
              </SelectTrigger>
              <SelectContent>
                {SCHOOL_CODES.map((sc) => (
                  <SelectItem key={sc.value} value={sc.value}>
                    {sc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Teacher name"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Employment Type
            </label>
            <Select
              items={[{ value: "none", label: "None" }, ...EMPLOYMENT_TYPES]}
              value={form.employment_type || "none"}
              onValueChange={(val) =>
                setForm((prev) => ({
                  ...prev,
                  employment_type: !val || val === "none" ? "" : val,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {EMPLOYMENT_TYPES.map((et) => (
                  <SelectItem key={et.value} value={et.value}>
                    {et.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Join Date
            </label>
            <Input
              type="date"
              name="join_date"
              value={form.join_date}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Contact</label>
            <Input
              type="text"
              name="contact"
              value={form.contact}
              onChange={handleChange}
              placeholder="Phone number or email"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Teacher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function TeachersPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const router = useRouter()

  // Current server page of teachers — always driven by listTeachersPage.
  const [pageTeachers, setPageTeachers] = React.useState<Teacher[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
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

  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const [bulkDeleting, setBulkDeleting] = React.useState(false)
  const [bulkConfirmOpen, setBulkConfirmOpen] = React.useState(false)
  const [bulkModalOpen, setBulkModalOpen] = React.useState(false)

  const [showForm, setShowForm] = React.useState(false)
  const [editing, setEditing] = React.useState<Teacher | null>(null)
  const [formInitial, setFormInitial] = React.useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)

  const [deleting, setDeleting] = React.useState<Teacher | null>(null)
  const [deletingInProgress, setDeletingInProgress] = React.useState(false)

  const [schoolCode, setSchoolCode] = React.useState<string>("HIS")

  React.useEffect(() => {
    if (!success) return
    const id = setTimeout(() => setSuccess(null), 4000)
    return () => clearTimeout(id)
  }, [success])

  const getApi = React.useCallback(async () => {
    const token = await getToken()
    if (!token) throw new Error("No auth token available")
    return createApi(token)
  }, [getToken])

  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [schoolFilter, setSchoolFilter] = React.useState<string>("all")

  const fetchPage = React.useCallback(async () => {
    const api = await getApi()
    const data = await api.listTeachersPage({
      page: serverPg.page,
      page_size: serverPg.pageSize,
      q: debouncedQuery || undefined,
      school_code: schoolFilter === "all" ? undefined : schoolFilter,
      employment_type: typeFilter === "all" ? undefined : typeFilter,
    })
    setPageTeachers(data.results)
    serverPg.setTotalItems(data.count)
  }, [getApi, serverPg.page, serverPg.pageSize, serverPg.setTotalItems, debouncedQuery, schoolFilter, typeFilter])

  const loadTeachers = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelectedIds([])
    try {
      await fetchPage()
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to load teachers")
      }
    } finally {
      setLoading(false)
    }
  }, [fetchPage])

  // Once data has been loaded at least once, keep the server page in sync:
  // reset to page 1 when search/filter changes, and refetch whenever
  // page/pageSize/search/filter change.
  const filterKeyRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (lastLoaded === null) return
    const filterKey = `${debouncedQuery}|${schoolFilter}|${typeFilter}`
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
        else setError(err instanceof Error ? err.message : "Failed to load teachers")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPg.page, serverPg.pageSize, debouncedQuery, schoolFilter, typeFilter])

  // Sorting (client-side; only sorts the current server page)
  const { items: sortedTeachers, requestSort, sortConfig } = useSortableData(pageTeachers, "id", "asc")
  const displayedTeachers = sortedTeachers

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

  const totalTeachersCount = serverPg.totalItems

  // Selection handlers
  const currentPageIds = React.useMemo(
    () => displayedTeachers.map((t) => t.id),
    [displayedTeachers]
  )
  const allCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id))

  const toggleSelectAll = () => {
    if (allCurrentPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])))
    }
  }

  const toggleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleBulkDelete = React.useCallback(async () => {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    setError(null)
    try {
      const api = await getApi()
      const res = await api.bulkDeleteTeachers(selectedIds)
      setSuccess(`Successfully deleted ${res.deleted_count} teacher(s).`)
      setSelectedIds([])
      setBulkConfirmOpen(false)
      await fetchPage()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred during bulk delete")
      }
    } finally {
      setBulkDeleting(false)
    }
  }, [getApi, selectedIds, fetchPage])

  const openAddModal = () => {
    setEditing(null)
    setFormInitial({ ...EMPTY_FORM, join_date: toLocalDateString() })
    setSchoolCode("HIS")
    setShowForm(true)
  }

  const openEditModal = (teacher: Teacher) => {
    setEditing(teacher)
    setFormInitial({
      name: teacher.name,
      employment_type: teacher.employment_type ?? "",
      join_date: teacher.join_date ? teacher.join_date.slice(0, 10) : "",
      contact: teacher.contact ?? "",
    })
    setSchoolCode(teacher.school_code)
    setShowForm(true)
  }

  const closeFormModal = () => {
    setShowForm(false)
    setEditing(null)
  }

  const handleSave = async (payload: TeacherPayload) => {
    setSaving(true)
    setError(null)
    try {
      const api = await getApi()
      if (editing) {
        await api.updateTeacher(editing.id, payload)
        setSuccess(`Teacher "${payload.name}" updated successfully.`)
      } else {
        await api.createTeacher(payload)
        setSuccess(`Teacher "${payload.name}" created successfully.`)
      }
      closeFormModal()
      await fetchPage()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleting) return
    setDeletingInProgress(true)
    setError(null)
    try {
      const api = await getApi()
      await api.deleteTeacher(deleting.id)
      setSuccess(`Teacher "${deleting.name}" deleted.`)
      setSelectedIds((prev) => prev.filter((id) => id !== deleting.id))
      setDeleting(null)
      await fetchPage()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
      }
    } finally {
      setDeletingInProgress(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="container mx-auto max-w-7xl px-4 pb-6 sm:px-6 md:px-8 md:pb-8">
        <div className="mb-8 h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="mb-6 h-4 w-72 animate-pulse rounded-lg bg-muted" />
        <div className="rounded-xl border p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-full animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground font-medium">Please sign in to view teachers.</p>
      </div>
    )
  }

  return (
    <StaggerContainer className="space-y-6">
      {/* Standardized Header */}
      <StaggerItem>
        <StandardPageHeader
          title="Teachers"
          primaryAction={{
            label: "Add Teacher",
            onClick: openAddModal,
            icon: <Plus className="size-4" />,
          }}
          secondaryAction={buildReloadAction({
            hasLoaded: lastLoaded !== null,
            loading,
            onClick: loadTeachers,
          })}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkModalOpen(true)}
            className="gap-1.5"
          >
            <Upload className="size-4" />
            Import CSV
          </Button>
        </StandardPageHeader>
      </StaggerItem>

      {/* Metric Highlights Strip */}
      <StaggerItem>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Teachers</p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <UserCheck className="size-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">{totalTeachersCount}</h2>
              {lastLoaded && (
                <span className="text-[11px] text-muted-foreground">Updated {lastLoaded}</span>
              )}
            </div>
          </Card>
        </div>
      </StaggerItem>

      {/* Standardized Management Toolbar Card */}
      <StaggerItem>
        <Card className="p-4 mb-6 shadow-2xs border-border/80 bg-card">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search teachers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={schoolFilter} onValueChange={(val) => setSchoolFilter(val ?? "all")}>
                <SelectTrigger className="w-32 text-xs">
                  <SelectValue>
                    {schoolFilter === "all" ? "All Schools" : schoolFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {SCHOOL_CODES.map((sc) => (
                    <SelectItem key={sc.value} value={sc.value}>
                      {sc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val ?? "all")}>
                <SelectTrigger className="w-36 text-xs">
                  <SelectValue>
                    {typeFilter === "all" ? "All Types" : (EMPLOYMENT_TYPES.find((t) => t.value === typeFilter)?.label ?? typeFilter)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {selectedIds.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkConfirmOpen(true)}
                  className="gap-1.5"
                >
                  <Trash2 className="size-4" />
                  Delete Selected ({selectedIds.length})
                </Button>
              )}

              {lastLoaded && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="px-3 py-1 text-xs">
                    <UserCheck className="mr-1.5 size-3.5" />
                    {`${totalTeachersCount} teacher${totalTeachersCount !== 1 ? "s" : ""}`}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </Card>
      </StaggerItem>

      {/* Banners */}
      {success && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <span>{success}</span>
          <Button size="xs" variant="ghost" onClick={() => setSuccess(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button size="xs" variant="ghost" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Floating Table Card */}
      <StaggerItem>
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
        <TooltipProvider>
          <Card className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={allCurrentPageSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all current page"
                    />
                  </TableHead>

                  <TableHeadSortable
                    className="min-w-[130px]"
                    sortKey="unique_code"
                    currentSortKey={sortConfig.key}
                    currentSortOrder={sortConfig.order}
                    onSort={requestSort}
                  >
                    Identifier
                  </TableHeadSortable>

                  <TableHeadSortable
                    className="min-w-[90px]"
                    sortKey="school_code"
                    currentSortKey={sortConfig.key}
                    currentSortOrder={sortConfig.order}
                    onSort={requestSort}
                  >
                    School
                  </TableHeadSortable>

                  <TableHeadSortable
                    className="min-w-[140px]"
                    sortKey="name"
                    currentSortKey={sortConfig.key}
                    currentSortOrder={sortConfig.order}
                    onSort={requestSort}
                  >
                    Name
                  </TableHeadSortable>

                  <TableHeadSortable
                    className="min-w-[100px]"
                    sortKey="employment_type"
                    currentSortKey={sortConfig.key}
                    currentSortOrder={sortConfig.order}
                    onSort={requestSort}
                  >
                    Type
                  </TableHeadSortable>

                  <TableHeadSortable
                    className="min-w-[130px]"
                    sortKey="contact"
                    currentSortKey={sortConfig.key}
                    currentSortOrder={sortConfig.order}
                    onSort={requestSort}
                  >
                    Contact
                  </TableHeadSortable>

                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <AnimatedTableBody
                loading={loading}
                hasData={displayedTeachers.length > 0}
                rowCount={Math.min(serverPg.pageSize, 8)}
                skeletonRowCount={Math.min(serverPg.pageSize, 8)}
                colSpan={7}
                skeleton={
                  <TeacherTableSkeletonRows rows={Math.min(serverPg.pageSize, 8)} />
                }
                idle={lastLoaded === null}
                idleTitle="No teachers loaded yet"
                idleDescription="Use Load Data in the toolbar to fetch the teacher list."
                emptyTitle="No teachers found"
                emptyDescription="Try adjusting search or filters, then load again."
              >
                {displayedTeachers.map((t) => {
                  const isSelected = selectedIds.includes(t.id)
                  return (
                    <TableRow key={t.id} data-state={isSelected ? "selected" : undefined} className="cursor-pointer" onClick={() => router.push(`/teachers/${t.id}/`)}>
                      <TableCell className="text-center" onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectRow(t.id)}
                          aria-label={`Select teacher ${t.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">{t.unique_code}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{t.school_code}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <TruncatedContent value={t.name} className="font-semibold text-foreground" />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {EMPLOYMENT_TYPES.find((et) => et.value === t.employment_type)?.label ?? t.employment_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[140px]">
                        <TruncatedContent value={t.contact} />
                      </TableCell>
                      <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEditModal(t)}
                            title="Edit"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleting(t)}
                            title="Delete"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </AnimatedTableBody>
            </Table>
          </Card>
        </TooltipProvider>
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

      {/* Form modal */}
      {showForm && (
        <TeacherFormModal
          editing={editing}
          initial={formInitial}
          onSave={handleSave}
          onClose={closeFormModal}
          saving={saving}
          schoolCode={schoolCode}
          onSchoolCodeChange={setSchoolCode}
        />
      )}

      {/* Single Delete dialog */}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete Teacher"
        description={
          deleting
            ? `Are you sure you want to delete ${deleting.name}? This action cannot be undone.`
            : ""
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleting(null)}
        loading={deletingInProgress}
      />

      {/* Bulk Delete dialog */}
      <ConfirmDialog
        open={bulkConfirmOpen}
        title="Delete Multiple Teachers"
        description={`Are you sure you want to delete ${selectedIds.length} selected teacher(s)? This action cannot be undone.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkConfirmOpen(false)}
        loading={bulkDeleting}
      />

      {/* CSV Bulk Import Modal */}
      <BulkImportModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        entityType="teacher"
        onImport={async (items) => {
          const api = await getApi()
          return api.bulkCreateTeachers(items)
        }}
        onSuccess={(count) => {
          setSuccess(`Successfully imported ${count} teacher(s).`)
          loadTeachers()
        }}
      />
    </StaggerContainer>
  )
}
