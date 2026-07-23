"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface MetricCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  description?: string
  trend?: {
    value: string
    positive?: boolean
  }
  className?: string
}

export function MetricCard({
  title,
  value,
  icon,
  description,
  trend,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("overflow-hidden transition-all hover:border-border/80", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between space-x-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          {icon && (
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">{value}</h2>
          {trend && (
            <span
              className={cn(
                "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md",
                trend.positive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              )}
            >
              {trend.value}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
