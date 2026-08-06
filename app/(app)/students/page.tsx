"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Loader2, Search, UserCheck, Upload, Eye } from "lucide-react"
import Link from "next/link"
import { createApi, ApiError } from "@/lib/api"
import { SCHOOL_CODES, type Student, StudentPayload } from "@/lib/types"
import { useSortableData } from "@/lib/use-sortable-data"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { StandardPageHeader, buildReloadAction } from "@/components/standard-page-header"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { BulkImportModal } from "@/components/bulk-import-modal"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { useServerPagination } from "@/components/use-server-pagination"
import { StandardTablePagination } from "@/components/standard-table-pagination"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { StudentTableSkeletonRows } from "@/components/page-skeletons"

// ---------------------------------------------------------------------------
// Skeleton row (legacy export — use StudentTableSkeletonRows)
// ---------------------------------------------------------------------------
function TableSkeletonRow() {
  return <StudentTableSkeletonRows rows={1} />
}

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
      <TooltipTrigger className={cn("group/trunc relative block w-full text-left focus:outline-none cursor-pointer", className)}>
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

// ---------------------------------------------------------------------------
// Student form modal (create / edit)
// ---------------------------------------------------------------------------
function StudentFormModal({
  open,
  initial,
  onClose,
  onSave,
  saving,
  schoolCode,
  setSchoolCode,
}: {
  open: boolean
  initial: Student | null
  onClose: () => void
  onSave: (payload: StudentPayload) => Promise<void>
  saving: boolean
  schoolCode: string
  setSchoolCode: (val: string) => void
}) {
  const [name, setName] = React.useState("")
  const [dob, setDob] = React.useState("")
  const [enrollmentDate, setEnrollmentDate] = React.useState(() => toLocalDateString())
  const [contact, setContact] = React.useState("")
  const [examCandidateNumber, setExamCandidateNumber] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? "")
      setDob(initial?.dob ?? "")
      setEnrollmentDate(
        initial?.enrollment_date
          ? initial.enrollment_date.slice(0, 10)
          : toLocalDateString()
      )
      setContact(initial?.contact ?? "")
      setExamCandidateNumber(initial?.exam_candidate_number ?? "")
    }
  }, [open, initial])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const payload: StudentPayload = { name: name.trim(), school_code: schoolCode }
    if (dob) payload.dob = dob
    if (enrollmentDate) payload.enrollment_date = enrollmentDate
    if (contact.trim()) payload.contact = contact.trim()
    if (examCandidateNumber.trim()) payload.exam_candidate_number = examCandidateNumber.trim()
    await onSave(payload)
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Student" : "Add Student"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "Update student information below."
              : "Enter details for the new student record."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              School Code <span className="text-destructive">*</span>
            </label>
            <Select value={schoolCode} onValueChange={(val) => val && setSchoolCode(val)}>
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Student full name"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Date of Birth</label>
            <Input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Enrollment Date</label>
            <Input
              type="date"
              value={enrollmentDate}
              onChange={(e) => setEnrollmentDate(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Contact Information</label>
            <Input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Phone number or email"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Exam Candidate Number</label>
            <Input
              type="text"
              value={examCandidateNumber}
              onChange={(e) => setExamCandidateNumber(e.target.value)}
              placeholder="Exam candidate identifier"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {initial ? "Save Changes" : "Create Student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ===========================================================================
// Page component
// ===========================================================================
export default function StudentsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const router = useRouter()

  // Current server page of students — always driven by listStudentsPage.
  const [pageStudents, setPageStudents] = React.useState<Student[]>([])
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

  // Modal & form state
  const [modalOpen, setModalOpen] = React.useState(false)
  const [bulkModalOpen, setBulkModalOpen] = React.useState(false)
  const [editingStudent, setEditingStudent] = React.useState<Student | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [schoolCode, setSchoolCode] = React.useState<string>("HIS")

  // Delete confirmation
  const [deletingId, setDeletingId] = React.useState<number | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  // Auto-dismiss success message
  React.useEffect(() => {
    if (!success) return
    const id = setTimeout(() => setSuccess(null), 4000)
    return () => clearTimeout(id)
  }, [success])

  // --- Helpers ---
  const getApi = React.useCallback(async () => {
    const token = await getToken()
    if (!token) throw new Error("No auth token available")
    return createApi(token)
  }, [getToken])

  const [schoolFilter, setSchoolFilter] = React.useState<string>("all")

  const fetchPage = React.useCallback(async () => {
    const api = await getApi()
    const data = await api.listStudentsPage({
      page: serverPg.page,
      page_size: serverPg.pageSize,
      q: debouncedQuery || undefined,
      school_code: schoolFilter === "all" ? undefined : schoolFilter,
    })
    setPageStudents(data.results)
    serverPg.setTotalItems(data.count)
  }, [getApi, serverPg.page, serverPg.pageSize, serverPg.setTotalItems, debouncedQuery, schoolFilter])

  const loadData = React.useCallback(async () => {
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
        setError(err instanceof Error ? err.message : "Failed to load students")
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
    const filterKey = `${debouncedQuery}|${schoolFilter}`
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
        else setError(err instanceof Error ? err.message : "Failed to load students")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPg.page, serverPg.pageSize, debouncedQuery, schoolFilter])

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

  // Selection handlers
  const currentPageIds = React.useMemo(
    () => displayedStudents.map((s) => s.id),
    [displayedStudents]
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
      const res = await api.bulkDeleteStudents(selectedIds)
      setSuccess(`Successfully deleted ${res.deleted_count} student(s).`)
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

  const handleSave = React.useCallback(
    async (payload: StudentPayload) => {
      setSaving(true)
      setError(null)
      try {
        const api = await getApi()
        if (editingStudent) {
          await api.updateStudent(editingStudent.id, payload)
          setSuccess(`Student "${payload.name}" updated successfully.`)
        } else {
          await api.createStudent(payload)
          setSuccess(`Student "${payload.name}" created successfully.`)
        }
        setModalOpen(false)
        setEditingStudent(null)
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
    },
    [getApi, editingStudent, fetchPage],
  )

  const handleDelete = React.useCallback(async () => {
    if (deletingId === null) return
    setDeleting(true)
    setError(null)
    try {
      const api = await getApi()
      await api.deleteStudent(deletingId)
      setSuccess("Student deleted successfully.")
      setDeletingId(null)
      setSelectedIds((prev) => prev.filter((id) => id !== deletingId))
      await fetchPage()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
      }
    } finally {
      setDeleting(false)
    }
  }, [getApi, deletingId, fetchPage])

  const openCreateModal = () => {
    setEditingStudent(null)
    setSchoolCode("HIS")
    setModalOpen(true)
  }

  const openEditModal = (student: Student) => {
    setEditingStudent(student)
    setSchoolCode(student.school_code)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingStudent(null)
  }

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-7xl">
        <div className="mb-8 h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="mb-6 h-4 w-72 animate-pulse rounded-lg bg-muted" />
        <div className="rounded-xl border border-border/70 p-6 space-y-4">
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
        <p className="text-muted-foreground font-medium">Please sign in to view students.</p>
      </div>
    )
  }

  return (
    <StaggerContainer className="space-y-6">
      {/* Standardized Header */}
      <StaggerItem>
        <StandardPageHeader
          title="Students"
          description="Manage student profiles, contact info, and enrollments."
          primaryAction={{
            label: "Add Student",
            onClick: openCreateModal,
            icon: <Plus className="size-4" />,
          }}
          secondaryAction={buildReloadAction({
            hasLoaded: lastLoaded !== null,
            loading,
            onClick: loadData,
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
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Students</p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <UserCheck className="size-4" />
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

      {/* Standardized Management Toolbar Card */}
      <StaggerItem>
      <Card className="p-4 mb-6 shadow-2xs border-border/80 bg-card">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search students by name, code, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={schoolFilter} onValueChange={(val) => setSchoolFilter(val ?? "all")}>
              <SelectTrigger className="w-36 text-xs">
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
                  {`${totalStudentsCount} student${totalStudentsCount !== 1 ? "s" : ""}`}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </Card>
      </StaggerItem>

      {/* Banners */}
      {error && (
        <StaggerItem>
        <div className="mb-6 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button size="xs" variant="ghost" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
        </StaggerItem>
      )}

      {success && (
        <StaggerItem>
        <div className="mb-6 flex items-center justify-between rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <span>{success}</span>
          <Button size="xs" variant="ghost" onClick={() => setSuccess(null)}>
            Dismiss
          </Button>
        </div>
        </StaggerItem>
      )}

      {/* Floating Table Card */}
      <StaggerItem>
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
                    className="min-w-[90px]"
                    sortKey="dob"
                    currentSortKey={sortConfig.key}
                    currentSortOrder={sortConfig.order}
                    onSort={requestSort}
                  >
                    DOB
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

                  <TableHeadSortable
                    className="min-w-[100px]"
                    sortKey="exam_candidate_number"
                    currentSortKey={sortConfig.key}
                    currentSortOrder={sortConfig.order}
                    onSort={requestSort}
                  >
                    UCI
                  </TableHeadSortable>

                  <TableHeadSortable
                    className="min-w-[120px]"
                    sortKey="enrollment_date"
                    currentSortKey={sortConfig.key}
                    currentSortOrder={sortConfig.order}
                    onSort={requestSort}
                  >
                    Enrollment
                  </TableHeadSortable>

                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableSkeletonRow key={i} />)
                ) : displayedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      {lastLoaded === null ? 'Click "Load Data" to fetch students.' : 'No students found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedStudents.map((student) => {
                    const isSelected = selectedIds.includes(student.id)
                    return (
                      <TableRow key={student.id} data-state={isSelected ? "selected" : undefined} className="cursor-pointer" onClick={() => router.push(`/students/${student.id}/`)}>
                        <TableCell className="text-center" onClick={(event) => event.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectRow(student.id)}
                            aria-label={`Select student ${student.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">{student.unique_code}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-normal">
                            {student.school_code}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          <TruncatedContent value={student.name} className="font-medium text-foreground" />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{student.dob ?? "—"}</TableCell>
                        <TableCell className="max-w-[140px]">
                          <TruncatedContent value={student.contact} />
                        </TableCell>
                        <TableCell className="max-w-[140px]">
                          <TruncatedContent value={student.exam_candidate_number} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{student.enrollment_date}</TableCell>
                        <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/students/${student.id}/`}
                              title="View profile"
                              className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Eye className="size-4" />
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditModal(student)}
                              aria-label={`Edit ${student.name}`}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingId(student.id)}
                              aria-label={`Delete ${student.name}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TooltipProvider>
      </StaggerItem>

      {/* Standardized Table Pagination Footer */}
      {tablePagination.totalItems > 0 && (
        <StaggerItem>
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
          />
        </StaggerItem>
      )}

      {/* Form modal */}
      <StudentFormModal
        open={modalOpen}
        initial={editingStudent}
        onClose={closeModal}
        onSave={handleSave}
        saving={saving}
        schoolCode={schoolCode}
        setSchoolCode={setSchoolCode}
      />

      {/* Single delete confirmation */}
      <ConfirmDialog
        open={deletingId !== null}
        title="Delete Student"
        description={
          deletingId !== null
            ? `Are you sure you want to delete student #${deletingId}? This action cannot be undone.`
            : ""
        }
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        loading={deleting}
      />

      {/* Bulk delete confirmation */}
      <ConfirmDialog
        open={bulkConfirmOpen}
        title="Delete Multiple Students"
        description={`Are you sure you want to delete ${selectedIds.length} selected student(s)? This action cannot be undone.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkConfirmOpen(false)}
        loading={bulkDeleting}
      />

      {/* CSV Bulk Import Modal */}
      <BulkImportModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        entityType="student"
        onImport={async (items) => {
          const api = await getApi()
          return api.bulkCreateStudents(items)
        }}
        onSuccess={(count) => {
          setSuccess(`Successfully imported ${count} student(s).`)
          loadData()
        }}
      />
    </StaggerContainer>
  )
}
