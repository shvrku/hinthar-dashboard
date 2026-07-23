"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { RotateCcw, RefreshCw, Download, Eye, Loader2, Search, QrCode, UserCheck } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { Student } from "@/lib/types"
import QRCode from "qrcode"
import { useSortableData } from "@/lib/use-sortable-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { StandardPageHeader } from "@/components/standard-page-header"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableHeadSortable,
  TableCell,
} from "@/components/ui/table"

function QrCanvas({ value, size = 200 }: { value: string; size?: number }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 2 })
    }
  }, [value, size])

  return <canvas ref={canvasRef} width={size} height={size} className="rounded-lg shadow-xs" />
}

function RowSkeleton() {
  return (
    <TableRow>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
        </TableCell>
      ))}
    </TableRow>
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
  const [searchQuery, setSearchQuery] = React.useState("")
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)

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
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn])

  const filteredStudents = React.useMemo(() => {
    if (searchQuery.trim() === "") return students
    const query = searchQuery.toLowerCase().trim()
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        String(s.id).includes(query)
    )
  }, [students, searchQuery])

  // Sorting
  const { items: sortedStudents, requestSort, sortConfig } = useSortableData(filteredStudents, "id", "asc")

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
      const res = await api.regenerateCheckInToken(selected.id)
      const updatedToken = res.check_in_token
      
      setSelected((prev) => (prev ? { ...prev, check_in_token: updatedToken } : null))
      const studentId = selected.id
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, check_in_token: updatedToken } : s))
      )
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
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-7xl">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <Table>
          <TableHeader>
            <TableRow>
              {["ID", "Name", "Check-in Token", "Actions"].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => <RowSkeleton key={i} />)}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground font-medium">Please sign in to view check-in codes.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Standardized Header */}
      <StandardPageHeader
        title="Check-In Management"
        description="View, generate, and export QR check-in codes for students."
        secondaryAction={{
          label: loading ? "Refreshing..." : "Refresh",
          onClick: loadStudents,
          icon: loading ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />,
        }}
      />

      {/* Metric Highlights Strip (Total Count Card + Auto-layout space) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Student Tokens</p>
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <QrCode className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{students ? students.length : 0}</h2>
            {lastLoaded && (
              <span className="text-[11px] text-muted-foreground">Updated {lastLoaded}</span>
            )}
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {lastLoaded && students && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 text-xs">
              <UserCheck className="mr-1.5 size-3.5" />
              {filteredStudents.length} of {students.length} student{students.length !== 1 ? "s" : ""}
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

      <div className="flex flex-col gap-6 lg:flex-row items-start">
        {/* Floating Student Table Card */}
        <div className="min-w-0 flex-1 w-full">
          <Card className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
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
                    sortKey="check_in_token"
                    currentSortKey={sortConfig.key}
                    currentSortOrder={sortConfig.order}
                    onSort={requestSort}
                  >
                    Token
                  </TableHeadSortable>

                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && students.length === 0 ? (
                  [1, 2, 3, 4, 5].map((i) => <RowSkeleton key={i} />)
                ) : sortedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      {students.length === 0 ? 'Click "Refresh" to fetch students.' : 'No students found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedStudents.map((student) => (
                    <TableRow
                      key={student.id}
                      className={`cursor-pointer ${
                        selected?.id === student.id ? "bg-muted/60 font-medium" : ""
                      }`}
                      onClick={() => setSelected(student)}
                    >
                      <TableCell className="font-semibold text-foreground">{student.id}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground font-mono">
                          {student.check_in_token ? `${student.check_in_token.slice(0, 10)}...` : "—"}
                        </code>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelected(student)
                          }}
                        >
                          View QR
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* QR Code Card (Sticky on scroll) */}
        <div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-6 lg:z-10 self-start h-fit">
          {selected ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{selected.name}</span>
                  <Badge variant="outline">#{selected.id}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center p-3.5 rounded-xl bg-muted/60 border border-border/60">
                  <QrCanvas value={selected.check_in_token} size={200} />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Check-in Token</label>
                  <code className="block break-all rounded-lg border bg-muted/40 p-2 text-xs font-mono text-muted-foreground">
                    {selected.check_in_token}
                  </code>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                  >
                    {regenerating ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 size-4" />
                    )}
                    Regenerate Token
                  </Button>
                  <Button onClick={downloadQr}>
                    <Download className="mr-2 size-4" />
                    Download QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center">
              <QrCode className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Select a student to view or download their QR code
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
