"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Plus, Pencil, Trash2, X, RotateCcw, Loader2, Search } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { Student, StudentPayload } from "@/lib/types"

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------
function TableSkeletonRow() {
  return (
    <tr className="border-b">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
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
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="mb-6 text-sm text-muted-foreground">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
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
}: {
  open: boolean
  initial: Student | null
  onClose: () => void
  onSave: (payload: StudentPayload) => Promise<void>
  saving: boolean
}) {
  const [name, setName] = React.useState("")
  const [dob, setDob] = React.useState("")
  const [contact, setContact] = React.useState("")

  // Reset form when modal opens / initial changes
  const [prevInitial, setPrevInitial] = React.useState<Student | null>(null)
  const [prevOpen, setPrevOpen] = React.useState(false)

  if (initial !== prevInitial || open !== prevOpen) {
    setPrevInitial(initial)
    setPrevOpen(open)
    if (open) {
      setName(initial?.name ?? "")
      setDob(initial?.dob ?? "")
      setContact(initial?.contact ?? "")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const payload: StudentPayload = { name: name.trim() }
    if (dob) payload.dob = dob
    if (contact.trim()) payload.contact = contact.trim()
    await onSave(payload)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {initial ? "Edit Student" : "Add Student"}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="inline-flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-muted disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Student name"
              className="block w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          {/* DOB */}
          <div>
            <label className="mb-1 block text-sm font-medium">Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="block w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          {/* Contact */}
          <div>
            <label className="mb-1 block text-sm font-medium">Contact</label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Phone number or email"
              className="block w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-9 items-center justify-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {initial ? "Save Changes" : "Create Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
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

  // Modal & form state
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingStudent, setEditingStudent] = React.useState<Student | null>(null)
  const [saving, setSaving] = React.useState(false)

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

  const filteredStudents = React.useMemo(() => {
    if (!students) return []
    if (searchQuery.trim() === "") return students
    const query = searchQuery.toLowerCase().trim()
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        String(s.id).includes(query) ||
        (s.contact && s.contact.toLowerCase().includes(query))
    )
  }, [students, searchQuery])

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
        // Refresh data
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
      // Refresh data
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
    setModalOpen(true)
  }

  const openEditModal = (student: Student) => {
    setEditingStudent(student)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingStudent(null)
  }

  // --- Auth guard ---
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mb-6 h-4 w-72 animate-pulse rounded bg-muted" />
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b px-4 py-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view students.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Students</h1>
        <p className="mt-1 text-muted-foreground">
          Manage student profiles and enrollments.
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Left side actions (Buttons + Search) */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadData}
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
            onClick={openCreateModal}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Plus className="size-4" />
            Add Student
          </button>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-64 rounded-lg border bg-background pl-9 pr-4 text-sm outline-none ring-offset-background transition-colors focus:border-ring"
            />
          </div>
        </div>

        {/* Right side info (Timestamp/Status) */}
        {lastLoaded && students && (
          <span className="text-xs text-muted-foreground">
            {filteredStudents.length} of {students.length} student{students.length !== 1 ? "s" : ""} &bull; Loaded {lastLoaded}
          </span>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="inline-flex shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-red-100 dark:hover:bg-red-900"
            aria-label="Dismiss error"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          <span className="flex-1">{success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="inline-flex shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-green-100 dark:hover:bg-green-900"
            aria-label="Dismiss success"
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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">DOB</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Enrollment Date</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !students
              ? Array.from({ length: 5 }).map((_, i) => <TableSkeletonRow key={i} />)
              : filteredStudents && filteredStudents.length === 0
                ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No students found.
                  </td>
                </tr>
                  )
                : filteredStudents?.map((student) => (
                <tr key={student.id} className="border-b transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{student.id}</td>
                  <td className="px-4 py-3">{student.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {student.dob ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {student.contact ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {student.enrollment_date}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(student)}
                        className="inline-flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
                        aria-label={`Edit ${student.name}`}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(student.id)}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10"
                        aria-label={`Delete ${student.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                  ))}
          </tbody>
        </table>
      </div>

      {/* Student form modal */}
      <StudentFormModal
        open={modalOpen}
        initial={editingStudent}
        onClose={closeModal}
        onSave={handleSave}
        saving={saving}
      />

      {/* Delete confirmation */}
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
    </div>
  )
}
