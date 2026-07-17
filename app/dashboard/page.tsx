"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { CalendarCheck, GraduationCap, Users, UserPlus, RotateCcw, QrCode, BookOpen } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { Stats } from "@/lib/types"

const statCards = [
  { key: "sessions" as const, label: "Sessions", icon: CalendarCheck },
  { key: "classes" as const, label: "Classes", icon: GraduationCap },
  { key: "teachers" as const, label: "Teachers", icon: Users },
  { key: "students" as const, label: "Students", icon: UserPlus },
  { key: "check_ins" as const, label: "Check-ins", icon: QrCode },
  { key: "subjects" as const, label: "Subjects", icon: BookOpen },
]

function StatSkeleton() {
  return (
    <div className="rounded-lg border p-6">
      <div className="mb-3 h-10 w-10 animate-pulse rounded-lg bg-muted" />
      <div className="mb-2 h-8 w-20 animate-pulse rounded bg-muted" />
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
    </div>
  )
}

export default function DashboardPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [stats, setStats] = React.useState<Stats | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadStats = React.useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const data = await api.getStats()
      setStats(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to load data")
      }
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn])

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mb-6 h-4 w-72 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view the dashboard.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of your school management data.
        </p>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={loadStats}
          disabled={loading}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading...
            </>
          ) : (
            <>
              <RotateCcw className="size-4" />
              Load Data
            </>
          )}
        </button>
        {stats !== null && !loading && (
          <span className="text-xs text-muted-foreground">
            Loaded {new Date().toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading && !stats
          ? statCards.map((card) => <StatSkeleton key={card.key} />)
          : stats
            ? statCards.map((card) => {
                const Icon = card.icon
                return (
                  <div key={card.key} className="rounded-lg border p-6 transition-colors hover:bg-muted/50 bg-card shadow-sm">
                    <div className="mb-3 flex size-10 items-center justify-center rounded-lg border bg-background">
                      <Icon className="size-5 text-foreground" />
                    </div>
                    <div className="text-3xl font-bold tracking-tight">{stats[card.key]}</div>
                    <div className="text-sm text-muted-foreground">{card.label}</div>
                  </div>
                )
              })
            : statCards.map((card) => {
                const Icon = card.icon
                return (
                  <div key={card.key} className="rounded-lg border border-dashed p-6 bg-card shadow-sm">
                    <div className="mb-3 flex size-10 items-center justify-center rounded-lg border bg-background">
                      <Icon className="size-5 text-muted-foreground" />
                    </div>
                    <div className="text-sm text-muted-foreground">{card.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground/60">
                      Click &quot;Load Data&quot; to fetch
                    </div>
                  </div>
                )
              })}
      </div>
    </div>
  )
}
