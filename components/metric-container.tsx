"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface MetricContainerProps {
  children: React.ReactNode
  className?: string
}

export function MetricContainer({ children, className }: MetricContainerProps) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6", className)}>
      {children}
    </div>
  )
}
