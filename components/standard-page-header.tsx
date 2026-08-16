"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, RotateCcw } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface PageHeaderAction {
  label: string
  onClick: () => void
  icon?: React.ReactNode
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  disabled?: boolean
}

export interface PageHeaderBack {
  href: string
  /** e.g. "Students" → rendered as "Back to Students" */
  label: string
}

interface StandardPageHeaderProps {
  title: string
  description?: string
  className?: string
  /** Ghost nav link — always "Back to {label}". */
  back?: PageHeaderBack
  primaryAction?: PageHeaderAction
  /** Prefer reload/refresh here (outline). */
  secondaryAction?: PageHeaderAction
  children?: React.ReactNode
}

/**
 * Shared management-page chrome.
 *
 * Action slots (left → right): back | children (tertiary outline) | secondary (outline reload) | primary (filled CTA)
 */
export function StandardPageHeader({
  title,
  description,
  className,
  back,
  primaryAction,
  secondaryAction,
  children,
}: StandardPageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 border-b border-border/50 pb-4 md:flex-row md:items-center md:justify-between",
        className
      )}
    >
      <div className="space-y-1">
        {back && (
          <Link
            href={back.href}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 mb-1 h-8 w-fit gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowLeft className="size-3.5" />
            Back to {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {children}
        {secondaryAction && (
          <Button
            variant={secondaryAction.variant || "outline"}
            size="sm"
            onClick={secondaryAction.onClick}
            disabled={secondaryAction.disabled}
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
            disabled={primaryAction.disabled}
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

/** Before first successful fetch: "Load Data"; after: "Refresh". Never swap to Loading… */
export function reloadActionLabel(hasLoaded: boolean): "Load Data" | "Refresh" {
  return hasLoaded ? "Refresh" : "Load Data"
}

/** Standard outline reload for `secondaryAction`. Icon spins while `loading`; label stays stable. */
export function buildReloadAction({
  hasLoaded,
  loading,
  onClick,
}: {
  hasLoaded: boolean
  loading: boolean
  onClick: () => void
}): PageHeaderAction {
  return {
    label: reloadActionLabel(hasLoaded),
    onClick,
    disabled: loading,
    variant: "outline",
    icon: (
      <RotateCcw className={cn("size-4", loading && "animate-spin")} />
    ),
  }
}
