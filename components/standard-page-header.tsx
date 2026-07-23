"use client"

import React from "react"
import { Button } from "@/components/ui/button"

export interface PageHeaderAction {
  label: string
  onClick: () => void
  icon?: React.ReactNode
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

interface StandardPageHeaderProps {
  title: string
  description?: string
  primaryAction?: PageHeaderAction
  secondaryAction?: PageHeaderAction
  children?: React.ReactNode
}

export function StandardPageHeader({
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
}: StandardPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-4 md:flex-row md:items-center md:justify-between border-b border-border/50 mb-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {children}
        {secondaryAction && (
          <Button
            variant={secondaryAction.variant || "outline"}
            size="sm"
            onClick={secondaryAction.onClick}
            className="gap-1.5"
          >
            {secondaryAction.icon}
            {secondaryAction.label}
          </Button>
        )}
        {primaryAction && (
          <Button
            variant={primaryAction.variant || "default"}
            size="sm"
            onClick={primaryAction.onClick}
            className="gap-1.5"
          >
            {primaryAction.icon}
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
}
