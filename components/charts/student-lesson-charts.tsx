"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, XAxis, YAxis } from "recharts"
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

const lessonStatusChartConfig = {
  present: { label: "Present", color: ATTENDANCE_STATUS_COLORS.present },
  late: { label: "Late", color: ATTENDANCE_STATUS_COLORS.late },
  absent: { label: "Absent", color: ATTENDANCE_STATUS_COLORS.absent },
  excused: { label: "Excused", color: ATTENDANCE_STATUS_COLORS.excused },
} satisfies ChartConfig

const lessonStackChartConfig = {
  present: { label: "Present", color: ATTENDANCE_STATUS_COLORS.present },
  late: { label: "Late", color: ATTENDANCE_STATUS_COLORS.late },
  absent: { label: "Absent", color: ATTENDANCE_STATUS_COLORS.absent },
  excused: { label: "Excused", color: ATTENDANCE_STATUS_COLORS.excused },
} satisfies ChartConfig

export type StudentStatusSlice = { name: string; value: number; status: string }
export type StudentStackRow = {
  name: string
  present: number
  late: number
  absent: number
  excused: number
}

export function StudentLessonCharts({
  statusData,
  subjectData,
  classData,
  totalSessions,
}: {
  statusData: StudentStatusSlice[]
  subjectData: StudentStackRow[]
  classData: StudentStackRow[]
  totalSessions: number
}) {
  const pieRef = React.useRef<HTMLDivElement>(null)
  const barRef = React.useRef<HTMLDivElement>(null)
  const stackRows = subjectData.length > 0 ? subjectData : classData
  const stackKind = subjectData.length > 0 ? "by-subject" : "by-class"

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        <ChartExportMenu
          filenameBase="student-lesson-status"
          chartRef={pieRef}
          csvRows={statusData.map((r) => ({ status: r.status, count: r.value }))}
        />
        <ChartExportMenu
          filenameBase={`student-lesson-${stackKind}`}
          chartRef={barRef}
          csvRows={stackRows}
          disabled={stackRows.length === 0}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div ref={pieRef}>
          <ChartContainer
            config={lessonStatusChartConfig}
            className="mx-auto h-48 w-full max-w-[240px] aspect-square"
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="status"
                innerRadius={40}
                outerRadius={64}
                paddingAngle={2}
              >
                {statusData.map((entry) => (
                  <Cell key={entry.status} fill={`var(--color-${entry.status})`} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-lg font-bold">
                            {totalSessions}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 16}
                            className="fill-muted-foreground text-[10px]"
                          >
                            sessions
                          </tspan>
                        </text>
                      )
                    }
                    return null
                  }}
                />
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="status" />} />
            </PieChart>
          </ChartContainer>
        </div>
        {stackRows.length > 0 ? (
          <div ref={barRef}>
            <ChartContainer config={lessonStackChartConfig} className="h-52 w-full aspect-auto">
              <BarChart data={stackRows} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="present" stackId="a" fill="var(--color-present)" />
                <Bar dataKey="late" stackId="a" fill="var(--color-late)" />
                <Bar dataKey="absent" stackId="a" fill="var(--color-absent)" />
                <Bar dataKey="excused" stackId="a" fill="var(--color-excused)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="flex h-52 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            No subject breakdown for this range.
          </div>
        )}
      </div>
    </div>
  )
}
