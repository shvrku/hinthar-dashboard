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
      {Array.from({ length: 7 }).map((_, i) => (
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

// ---------------------------------------------------------------------------
// Teacher form modal (shared between Add & Edit)
// ---------------------------------------------------------------------------
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
            <select
              name="employment_type"
              value={form.employment_type}
              onChange={handleChange}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">None</option>
              {EMPLOYMENT_TYPES.map((et) => (
                <option key={et.value} value={et.value}>
                  {et.label}
                </option>
              ))}
            </select>
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

function employmentLabel(type: string | null) {
  if (!type) return <span className="text-muted-foreground">—</span>
  const found = EMPLOYMENT_TYPES.find((et) => et.value === type)
  const label = found ? found.label : type
  return (
    <Badge variant="secondary" className="font-normal">
      {label}
    </Badge>
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

  const filteredTeachers = React.useMemo(() => {
    if (searchQuery.trim() === "") return teachers
    const q = searchQuery.toLowerCase().trim()
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        String(t.id).includes(q) ||
        (t.contact && t.contact.toLowerCase().includes(q)) ||
        (t.employment_type && t.employment_type.toLowerCase().includes(q)),
    )
  }, [teachers, searchQuery])

  // Sorting
  const { items: sortedTeachers, requestSort, sortConfig } = useSortableData(filteredTeachers, "id", "asc")

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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teachers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage teacher profiles, employment types, rates, and contact information.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={loadTeachers} disabled={loading} variant="default" className="shadow-xs">
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 size-4" />
                Load Data
              </>
            )}
          </Button>

          <Button onClick={openAddModal} variant="outline" className="shadow-xs">
            <Plus className="mr-2 size-4" />
            Add Teacher
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search teachers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {lastLoaded && teachers && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 text-xs">
              <UserCheck className="mr-1.5 size-3.5" />
              {filteredTeachers.length} of {teachers.length} teacher{teachers.length !== 1 ? "s" : ""}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Loaded {lastLoaded}
            </span>
          </div>
        )}
      </div>

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

      {/* Table */}
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
              <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                {teachers.length === 0 ? 'Click "Load Data" to fetch teachers.' : 'No teachers found.'}
              </TableCell>
            </TableRow>
          ) : (
            sortedTeachers.map((teacher) => (
              <TableRow key={teacher.id}>
                <TableCell className="font-semibold text-foreground">{teacher.id}</TableCell>
                <TableCell className="font-medium">{teacher.name}</TableCell>
                <TableCell>{employmentLabel(teacher.employment_type)}</TableCell>
                <TableCell className="text-muted-foreground">{teacher.default_rate ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{teacher.contact ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{teacher.bank_details ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditModal(teacher)}
                      title="Edit"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleting(teacher)}
                      title="Delete"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

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

      {/* Delete dialog */}
      {deleting && (
        <DeleteDialog
          teacher={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleting(null)}
          deleting={deletingInProgress}
        />
      )}
    </div>
  )
}
