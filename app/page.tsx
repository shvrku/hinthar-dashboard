"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import {
  CalendarCheck,
  GraduationCap,
  Users,
  UserPlus,
  RotateCcw,
  QrCode,
  BookOpen,
  Loader2,
} from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { Stats } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StandardPageHeader } from "@/components/standard-page-header"
import { RequireRole } from "@/components/require-role"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"

const statCards = [
  { key: "sessions" as const, label: "Sessions", icon: CalendarCheck },
  { key: "classes" as const, label: "Classes", icon: GraduationCap },
  { key: "teachers" as const, label: "Teachers", icon: Users },
  { key: "students" as const, label: "Students", icon: UserPlus },
  { key: "check_ins" as const, label: "Check-ins", icon: QrCode },
  { key: "subjects" as const, label: "Subjects", icon: BookOpen },
]

function OverviewContent() {
  const { getToken, isSignedIn } = useAuth()
  const [stats, setStats] = React.useState<Stats | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadStats = React.useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) return
      const data = await createApi(token).getStats()
      setStats(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : "Failed to load stats")
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn])

  React.useEffect(() => {
    void loadStats()
  }, [loadStats])

  return (
    <div className="space-y-6">
      <StandardPageHeader
        title="Dashboard"
        description="Live school operations overview."
        primaryAction={{
          label: "Refresh",
          onClick: () => void loadStats(),
          icon: loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RotateCcw className="size-4" />
          ),
        }}
        secondaryAction={{
          label: "Check-In Terminal",
          onClick: () => {
            window.location.href = "/check-in/terminal"
          },
          icon: <QrCode className="size-4" />,
          variant: "outline",
        }}
      />

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <StaggerItem key={card.key}>
            <Card className="border border-border bg-card shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <div className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground">
                  <card.icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                {loading && !stats ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-3xl font-bold tracking-tight">
                    {(stats?.[card.key] ?? 0).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  )
}

export default function OverviewPage() {
  return (
    <RequireRole mode="staff">
      <OverviewContent />
    </RequireRole>
  )
}
