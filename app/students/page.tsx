"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Plus, Pencil, Trash2, RotateCcw, Loader2, Search, UserCheck, Upload } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { createApi, ApiError } from "@/lib/api"
import { SCHOOL_CODES, type Student, StudentPayload } from "@/lib/types"
import { useSortableData } from "@/lib/use-sortable-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { StandardPageHeader } from "@/components/standard-page-header"
import { BulkImportModal } from "@/components/bulk-import-modal"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { usePagination } from "@/components/use-pagination"
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
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------
function TableSkeletonRow() {
  return (
    <TableRow>
      {Array.from({ length: 9 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  )
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
// Confirm dialog
// ---------------------------------------------------------------------------
function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
      <DialogContent onClose={onCancel}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [enrollmentDate, setEnrollmentDate] = React.useState("")
  const [contact, setContact] = React.useState("")
  const [examCandidateNumber, setExamCandidateNumber] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? "")
      setDob(initial?.dob ?? "")
      setEnrollmentDate(initial?.enrollment_date ? initial.enrollment_date.slice(0, 10) : "")
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

  const [students, setStudents] = React.useState<Student[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)

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

  const loadData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelectedIds([])
    try {
      const api = await getApi()
      const data = await api.listStudents()
      setStudents(data)
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
  }, [getApi])

  const [schoolFilter, setSchoolFilter] = React.useState<string>("all")

  const filteredStudents = React.useMemo(() => {
    if (!students) return []
    return students.filter((s) => {
      const matchesSchool = schoolFilter === "all" || s.school_code === schoolFilter
      if (!matchesSchool) return false
      if (searchQuery.trim() === "") return true
      const query = searchQuery.toLowerCase().trim()
      return (
        s.name.toLowerCase().includes(query) ||
        String(s.id).includes(query) ||
        (s.unique_code && s.unique_code.toLowerCase().includes(query)) ||
        (s.school_code && s.school_code.toLowerCase().includes(query)) ||
        (s.contact && s.contact.toLowerCase().includes(query))
      )
    })
  }, [students, schoolFilter, searchQuery])

  // Sorting
  const { items: sortedStudents, requestSort, sortConfig } = useSortableData(filteredStudents, "id", "asc")

  // Pagination
  const pagination = usePagination(sortedStudents, 10)

  // Selection handlers
  const currentPageIds = React.useMemo(
    () => pagination.paginatedItems.map((s) => s.id),
    [pagination.paginatedItems]
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
      const data = await api.listStudents()
      setStudents(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred during bulk delete")
      }
    } finally {
      setBulkDeleting(false)
    }
  }, [getApi, selectedIds])

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
        const data = await api.listStudents()
        setStudents(data)
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
    [getApi, editingStudent],
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
      const data = await api.listStudents()
      setStudents(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
      }
    } finally {
      setDeleting(false)
    }
  }, [getApi, deletingId])

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
      <StandardPageHeader
        title="Students"
        description="Manage student profiles, contact info, and enrollments."
        primaryAction={{
          label: "Add Student",
          onClick: openCreateModal,
          icon: <Plus className="size-4" />,
        }}
        secondaryAction={{
          label: loading ? "Loading..." : "Load Data",
          onClick: loadData,
          icon: loading ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />,
        }}
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

      {/* Metric Highlights Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -2, transition: { duration: 0.15 } }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Students</p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <UserCheck className="size-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">{students ? students.length : 0}</h2>
              {lastLoaded && (
                <span className="text-[11px] text-muted-foreground">Updated {lastLoaded}</span>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Standardized Management Toolbar Card */}
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

            {lastLoaded && students && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="px-3 py-1 text-xs">
                  <UserCheck className="mr-1.5 size-3.5" />
                  {filteredStudents.length} of {students.length} student{students.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </Card>

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
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <span>{success}</span>
          <Button size="xs" variant="ghost" onClick={() => setSuccess(null)}>
            Dismiss
          </Button>
        </div>
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
                {loading && !students ? (
                  Array.from({ length: 5 }).map((_, i) => <TableSkeletonRow key={i} />)
                ) : sortedStudents && sortedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      {students === null ? 'Click "Load Data" to fetch students.' : 'No students found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.paginatedItems.map((student) => {
                    const isSelected = selectedIds.includes(student.id)
                    return (
                      <TableRow key={student.id} data-state={isSelected ? "selected" : undefined}>
                        <TableCell className="text-center">
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
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
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
      {sortedStudents && sortedStudents.length > 0 && (
        <StaggerItem>
          <StandardTablePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setCurrentPage}
            onPageSizeChange={pagination.setPageSize}
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
        message={
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
        message={`Are you sure you want to delete ${selectedIds.length} selected student(s)? This action cannot be undone.`}
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
