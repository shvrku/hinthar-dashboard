"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ChartExportMenu } from "@/components/chart-export-menu"
import { formatBackendDate } from "@/lib/utils"
import type { StudentSeriesPoint } from "@/lib/types"

const enrollmentConfig = {
  count: { label: "Students", color: "var(--chart-1)" },
} satisfies ChartConfig

export function StudentEnrollmentChart({ data }: { data: StudentSeriesPoint[] }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const gradientId = React.useId().replace(/:/g, "")

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <ChartExportMenu
          filenameBase="student-enrollment"
          chartRef={ref}
          csvRows={data}
          disabled={data.length === 0}
        />
      </div>
      <div ref={ref}>
        <ChartContainer config={enrollmentConfig} className="h-64 w-full aspect-auto">
          <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 8 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.28} />
                <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: string) =>
                formatBackendDate(value, { month: "short" })
              }
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    formatBackendDate(String(value), { month: "short", year: "numeric" })
                  }
                />
              }
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--color-count)"
              fill={`url(#${gradientId})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  )
}
