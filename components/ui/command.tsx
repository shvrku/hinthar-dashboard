"use client"

import * as React from "react"
import { Search, X } from "lucide-react"

import { cn } from "@/lib/utils"

function Command({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="command"
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function CommandInput({
  className,
  value,
  onValueChange,
  placeholder = "Search...",
  ...props
}: {
  value?: string
  onValueChange?: (val: string) => void
  placeholder?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/40 px-2.5 py-1.5 text-xs">
      <Search className="size-3.5 shrink-0 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none font-medium",
          className
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange?.("")}
          className="text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}

function CommandList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="command-list"
      className={cn(
        "max-h-56 overflow-y-auto hinthar-scrollbar space-y-0.5 p-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function CommandEmpty({
  className,
  children = "No results found.",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="command-empty"
      className={cn("p-2.5 text-center text-xs text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function CommandGroup({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="command-group"
      className={cn("overflow-hidden p-1 text-foreground", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function CommandItem({
  className,
  children,
  onSelect,
  isSelected,
  ...props
}: {
  onSelect?: () => void
  isSelected?: boolean
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="command-item"
      data-selected={isSelected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer select-none",
        isSelected
          ? "bg-primary text-primary-foreground font-semibold"
          : "text-foreground hover:bg-muted/60",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
}
