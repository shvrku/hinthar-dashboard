"use client"

import * as React from "react"
import { useUser } from "@clerk/nextjs"
import {
  CalendarCheck,
  GraduationCap,
  Users,
  UserPlus,
  QrCode,
  BookOpen,
  Download,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardStatGridSkeleton } from "@/components/page-skeletons"
import { StableBlock } from "@/components/animation/stable-block"
import { StandardPageHeader, buildReloadAction } from "@/components/standard-page-header"
import { RequireRole } from "@/components/require-role"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { useStatsQuery, apiQueryKeys } from "@/hooks/use-api-queries"
import { useQueryClient } from "@tanstack/react-query"
import type { Stats } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { downloadCsv } from "@/lib/export-utils"
import { dashboardGreeting, pickDashboardSubtext } from "@/lib/dashboard-greeting"

const statCards: {
  key: keyof Stats
  label: string
  icon: typeof CalendarCheck
}[] = [
  { key: "sessions", label: "Sessions", icon: CalendarCheck },
  { key: "classes", label: "Classes", icon: GraduationCap },
  { key: "teachers", label: "Teachers", icon: Users },
  { key: "students", label: "Students", icon: UserPlus },
  { key: "check_ins", label: "Check-ins", icon: QrCode },
  { key: "subjects", label: "Subjects", icon: BookOpen },
]

function OverviewContent() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const { data: stats, isFetching, isLoading, error, refetch } = useStatsQuery()
  const loading = isLoading || isFetching
  const showSkeleton = isLoading && !stats
  const greeting = dashboardGreeting(user?.firstName)
  const subtext = React.useMemo(() => pickDashboardSubtext(), [])

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <StandardPageHeader
          title={greeting}
          description={subtext}
          secondaryAction={buildReloadAction({
            hasLoaded: !!stats,
            loading,
            onClick: () => {
              void queryClient.invalidateQueries({ queryKey: apiQueryKeys.stats })
              void refetch()
            },
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
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load stats"}
          </p>
        </StaggerItem>
      ) : null}

      <StaggerItem>
        <StableBlock>
          {showSkeleton ? (
            <DashboardStatGridSkeleton />
          ) : (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={!stats}
                  onClick={() => {
                    if (!stats) return
                    downloadCsv(
                      "dashboard-stats.csv",
                      statCards.map(({ key, label }) => ({
                        metric: label,
                        value: stats[key],
                      }))
                    )
                  }}
                >
                  <Download className="size-3.5" />
                  Export CSV
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {statCards.map(({ key, label, icon: Icon }) => (
                  <Card key={key}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{label}</CardTitle>
                      <Icon className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      {stats ? (
                        <div className="text-2xl font-bold">{stats[key]}</div>
                      ) : (
                        <Skeleton className="h-8 w-16" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </StableBlock>
      </StaggerItem>
    </StaggerContainer>
  )
}

export default function HomePage() {
  return (
    <RequireRole mode="staff">
      <OverviewContent />
    </RequireRole>
  )
}
