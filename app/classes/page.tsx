"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Plus, Pencil, Trash2, X, RotateCcw, Loader2 } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { Class, ClassPayload, EDUCATION_LEVELS } from "@/lib/types"

function TableSkeleton() {
  return (
    <div className="rounded-lg border">
      <div className="border-b px-4 py-3">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
          <div className="h-4 w-8 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          <div className="ml-auto flex gap-2">
            <div className="size-8 animate-pulse rounded bg-muted" />
            <div className="size-8 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ClassesPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  // Data
  const [classes, setClasses] = React.useState<Class[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  // Modal
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingClass, setEditingClass] = React.useState<Class | null>(null)
  const [formSubmitting, setFormSubmitting] = React.useState(false)

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<number | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = React.useState(false)

  // Form state
  const [formEducationLevel, setFormEducationLevel] =
    React.useState<ClassPayload["education_level"]>("IAL")
  const [formCohortIdentifier, setFormCohortIdentifier] = React.useState("")
  const [formCohortSubCategory, setFormCohortSubCategory] = React.useState("")

  // Success message auto-dismiss
  React.useEffect(() => {
    if (!successMessage) return
    const timer = setTimeout(() => setSuccessMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [successMessage])

  const loadClasses = React.useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const data = await api.listClasses()
      setClasses(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to load classes")
      }
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn])

  const openAddModal = () => {
    setEditingClass(null)
    setFormEducationLevel("IAL")
    setFormCohortIdentifier("")
    setFormCohortSubCategory("")
    setModalOpen(true)
  }

  const openEditModal = (cls: Class) => {
    setEditingClass(cls)
    setFormEducationLevel(cls.education_level)
    setFormCohortIdentifier(cls.cohort_identifier)
    setFormCohortSubCategory(cls.cohort_sub_category ?? "")
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingClass(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formSubmitting) return
    setFormSubmitting(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      const payload: ClassPayload = {
        education_level: formEducationLevel,
        cohort_identifier: formCohortIdentifier,
        cohort_sub_category: formCohortSubCategory || null,
      }

      if (editingClass) {
        await api.updateClass(editingClass.id, payload)
        setSuccessMessage(`Class "${editingClass.cohort_identifier}" updated successfully.`)
      } else {
        await api.createClass(payload)
        setSuccessMessage(`Class "${payload.cohort_identifier}" created successfully.`)
      }

      closeModal()
      await loadClasses()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to save class")
      }
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (deleteSubmitting) return
    setDeleteSubmitting(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      await api.deleteClass(id)
      setSuccessMessage("Class deleted successfully.")
      setDeleteConfirmId(null)
      await loadClasses()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to delete class")
      }
    } finally {
      setDeleteSubmitting(false)
    }
  }

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
        <p className="text-muted-foreground">Please sign in to view this page.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
        <p className="mt-1 text-muted-foreground">
          Manage class groups and cohorts.
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={loadClasses}
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
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
        >
          <Plus className="size-4" />
          Add Class
        </button>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          {successMessage}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-3 inline-flex size-5 items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Table */}
      {loading && classes.length === 0 ? (
        <TableSkeleton />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Education Level</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cohort Identifier</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sub Category</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    {loading ? "Loading..." : 'No classes found. Click "Load Data" to fetch.'}
                  </td>
                </tr>
              ) : (
                classes.map((cls) => (
                  <tr key={cls.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3">{cls.id}</td>
                    <td className="px-4 py-3">{cls.education_level}</td>
                    <td className="px-4 py-3 font-medium">{cls.cohort_identifier}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {cls.cohort_sub_category ?? "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(cls)}
                          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(cls.id)}
                          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50"
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
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingClass ? "Edit Class" : "Add Class"}
              </h2>
              <button
                onClick={closeModal}
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="education_level"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Education Level
                </label>
                <select
                  id="education_level"
                  value={formEducationLevel}
                  onChange={(e) =>
                    setFormEducationLevel(
                      e.target.value as ClassPayload["education_level"]
                    )
                  }
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  required
                >
                  {EDUCATION_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="cohort_identifier"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Cohort Identifier
                </label>
                <input
                  id="cohort_identifier"
                  type="text"
                  value={formCohortIdentifier}
                  onChange={(e) => setFormCohortIdentifier(e.target.value)}
                  maxLength={1}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  placeholder="e.g. A"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="cohort_sub_category"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Sub Category{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  id="cohort_sub_category"
                  type="text"
                  value={formCohortSubCategory}
                  onChange={(e) => setFormCohortSubCategory(e.target.value)}
                  maxLength={1}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  placeholder="e.g. 1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
                >
                  {formSubmitting && <Loader2 className="size-4 animate-spin" />}
                  {editingClass ? "Save Changes" : "Create Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-semibold">Confirm Delete</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Are you sure you want to delete this class? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleteSubmitting}
                className="inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleteSubmitting}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleteSubmitting && <Loader2 className="size-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
