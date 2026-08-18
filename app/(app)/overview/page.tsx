"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useUser } from "@clerk/nextjs"
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck,
  Download,
  Minus,
  QrCode,
  ScrollText,
  UserPlus,
  Users,
} from "lucide-react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { DashboardOverviewSkeleton } from "@/components/page-skeletons"
import { ChartChunkSkeleton } from "@/components/charts/chart-chunk-skeleton"
import { StableBlock } from "@/components/animation/stable-block"
import { StandardPageHeader, buildReloadAction } from "@/components/standard-page-header"
import { RequireRole } from "@/components/require-role"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { useStatsQuery, apiQueryKeys } from "@/hooks/use-api-queries"
import { useQueryClient } from "@tanstack/react-query"
import type { AuditCategory, AuditLog, StatTrend, Stats } from "@/lib/types"
import { downloadCsv } from "@/lib/export-utils"
import { dashboardGreeting, pickDashboardSubtext } from "@/lib/dashboard-greeting"
import { cn, formatRelativeTime } from "@/lib/utils"

const StudentEnrollmentChart = dynamic(
  () =>
    import("@/components/charts/student-enrollment-chart").then(
      (m) => m.StudentEnrollmentChart
    ),
  { ssr: false, loading: () => <ChartChunkSkeleton className="h-64 min-h-[16rem]" /> }
)

const CATEGORY_LABELS: Record<AuditCategory, string> = {
  student: "Student",
  teacher: "Teacher",
  staff: "Staff",
  class: "Class",
  session: "Session",
  check_in: "Check-in",
  user: "User",
  other: "Other",
}

const kpiCards: {
  key: keyof Stats["trends"]
  label: string
  hint: string
  icon: typeof CalendarCheck
  value: (stats: Stats) => number
}[] = [
  {
    key: "students",
    label: "Students",
    hint: "Enrolled headcount",
    icon: UserPlus,
    value: (stats) => stats.students,
  },
  {
    key: "teachers",
    label: "Teachers",
    hint: "On staff",
    icon: Users,
    value: (stats) => stats.teachers,
  },
  {
    key: "sessions",
    label: "Sessions",
    hint: "Last 30 days",
    icon: CalendarCheck,
    value: (stats) => stats.trends.sessions.current,
  },
  {
    key: "check_ins",
    label: "Check-ins",
    hint: "Last 30 days",
    icon: QrCode,
    value: (stats) => stats.trends.check_ins.current,
  },
]

function TrendHint({ trend }: { trend: StatTrend }) {
  const Icon =
    trend.direction === "up"
      ? ArrowUpRight
      : trend.direction === "down"
        ? ArrowDownRight
        : Minus
  const label =
    trend.direction === "stable"
      ? "Stable vs prior 30 days"
      : `${trend.delta > 0 ? "+" : ""}${trend.delta} vs prior 30 days`

  return (
    <p
      className={cn(
        "flex items-center gap-1 text-xs",
        trend.direction === "up" && "text-attendance-present",
        trend.direction === "down" && "text-attendance-absent",
        trend.direction === "stable" && "text-muted-foreground"
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </p>
  )
}

function RecentActivity({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return (
      <Empty className="border-0 p-6">
        <EmptyHeader>
          <EmptyTitle>No activity yet</EmptyTitle>
          <EmptyDescription>
            Important changes to students, classes, sessions, and check-ins will show up here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ul className="flex flex-col">
      {logs.map((log) => (
        <li
          key={log.id}
          className="flex items-start justify-between gap-3 border-b border-border/60 py-3 last:border-b-0"
        >
          <div className="min-w-0 flex flex-col gap-0.5">
            <span className="truncate font-medium">{log.summary || "Update"}</span>
            <span className="text-xs text-muted-foreground">
              {CATEGORY_LABELS[log.category] ?? log.category}
            </span>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(log.timestamp)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function OverviewContent() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const { data: stats, isFetching, isLoading, error, refetch } = useStatsQuery()
  const loading = isLoading || isFetching
  const showSkeleton = isLoading && !stats
  const greeting = dashboardGreeting(user?.firstName)
  const [subtext, setSubtext] = React.useState(() => pickDashboardSubtext())

  return (
    <StaggerContainer className="flex flex-col gap-6">
      <StaggerItem>
        <StandardPageHeader
          title={greeting}
          description={subtext}
          secondaryAction={buildReloadAction({
            hasLoaded: !!stats,
            loading,
            onClick: () => {
              setSubtext(pickDashboardSubtext())
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

      {showSkeleton ? (
        <StaggerItem>
          <StableBlock>
            <DashboardOverviewSkeleton />
          </StableBlock>
        </StaggerItem>
      ) : (
        <>
          <StaggerItem>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!stats}
                onClick={() => {
                  if (!stats) return
                  downloadCsv(
                    "dashboard-overview.csv",
                    kpiCards.map(({ key, label, value }) => ({
                      metric: label,
                      value: value(stats),
                      delta: stats.trends[key].delta,
                      direction: stats.trends[key].direction,
                    }))
                  )
                }}
              >
                <Download data-icon="inline-start" />
                Export CSV
              </Button>
            </div>
          </StaggerItem>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map(({ key, label, hint, icon: Icon, value }) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle>{label}</CardTitle>
                  <CardDescription>{hint}</CardDescription>
                  <CardAction>
                    <Icon className="size-4 text-muted-foreground" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  {stats ? (
                    <>
                      <div className="text-2xl font-semibold tabular-nums">
                        {value(stats)}
                      </div>
                      <TrendHint trend={stats.trends[key]} />
                    </>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Student enrollment</CardTitle>
                <CardDescription>
                  {stats && stats.student_series.length < 12
                    ? "Headcount since the first recorded enrollment"
                    : "Cumulative headcount over the last 12 months"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StudentEnrollmentChart data={stats?.student_series ?? []} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>A few of the latest important changes</CardDescription>
                <CardAction>
                  <ScrollText className="size-4 text-muted-foreground" />
                </CardAction>
              </CardHeader>
              <CardContent>
                <RecentActivity logs={stats?.recent_activity ?? []} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
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
