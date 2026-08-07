"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import {
  CalendarCheck,
  GraduationCap,
  Users,
  UserPlus,
  QrCode,
  BookOpen,
} from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { Stats } from "@/lib/types"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardStatGridSkeleton } from "@/components/page-skeletons"
import { StableBlock } from "@/components/animation/stable-block"
import { StandardPageHeader, buildReloadAction } from "@/components/standard-page-header"
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

  const showSkeleton = loading && !stats

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <StandardPageHeader
          title="Dashboard"
          description="Live school operations overview."
          secondaryAction={buildReloadAction({
            hasLoaded: !!stats,
            loading,
            onClick: () => void loadStats(),
          })}
          primaryAction={{
            label: "Check-In Terminal",
            onClick: () => {
              window.location.href = "/check-in/terminal"
            },
            icon: <QrCode className="size-4" />,
          }}
        />
      </StaggerItem>

      {error ? (
        <StaggerItem>
          <p className="text-sm text-destructive">{error}</p>
        </StaggerItem>
      ) : null}

      <StableBlock lock={showSkeleton}>
        {showSkeleton ? (
          <DashboardStatGridSkeleton />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {statCards.map((card) => (
              <Card
                key={card.key}
                className="border border-border bg-card shadow-xs"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </CardTitle>
                  <div className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground">
                    <card.icon className="size-4" />
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0">
                  {loading ? (
                    <Skeleton className="h-9 w-20" />
                  ) : (
                    <div className="text-3xl font-bold tracking-tight">
                      {(stats?.[card.key] ?? 0).toLocaleString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </StableBlock>
    </StaggerContainer>
  )
}

export default function OverviewPage() {
  return (
    <RequireRole mode="staff">
      <OverviewContent />
    </RequireRole>
  )
}
