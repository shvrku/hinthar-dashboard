"use client"

import * as React from "react"

import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export function EditorOptionChip({
  icon: Icon,
  label,
  value,
  active,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex max-w-[9rem] shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap",
          active ? "border-primary/30 bg-primary/10 text-primary" : "text-muted-foreground"
        )}
      >
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{value || label}</span>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="center" side="top" sideOffset={12}>
        <PopoverHeader>
          <PopoverTitle>{label}</PopoverTitle>
        </PopoverHeader>
        {children}
      </PopoverContent>
    </Popover>
  )
}
