"use client"

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import { ATTENDANCE_STATUS_COLORS, CAMPUS_CHECKIN_COLOR } from "@/lib/chart-colors"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const statusConfig = {
  present: { label: "Present", color: ATTENDANCE_STATUS_COLORS.present },
  late: { label: "Late", color: ATTENDANCE_STATUS_COLORS.late },
  absent: { label: "Absent", color: ATTENDANCE_STATUS_COLORS.absent },
  excused: { label: "Excused", color: ATTENDANCE_STATUS_COLORS.excused },
} satisfies ChartConfig

const campusConfig = {
  checked_in: { label: "Checked in", color: CAMPUS_CHECKIN_COLOR },
} satisfies ChartConfig

export type ClassCampusPoint = { date: string; checked_in: number }
export type ClassStatusSlice = { status: string; count: number; name: string }
export type ClassStackRow = {
  name: string
  present: number
  late: number
  absent: number
  excused: number
}

export function ClassCampusChart({ data }: { data: ClassCampusPoint[] }) {
  return (
    <ChartContainer config={campusConfig} className="h-52 w-full aspect-auto">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="checked_in" fill="var(--color-checked_in)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

export function ClassLessonCharts({
  statusData,
  subjectData,
}: {
  statusData: ClassStatusSlice[]
  subjectData: ClassStackRow[]
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ChartContainer config={statusConfig} className="mx-auto h-48 w-full max-w-[240px] aspect-square">
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
      {subjectData.length > 0 && (
        <ChartContainer config={statusConfig} className="h-52 w-full aspect-auto">
          <BarChart data={subjectData} layout="vertical">
            <CartesianGrid horizontal={false} />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="present" stackId="a" fill="var(--color-present)" />
            <Bar dataKey="late" stackId="a" fill="var(--color-late)" />
            <Bar dataKey="absent" stackId="a" fill="var(--color-absent)" />
            <Bar dataKey="excused" stackId="a" fill="var(--color-excused)" />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  )
}
