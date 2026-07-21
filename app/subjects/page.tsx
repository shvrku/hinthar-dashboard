"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Plus, Pencil, Trash2, RotateCcw, Loader2, Search, BookOpen } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { Subject, SubjectPayload } from "@/lib/types"
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
      {Array.from({ length: 3 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
        </TableCell>
      ))}
    </TableRow>
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
// Subject form modal (create / edit)
// ---------------------------------------------------------------------------
function SubjectFormModal({
  open,
  initial,
  onClose,
  onSave,
  saving,
}: {
  open: boolean
  initial: Subject | null
  onClose: () => void
  onSave: (payload: SubjectPayload) => Promise<void>
  saving: boolean
}) {
  const [name, setName] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? "")
    }
  }, [open, initial])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onSave({ name: name.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Subject" : "Add Subject"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "Update subject details below."
              : "Enter details for the new curriculum subject."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Subject Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Mathematics, Physics, Chemistry"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {initial ? "Save Changes" : "Create Subject"}
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
export default function SubjectsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const [subjects, setSubjects] = React.useState<Subject[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)

  // Modal & form state
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingSubject, setEditingSubject] = React.useState<Subject | null>(null)
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
      const data = await api.listSubjects()
      setSubjects(data)
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to load subjects")
      }
    } finally {
      setLoading(false)
    }
  }, [getApi])

  const filteredSubjects = React.useMemo(() => {
    if (!subjects) return []
    if (searchQuery.trim() === "") return subjects
    const query = searchQuery.toLowerCase().trim()
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        String(s.id).includes(query)
    )
  }, [subjects, searchQuery])

  // Sorting
  const { items: sortedSubjects, requestSort, sortConfig } = useSortableData(filteredSubjects, "id", "asc")

  const handleSave = React.useCallback(
    async (payload: SubjectPayload) => {
      setSaving(true)
      setError(null)
      try {
        const api = await getApi()
        if (editingSubject) {
          await api.updateSubject(editingSubject.id, payload)
          setSuccess(`Subject "${payload.name}" updated successfully.`)
        } else {
          await api.createSubject(payload)
          setSuccess(`Subject "${payload.name}" created successfully.`)
        }
        setModalOpen(false)
        setEditingSubject(null)
        const data = await api.listSubjects()
        setSubjects(data)
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
    [getApi, editingSubject],
  )

  const handleDelete = React.useCallback(async () => {
    if (deletingId === null) return
    setDeleting(true)
    setError(null)
    try {
      const api = await getApi()
      await api.deleteSubject(deletingId)
      setSuccess("Subject deleted successfully.")
      setDeletingId(null)
      const data = await api.listSubjects()
      setSubjects(data)
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
    setEditingSubject(null)
    setModalOpen(true)
  }

  const openEditModal = (subject: Subject) => {
    setEditingSubject(subject)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingSubject(null)
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
        <p className="text-muted-foreground font-medium">Please sign in to view subjects.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage academic subjects, curriculum offerings, and course definitions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={loadData} disabled={loading} variant="default" className="shadow-xs">
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

          <Button onClick={openCreateModal} variant="outline" className="shadow-xs">
            <Plus className="mr-2 size-4" />
            Add Subject
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search subjects by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {lastLoaded && subjects && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 text-xs">
              <BookOpen className="mr-1.5 size-3.5" />
              {filteredSubjects.length} of {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Loaded {lastLoaded}
            </span>
          </div>
        )}
      </div>

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
              Subject Name
            </TableHeadSortable>

            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && !subjects ? (
            Array.from({ length: 5 }).map((_, i) => <TableSkeletonRow key={i} />)
          ) : sortedSubjects && sortedSubjects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                {subjects === null ? 'Click "Load Data" to fetch subjects.' : 'No subjects found.'}
              </TableCell>
            </TableRow>
          ) : (
            sortedSubjects?.map((subject) => (
              <TableRow key={subject.id}>
                <TableCell className="font-semibold text-foreground">{subject.id}</TableCell>
                <TableCell className="font-medium">{subject.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditModal(subject)}
                      aria-label={`Edit ${subject.name}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingId(subject.id)}
                      aria-label={`Delete ${subject.name}`}
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
      <SubjectFormModal
        open={modalOpen}
        initial={editingSubject}
        onClose={closeModal}
        onSave={handleSave}
        saving={saving}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deletingId !== null}
        title="Delete Subject"
        message={
          deletingId !== null
            ? `Are you sure you want to delete subject #${deletingId}? This action cannot be undone.`
            : ""
        }
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        loading={deleting}
      />
    </div>
  )
}
