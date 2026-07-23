"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Plus, Pencil, Trash2, RotateCcw, Loader2, Search, UserCheck } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import {
  type Teacher,
  type TeacherPayload,
  EMPLOYMENT_TYPES,
} from "@/lib/types"
import { useSortableData } from "@/lib/use-sortable-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { StandardPageHeader } from "@/components/standard-page-header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------
function TableSkeletonRow() {
  return (
    <TableRow>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Delete confirmation dialog
// ---------------------------------------------------------------------------
function DeleteDialog({
  teacher,
  onConfirm,
  onCancel,
  deleting,
}: {
  teacher: Teacher
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}) {
  return (
    <Dialog open={true} onOpenChange={(val) => !val && onCancel()}>
      <DialogContent onClose={onCancel}>
        <DialogHeader>
          <DialogTitle>Delete Teacher</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{teacher.name}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface FormData {
  name: string
  employment_type: string
  default_rate: string
  contact: string
  bank_details: string
}

const EMPTY_FORM: FormData = {
  name: "",
  employment_type: "",
  default_rate: "",
  contact: "",
  bank_details: "",
}

function TeacherFormModal({
  editing,
  initial,
  onSave,
  onClose,
  saving,
}: {
  editing: Teacher | null
  initial: FormData
  onSave: (data: TeacherPayload) => void
  onClose: () => void
  saving: boolean
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
      employment_type:
        form.employment_type === "" ? null : (form.employment_type as TeacherPayload["employment_type"]),
      default_rate:
        form.default_rate.trim() === "" ? null : form.default_rate.trim(),
      contact: form.contact.trim() === "" ? null : form.contact.trim(),
      bank_details:
        form.bank_details.trim() === "" ? null : form.bank_details.trim(),
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
              value={form.employment_type || "none"}
              onValueChange={(val) =>
                setForm((prev) => ({
                  ...prev,
                  employment_type: !val || val === "none" ? "" : val,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Employment Type" />
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
              Default Rate
            </label>
            <Input
              type="text"
              name="default_rate"
              value={form.default_rate}
              onChange={handleChange}
              placeholder="e.g. 50000"
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

          <div>
            <label className="mb-1.5 block text-sm font-medium">Bank Details</label>
            <Input
              type="text"
              name="bank_details"
              value={form.bank_details}
              onChange={handleChange}
              placeholder="Bank account or payment info"
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

  const [teachers, setTeachers] = React.useState<Teacher[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)

  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const [bulkDeleting, setBulkDeleting] = React.useState(false)
  const [bulkConfirmOpen, setBulkConfirmOpen] = React.useState(false)

  const [showForm, setShowForm] = React.useState(false)
  const [editing, setEditing] = React.useState<Teacher | null>(null)
  const [formInitial, setFormInitial] = React.useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)

  const [deleting, setDeleting] = React.useState<Teacher | null>(null)
  const [deletingInProgress, setDeletingInProgress] = React.useState(false)

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

  const loadTeachers = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelectedIds([])
    try {
      const api = await getApi()
      const data = await api.listTeachers()
      setTeachers(data)
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
  }, [getApi])

  const [typeFilter, setTypeFilter] = React.useState<string>("all")

  const filteredTeachers = React.useMemo(() => {
    return teachers.filter((t) => {
      const matchesType = typeFilter === "all" || t.employment_type === typeFilter
      if (!matchesType) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        t.name.toLowerCase().includes(q) ||
        String(t.id).includes(q) ||
        (t.contact && t.contact.toLowerCase().includes(q)) ||
        (t.employment_type && t.employment_type.toLowerCase().includes(q))
      )
    })
  }, [teachers, typeFilter, searchQuery])

  // Sorting
  const { items: sortedTeachers, requestSort, sortConfig } = useSortableData(filteredTeachers, "id", "asc")

  // Pagination
  const pagination = usePagination(sortedTeachers, 10)

  // Selection handlers
  const currentPageIds = React.useMemo(
    () => pagination.paginatedItems.map((t) => t.id),
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
      const res = await api.bulkDeleteTeachers(selectedIds)
      setSuccess(`Successfully deleted ${res.deleted_count} teacher(s).`)
      setSelectedIds([])
      setBulkConfirmOpen(false)
      const data = await api.listTeachers()
      setTeachers(data)
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

  const openAddModal = () => {
    setEditing(null)
    setFormInitial(EMPTY_FORM)
    setShowForm(true)
  }

  const openEditModal = (teacher: Teacher) => {
    setEditing(teacher)
    setFormInitial({
      name: teacher.name,
      employment_type: teacher.employment_type ?? "",
      default_rate: teacher.default_rate ?? "",
      contact: teacher.contact ?? "",
      bank_details: teacher.bank_details ?? "",
    })
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
      const data = await api.listTeachers()
      setTeachers(data)
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
      const data = await api.listTeachers()
      setTeachers(data)
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
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-7xl">
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
    <div className="space-y-6">
      {/* Standardized Header */}
      <StandardPageHeader
        title="Teachers"
        description="Manage teacher profiles, employment types, rates, and contact information."
        primaryAction={{
          label: "Add Teacher",
          onClick: openAddModal,
          icon: <Plus className="size-4" />,
        }}
        secondaryAction={{
          label: loading ? "Loading..." : "Load Data",
          onClick: loadTeachers,
          icon: loading ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />,
        }}
      />

      {/* Metric Highlights Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Teachers</p>
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <UserCheck className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{teachers.length}</h2>
            {lastLoaded && (
              <span className="text-[11px] text-muted-foreground">Updated {lastLoaded}</span>
            )}
          </div>
        </Card>
      </div>

      {/* Standardized Management Toolbar Card */}
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

            <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val ?? "all")}>
              <SelectTrigger className="w-40 text-xs">
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

            {lastLoaded && teachers && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="px-3 py-1 text-xs">
                  <UserCheck className="mr-1.5 size-3.5" />
                  {filteredTeachers.length} of {teachers.length} teacher{teachers.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Banners */}
      {success && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
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
                className="w-[100px]"
                sortKey="id"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
              >
                ID
              </TableHeadSortable>

              <TableHeadSortable
                sortKey="name"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
              >
                Name
              </TableHeadSortable>

              <TableHeadSortable
                sortKey="employment_type"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
              >
                Employment Type
              </TableHeadSortable>

              <TableHeadSortable
                sortKey="default_rate"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
              >
                Default Rate
              </TableHeadSortable>

              <TableHeadSortable
                sortKey="contact"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
              >
                Contact
              </TableHeadSortable>

              <TableHeadSortable
                sortKey="bank_details"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
              >
                Bank Details
              </TableHeadSortable>

              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && teachers.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => <TableSkeletonRow key={i} />)
            ) : sortedTeachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No teachers found.
                </TableCell>
              </TableRow>
            ) : (
              pagination.paginatedItems.map((t) => {
                const isSelected = selectedIds.includes(t.id)
                return (
                  <TableRow key={t.id} data-state={isSelected ? "selected" : undefined}>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectRow(t.id)}
                        aria-label={`Select teacher ${t.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">{t.id}</TableCell>
                    <TableCell className="font-semibold text-foreground">{t.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {EMPLOYMENT_TYPES.find((et) => et.value === t.employment_type)?.label ?? t.employment_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">{t.default_rate}</TableCell>
                    <TableCell className="text-muted-foreground">{t.contact}</TableCell>
                    <TableCell className="text-muted-foreground">{t.bank_details}</TableCell>
                    <TableCell className="text-right">
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
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Standardized Table Pagination Footer */}
      {sortedTeachers.length > 0 && (
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
      )}

      {/* Form modal */}
      {showForm && (
        <TeacherFormModal
          editing={editing}
          initial={formInitial}
          onSave={handleSave}
          onClose={closeFormModal}
          saving={saving}
        />
      )}

      {/* Single Delete dialog */}
      {deleting && (
        <DeleteDialog
          teacher={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleting(null)}
          deleting={deletingInProgress}
        />
      )}

      {/* Bulk Delete dialog */}
      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent onClose={() => setBulkConfirmOpen(false)}>
          <DialogHeader>
            <DialogTitle>Delete Multiple Teachers</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.length} selected teacher(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirmOpen(false)} disabled={bulkDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
