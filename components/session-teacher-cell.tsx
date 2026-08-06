"use client"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type TeacherLike = { id?: number; name: string } | null | undefined

/**
 * Shows who is teaching: substitute name when set, otherwise assigned.
 * Substitute badge + hover tip reveals the assigned teacher.
 */
export function SessionTeacherCell({
  teacher,
  actualTeacher,
  className,
}: {
  teacher: TeacherLike
  actualTeacher?: TeacherLike
  className?: string
}) {
  const assignedName = teacher?.name?.trim() || null
  const substituteName = actualTeacher?.name?.trim() || null
  const hasSubstitute = Boolean(actualTeacher?.id ?? substituteName)
  const displayName = hasSubstitute ? substituteName : assignedName

  if (!displayName) {
    return <span className="text-muted-foreground">—</span>
  }

  const nameEl = (
    <span
      className={cn(
        "truncate font-medium text-foreground",
        hasSubstitute &&
          "cursor-pointer transition-colors duration-150 hover:text-primary hover:underline decoration-dashed decoration-primary/40 underline-offset-3",
        className
      )}
    >
      {displayName}
    </span>
  )

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {hasSubstitute ? (
        <Tooltip>
          <TooltipTrigger className="min-w-0 text-left focus:outline-none">
            {nameEl}
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-xs break-words rounded-xl border border-border/80 bg-popover px-3 py-2 text-xs font-normal text-popover-foreground shadow-lg space-y-0.5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Assigned
            </p>
            <p className="text-xs font-medium text-foreground">
              {assignedName ?? "—"}
            </p>
          </TooltipContent>
        </Tooltip>
      ) : (
        nameEl
      )}
      {hasSubstitute ? (
        <Badge variant="secondary" className="shrink-0 text-[10px] font-semibold">
          Substitute
        </Badge>
      ) : null}
    </div>
  )
}
