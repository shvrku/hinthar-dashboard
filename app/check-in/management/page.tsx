"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { RotateCcw, RefreshCw, Download, Eye, X, Loader2 } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { Student } from "@/lib/types"
import QRCode from "qrcode"

function QrCanvas({ value, size = 200 }: { value: string; size?: number }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 2 })
    }
  }, [value, size])

  return <canvas ref={canvasRef} width={size} height={size} className="rounded-lg" />
}

function RowSkeleton() {
  return (
    <tr className="border-b">
      {[1, 2, 3, 4].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 animate-pulse rounded bg-muted" style={{ width: `${50 + i * 20}px` }} />
        </td>
      ))}
    </tr>
  )
}

export default function CheckInManagementPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [students, setStudents] = React.useState<Student[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<Student | null>(null)
  const [regenerating, setRegenerating] = React.useState(false)
  const [success, setSuccess] = React.useState<string | null>(null)

  const loadStudents = React.useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const data = await api.listStudents()
      setStudents(data)
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn])

  const selectStudent = React.useCallback(async (student: Student) => {
    setSelected(student)
    setError(null)
  }, [])

  const handleRegenerate = React.useCallback(async () => {
    if (!selected || !isSignedIn) return
    setRegenerating(true)
    setError(null)
    setSuccess(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const updated = await api.regenerateCheckInToken(selected.id)
      setSelected(updated)
      setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      setSuccess("Check-in token regenerated successfully.")
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to regenerate token")
    } finally {
      setRegenerating(false)
    }
  }, [selected, getToken, isSignedIn])

  const downloadQr = React.useCallback(() => {
    if (!selected) return
    const canvas = document.querySelector("canvas")
    if (!canvas) return
    const link = document.createElement("a")
    link.download = `check-in-${selected.name.replace(/\s+/g, "-").toLowerCase()}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }, [selected])

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {["ID", "Name", "Check-in Token", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => <RowSkeleton key={i} />)}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view check-in codes.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Check In Management</h1>
        <p className="mt-1 text-muted-foreground">
          View, generate, and manage QR check-in codes for students.
        </p>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={loadStudents}
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
              {students.length > 0 ? "Refresh" : "Load Data"}
            </>
          )}
        </button>
        {students.length > 0 && !loading && (
          <span className="text-xs text-muted-foreground">
            {students.length} student{students.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
            <X className="size-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          {success}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Student Table */}
        <div className="min-w-0 flex-1 rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Token</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && students.length === 0
                  ? [1, 2, 3, 4, 5].map((i) => <RowSkeleton key={i} />)
                  : students.length === 0
                    ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                          No students found. Click &quot;Load Data&quot; to fetch.
                        </td>
                      </tr>
                    )
                    : students.map((student) => (
                        <tr
                          key={student.id}
                          className={`border-b last:border-b-0 transition-colors hover:bg-muted/30 cursor-pointer ${
                            selected?.id === student.id ? "bg-muted/50" : ""
                          }`}
                          onClick={() => selectStudent(student)}
                        >
                          <td className="px-4 py-3 font-mono text-xs">{student.id}</td>
                          <td className="px-4 py-3 font-medium">{student.name}</td>
                          <td className="px-4 py-3">
                            <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                              {student.check_in_token.slice(0, 16)}...
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); selectStudent(student) }}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Eye className="size-3.5" />
                              View QR
                            </button>
                          </td>
                        </tr>
                      ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* QR Code Card */}
        <div className="w-full lg:w-80">
          {selected ? (
            <div className="sticky top-20 rounded-lg border p-6">
              <div className="mb-4">
                <h3 className="font-semibold">{selected.name}</h3>
                <p className="text-xs text-muted-foreground">Student #{selected.id}</p>
              </div>

              <div className="mb-4 flex justify-center">
                <QrCanvas value={selected.check_in_token} size={200} />
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Token</label>
                <code className="block break-all rounded border bg-muted/50 px-2 py-1.5 text-xs font-mono">
                  {selected.check_in_token}
                </code>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                >
                  {regenerating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Regenerate Token
                </button>
                <button
                  onClick={downloadQr}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-foreground px-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  <Download className="size-4" />
                  Download QR
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
              <p className="text-center text-sm text-muted-foreground">
                Select a student<br />to view their QR code
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
