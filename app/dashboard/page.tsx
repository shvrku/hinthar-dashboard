"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { CalendarCheck, GraduationCap, Users, UserPlus, RotateCcw, QrCode, BookOpen, Loader2 } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { Stats } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
    <Card className="p-6 space-y-3">
      <div className="size-10 animate-pulse rounded-lg bg-muted" />
      <div className="h-8 w-20 animate-pulse rounded bg-muted" />
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
    </Card>
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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="mb-6 h-4 w-72 animate-pulse rounded-lg bg-muted" />
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
        <p className="text-muted-foreground font-medium">Please sign in to view the dashboard.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of your school management system metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={loadStats} disabled={loading} variant="default" className="shadow-xs">
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

          {stats !== null && !loading && (
            <Badge variant="secondary" className="px-3 py-1.5 text-xs">
              Loaded {new Date().toLocaleTimeString()}
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button size="xs" variant="ghost" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading && !stats
          ? statCards.map((card) => <StatSkeleton key={card.key} />)
          : stats
            ? statCards.map((card) => {
                const Icon = card.icon
                return (
                  <Card key={card.key} className="hover:border-ring/50 transition-all hover:shadow-md">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {card.label}
                      </CardTitle>
                      <div className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-muted/30">
                        <Icon className="size-4 text-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold tracking-tight">{stats[card.key]}</div>
                    </CardContent>
                  </Card>
                )
              })
            : statCards.map((card) => {
                const Icon = card.icon
                return (
                  <Card key={card.key} className="border-dashed bg-muted/20">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {card.label}
                      </CardTitle>
                      <div className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-background/50">
                        <Icon className="size-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-semibold tracking-tight text-muted-foreground">—</div>
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        Click &quot;Load Data&quot; to fetch metrics
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
      </div>
    </div>
  )
}
