"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Plus, Pencil, Trash2, X, RotateCcw, Loader2, Check, Minus, Search } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { SESSION_STATUSES, type Session, type SessionPayload, type SessionStatus } from "@/lib/types"

const STATUS_COLORS: Record<SessionStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  no_show: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

function statusLabel(value: SessionStatus | null): string {
  if (!value) return "—"
  return SESSION_STATUSES.find((s) => s.value === value)?.label ?? value
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

function RowSkeleton() {
  return (
    <tr className="border-b last:border-b-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-5 w-full animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  )
}

export default function SessionsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const [sessions, setSessions] = React.useState<Session[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)

  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingSession, setEditingSession] = React.useState<Session | null>(null)
  const [saving, setSaving] = React.useState(false)

  // Delete confirmation
  const [deletingId, setDeletingId] = React.useState<number | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  // Form fields
  const [formStart, setFormStart] = React.useState("")
  const [formEnd, setFormEnd] = React.useState("")
  const [formStatus, setFormStatus] = React.useState<string>("")
  const [formPaid, setFormPaid] = React.useState(false)

  const successTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const showSuccess = React.useCallback((msg: string) => {
    if (successTimer.current) clearTimeout(successTimer.current)
    setSuccess(msg)
    successTimer.current = setTimeout(() => setSuccess(null), 3000)
  }, [])

  const loadSessions = React.useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const data = await api.listSessions()
      setSessions(data)
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to load sessions")
      }
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn])

  const filteredSessions = React.useMemo(() => {
    if (!sessions) return []
    if (searchQuery.trim() === "") return sessions
    const query = searchQuery.toLowerCase().trim()
    return sessions.filter(
      (s) =>
        (s.teacher && s.teacher.name.toLowerCase().includes(query)) ||
        (s.class_obj &&
          (`${s.class_obj.education_level} ${s.class_obj.cohort_identifier}`)
            .toLowerCase()
            .includes(query)) ||
        (s.status && s.status.toLowerCase().includes(query))
    )
  }, [sessions, searchQuery])

  const openAddModal = () => {
    setEditingSession(null)
    setFormStart("")
    setFormEnd("")
    setFormStatus("")
    setFormPaid(false)
    setModalOpen(true)
  }

  const openEditModal = (session: Session) => {
    setEditingSession(session)
    // Convert ISO to datetime-local format
    const toDatetimeLocal = (iso: string) => {
      const d = new Date(iso)
      const pad = (n: number) => n.toString().padStart(2, "0")
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    setFormStart(toDatetimeLocal(session.start_time))
    setFormEnd(toDatetimeLocal(session.end_time))
    setFormStatus(session.status ?? "")
    setFormPaid(session.paid ?? false)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingSession(null)
  }

  const getFormPayload = (): SessionPayload => ({
    start_time: new Date(formStart).toISOString(),
    end_time: new Date(formEnd).toISOString(),
    ...(formStatus ? { status: formStatus as SessionStatus } : {}),
    ...(formPaid ? { paid: true } : {}),
  })

  const handleSave = async () => {
    if (!formStart || !formEnd) return
    setSaving(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const payload = getFormPayload()
      if (editingSession) {
        await api.updateSession(editingSession.id, payload)
        showSuccess("Session updated successfully.")
      } else {
        await api.createSession(payload)
        showSuccess("Session created successfully.")
      }
      closeModal()
      await loadSessions()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to save session")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeleting(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      await api.deleteSession(id)
      showSuccess("Session deleted successfully.")
      setDeletingId(null)
      await loadSessions()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to delete session")
      }
    } finally {
      setDeleting(false)
    }
  }

  // Auth gates
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mb-6 h-4 w-72 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view sessions.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
        <p className="mt-1 text-muted-foreground">
          Manage class sessions and timetable records.
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Left side actions (Buttons + Search) */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadSessions}
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
            Add Session
          </button>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-64 rounded-lg border bg-background pl-9 pr-4 text-sm outline-none ring-offset-background transition-colors focus:border-ring"
            />
          </div>
        </div>

        {/* Right side info (Timestamp/Status) */}
        {lastLoaded && sessions && (
          <span className="text-xs text-muted-foreground">
            {filteredSessions.length} of {sessions.length} session{sessions.length !== 1 ? "s" : ""} &bull; Loaded {lastLoaded}
          </span>
        )}
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          <Check className="size-4 shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess(null)} className="shrink-0 hover:opacity-70">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 hover:opacity-70">
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
              <th className="px-4 py-3 text-left font-medium">Teacher Name</th>
              <th className="px-4 py-3 text-left font-medium">Class</th>
              <th className="px-4 py-3 text-left font-medium">Start Time</th>
              <th className="px-4 py-3 text-left font-medium">End Time</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Paid</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !sessions
              ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
              : sessions === null
                ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      Click &quot;Load Data&quot; to fetch sessions.
                    </td>
                  </tr>
                )
                : filteredSessions.length === 0
                  ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                        No sessions found.
                      </td>
                    </tr>
                  )
                  : filteredSessions.map((session) => (
                      <tr key={session.id} className="border-b last:border-b-0 transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs">{session.id}</td>
                        <td className="px-4 py-3">{session.teacher?.name ?? "—"}</td>
                        <td className="px-4 py-3">
                          {session.class_obj
                            ? `${session.class_obj.education_level} ${session.class_obj.cohort_identifier}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(session.start_time)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(session.end_time)}</td>
                        <td className="px-4 py-3">
                          {session.status
                            ? (
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[session.status]}`}
                              >
                                {statusLabel(session.status)}
                              </span>
                            )
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {session.paid === true
                            ? <Check className="size-4 text-green-600 dark:text-green-400" />
                            : <Minus className="size-4 text-muted-foreground" />}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(session)}
                              className="inline-flex size-8 items-center justify-center rounded-md border transition-colors hover:bg-muted/50"
                              title="Edit"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingId(session.id)}
                              className="inline-flex size-8 items-center justify-center rounded-md border text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                              title="Delete"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
            {/* Skeleton rows while loading with existing data */}
            {loading && sessions && sessions.length > 0 && (
              Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={`skel-${i}`} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingSession ? "Edit Session" : "Add Session"}
              </h2>
              <button
                onClick={closeModal}
                className="inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Start time */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  required
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>

              {/* End time */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                  required
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>

              {/* Status */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20"
                >
                  <option value="">— None —</option>
                  {SESSION_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Paid */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={formPaid}
                    onChange={(e) => setFormPaid(e.target.checked)}
                    className="size-4 rounded border transition-colors"
                  />
                  Paid
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-muted/50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formStart || !formEnd}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving ? "Saving..." : editingSession ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-semibold">Confirm Delete</h2>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this session? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeletingId(null)}
                disabled={deleting}
                className="inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-muted/50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                disabled={deleting}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 className="size-4 animate-spin" />}
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
