"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Plus, Pencil, Trash2, X, RotateCcw, Loader2, Search } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import {
  type Teacher,
  type TeacherPayload,
  EMPLOYMENT_TYPES,
} from "@/lib/types"

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-5 w-10 animate-pulse rounded bg-muted" />
          <div className="h-5 flex-1 animate-pulse rounded bg-muted" />
          <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded bg-muted" />
          <div className="h-5 w-28 animate-pulse rounded bg-muted" />
          <div className="h-5 w-28 animate-pulse rounded bg-muted" />
          <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Delete Teacher</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Are you sure you want to delete <strong>{teacher.name}</strong>? This
          action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
          >
            {deleting && <Loader2 className="size-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {editing ? "Edit Teacher" : "Add Teacher"}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1 transition-colors hover:bg-muted disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name (required) */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Teacher name"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          {/* Employment Type */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Employment Type
            </label>
            <select
              name="employment_type"
              value={form.employment_type}
              onChange={handleChange}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">None</option>
              {EMPLOYMENT_TYPES.map((et) => (
                <option key={et.value} value={et.value}>
                  {et.label}
                </option>
              ))}
            </select>
          </div>

          {/* Default Rate */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Default Rate
            </label>
            <input
              type="text"
              name="default_rate"
              value={form.default_rate}
              onChange={handleChange}
              placeholder="e.g. 25000"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          {/* Contact */}
          <div>
            <label className="mb-1 block text-sm font-medium">Contact</label>
            <input
              type="text"
              name="contact"
              value={form.contact}
              onChange={handleChange}
              placeholder="Phone or email"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          {/* Bank Details */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Bank Details
            </label>
            <input
              type="text"
              name="bank_details"
              value={form.bank_details}
              onChange={handleChange}
              placeholder="Account number / bank name"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Save Changes" : "Add Teacher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function TeachersPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const [teachers, setTeachers] = React.useState<Teacher[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)

  // ── Success message ──────────────────────────────────────────────
  const [success, setSuccess] = React.useState<string | null>(null)
  const successTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    if (successTimer.current) clearTimeout(successTimer.current)
    successTimer.current = setTimeout(() => setSuccess(null), 3000)
  }

  React.useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current)
    }
  }, [])

  // ── Modal / Dialog state ─────────────────────────────────────────
  const [showForm, setShowForm] = React.useState(false)
  const [editing, setEditing] = React.useState<Teacher | null>(null)
  const [saving, setSaving] = React.useState(false)

  const [deleting, setDeleting] = React.useState<Teacher | null>(null)
  const [deletingInProgress, setDeletingInProgress] = React.useState(false)

  // ── Load teachers ─────────────────────────────────────────────────
  const loadTeachers = React.useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const data = await api.listTeachers()
      setTeachers(data)
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to load teachers")
      }
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn])

  const filteredTeachers = React.useMemo(() => {
    if (searchQuery.trim() === "") return teachers
    const query = searchQuery.toLowerCase().trim()
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        String(t.id).includes(query) ||
        (t.contact && t.contact.toLowerCase().includes(query)) ||
        (t.employment_type && t.employment_type.toLowerCase().includes(query))
    )
  }, [teachers, searchQuery])

  // ── Not loaded / signed out ───────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mb-6 h-4 w-72 animate-pulse rounded bg-muted" />
        <TableSkeleton />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">
          Please sign in to view this page.
        </p>
      </div>
    )
  }

  // ── Handlers ──────────────────────────────────────────────────────

  const openAddModal = () => {
    setEditing(null)
    setShowForm(true)
  }

  const openEditModal = (teacher: Teacher) => {
    setEditing(teacher)
    setShowForm(true)
  }

  const closeFormModal = () => {
    if (saving) return
    setShowForm(false)
    setEditing(null)
  }

  const handleSave = async (payload: TeacherPayload) => {
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      if (editing) {
        await api.updateTeacher(editing.id, payload)
        showSuccess("Teacher updated successfully.")
      } else {
        await api.createTeacher(payload)
        showSuccess("Teacher created successfully.")
      }

      setShowForm(false)
      setEditing(null)
      // Refresh data
      await loadTeachers()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("An unexpected error occurred.")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleting) return
    setDeletingInProgress(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      await api.deleteTeacher(deleting.id)
      showSuccess("Teacher deleted successfully.")
      setDeleting(null)
      await loadTeachers()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("An unexpected error occurred.")
      }
      setDeleting(null)
    } finally {
      setDeletingInProgress(false)
    }
  }

  // ── Employment type label helper ──────────────────────────────────
  const employmentLabel = (value: string | null) => {
    if (!value) return "—"
    const found = EMPLOYMENT_TYPES.find((et) => et.value === value)
    return found ? found.label : value
  }

  // ── Form initial data ─────────────────────────────────────────────
  const formInitial: FormData = editing
    ? {
        name: editing.name,
        employment_type: editing.employment_type ?? "",
        default_rate: editing.default_rate ?? "",
        contact: editing.contact ?? "",
        bank_details: editing.bank_details ?? "",
      }
    : EMPTY_FORM

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Teachers</h1>
        <p className="mt-1 text-muted-foreground">
          Manage teacher profiles, employment types, and contact information.
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Left side actions (Buttons + Search) */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadTeachers}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RotateCcw className="size-4" />
                Load Data
              </>
            )}
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Plus className="size-4" />
            Add Teacher
          </button>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search teachers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-64 rounded-lg border bg-background pl-9 pr-4 text-sm outline-none ring-offset-background transition-colors focus:border-ring"
            />
          </div>
        </div>

        {/* Right side info (Timestamp/Status) */}
        {lastLoaded && teachers && (
          <span className="text-xs text-muted-foreground">
            {filteredTeachers.length} of {teachers.length} teacher{teachers.length !== 1 ? "s" : ""} &bull; Loaded {lastLoaded}
          </span>
        )}
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          {success}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-start justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-4 shrink-0 rounded p-0.5 transition-colors hover:bg-red-100 dark:hover:bg-red-900"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">ID</th>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">
                Employment Type
              </th>
              <th className="px-4 py-3 text-left font-medium">Default Rate</th>
              <th className="px-4 py-3 text-left font-medium">Contact</th>
              <th className="px-4 py-3 text-left font-medium">
                Bank Details
              </th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && teachers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6">
                  <TableSkeleton />
                </td>
              </tr>
            ) : filteredTeachers.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No teachers found.
                </td>
              </tr>
            ) : (
              filteredTeachers.map((teacher) => (
                <tr
                  key={teacher.id}
                  className="border-b transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3">{teacher.id}</td>
                  <td className="px-4 py-3 font-medium">{teacher.name}</td>
                  <td className="px-4 py-3">
                    {employmentLabel(teacher.employment_type)}
                  </td>
                  <td className="px-4 py-3">{teacher.default_rate ?? "—"}</td>
                  <td className="px-4 py-3">{teacher.contact ?? "—"}</td>
                  <td className="px-4 py-3">
                    {teacher.bank_details ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEditModal(teacher)}
                        className="inline-flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
                        title="Edit"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(teacher)}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10"
                        title="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
