"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import { ATTENDANCE_STATUS_COLORS } from "@/lib/chart-colors"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ChartExportMenu } from "@/components/chart-export-menu"

const statusConfig = {
  present: { label: "Present", color: ATTENDANCE_STATUS_COLORS.present },
  late: { label: "Late", color: ATTENDANCE_STATUS_COLORS.late },
  absent: { label: "Absent", color: ATTENDANCE_STATUS_COLORS.absent },
  excused: { label: "Excused", color: ATTENDANCE_STATUS_COLORS.excused },
} satisfies ChartConfig

const outcomeConfig = {
  unmarked: { label: "Unmarked", color: "var(--muted-foreground)" },
  present: { label: "Present", color: "var(--chart-1)" },
  covered: { label: "Covered", color: "var(--chart-2)" },
  cover_taught: { label: "Cover taught", color: "var(--chart-4)" },
  no_show: { label: "No show", color: "var(--chart-5)" },
  cancelled: { label: "Cancelled", color: "var(--muted-foreground)" },
} satisfies ChartConfig

export type TeacherStatusSlice = { status: string; count: number; name: string }
export type TeacherStackRow = {
  name: string
  present: number
  late: number
  absent: number
  excused: number
}
export type TeacherOutcomeSlice = { outcome: string; count: number; name: string }

export function TeacherAccountabilityCharts({
  statusData,
  subjectData,
}: {
  statusData: TeacherStatusSlice[]
  subjectData: TeacherStackRow[]
}) {
  const pieRef = React.useRef<HTMLDivElement>(null)
  const barRef = React.useRef<HTMLDivElement>(null)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        <ChartExportMenu
          filenameBase="teacher-accountability-status"
          chartRef={pieRef}
          csvRows={statusData.map((r) => ({ status: r.status, count: r.count }))}
        />
        <ChartExportMenu
          filenameBase="teacher-accountability-by-subject"
          chartRef={barRef}
          csvRows={subjectData}
          disabled={subjectData.length === 0}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div ref={pieRef}>
          <ChartContainer config={statusConfig} className="mx-auto h-48 w-full max-w-[260px] aspect-square">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
              <Pie data={statusData} dataKey="count" nameKey="status" innerRadius={42} outerRadius={70}>
                {statusData.map((item) => (
                  <Cell key={item.status} fill={`var(--color-${item.status})`} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="status" />} />
            </PieChart>
          </ChartContainer>
        </div>
        {subjectData.length > 0 ? (
          <div ref={barRef}>
            <ChartContainer config={statusConfig} className="h-72 w-full aspect-auto">
              <BarChart data={subjectData} layout="vertical">
                <CartesianGrid horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="present" stackId="a" fill="var(--color-present)" />
                <Bar dataKey="late" stackId="a" fill="var(--color-late)" />
                <Bar dataKey="absent" stackId="a" fill="var(--color-absent)" />
                <Bar dataKey="excused" stackId="a" fill="var(--color-excused)" />
              </BarChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="flex h-72 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            No subject breakdown for this range.
          </div>
        )}
      </div>
    </div>
  )
}

export function TeacherPersonalOutcomeChart({ outcomes }: { outcomes: TeacherOutcomeSlice[] }) {
  const ref = React.useRef<HTMLDivElement>(null)
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ChartExportMenu
          filenameBase="teacher-personal-outcomes"
          chartRef={ref}
          csvRows={outcomes.map((o) => ({ outcome: o.outcome, count: o.count }))}
        />
      </div>
      <div ref={ref}>
        <ChartContainer config={outcomeConfig} className="mx-auto h-56 w-full max-w-[280px] aspect-square">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="outcome" hideLabel />} />
            <Pie data={outcomes} dataKey="count" nameKey="outcome" innerRadius={48} outerRadius={80}>
              {outcomes.map((item) => (
                <Cell key={item.outcome} fill={`var(--color-${item.outcome})`} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="outcome" />} />
          </PieChart>
        </ChartContainer>
      </div>
    </div>
  )
}
