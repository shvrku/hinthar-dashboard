"use client"

import * as React from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { downloadCsv, exportContainerChartPng } from "@/lib/export-utils"

export function ChartExportMenu({
  filenameBase,
  csvRows,
  chartRef,
  disabled,
}: {
  filenameBase: string
  csvRows?: Record<string, unknown>[]
  chartRef?: React.RefObject<HTMLElement | null>
  disabled?: boolean
}) {
  const [busy, setBusy] = React.useState(false)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={disabled || busy} />
        }
      >
        <Download className="size-3.5" />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          className="cursor-pointer"
          disabled={!csvRows?.length}
          onClick={() => {
            if (!csvRows?.length) return
            downloadCsv(`${filenameBase}.csv`, csvRows)
          }}
        >
          Download CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          disabled={!chartRef}
          onClick={() => {
            if (!chartRef) return
            setBusy(true)
            void exportContainerChartPng(chartRef.current, `${filenameBase}.png`).finally(() =>
              setBusy(false)
            )
          }}
        >
          Download PNG
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
