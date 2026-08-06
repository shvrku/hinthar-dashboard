"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

export interface SearchableOption {
  value: string
  label: string
  subLabel?: string
}

interface SearchableSelectProps {
  options: SearchableOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  triggerClassName?: string
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder,
  className,
  triggerClassName,
}: SearchableSelectProps) {
  const selected = React.useMemo(
    () => options.find((opt) => opt.value === value) ?? null,
    [options, value]
  )

  return (
    <div className={cn("w-full", className)}>
      <Combobox
        items={options}
        value={selected}
        onValueChange={(item) => {
          if (item) onValueChange(item.value)
        }}
        itemToStringLabel={(item) => item.label}
        itemToStringValue={(item) => item.value}
        isItemEqualToValue={(a, b) => a.value === b.value}
        filter={(item, query) => {
          const q = query.trim().toLowerCase()
          if (!q) return true
          return (
            item.label.toLowerCase().includes(q) ||
            (item.subLabel?.toLowerCase().includes(q) ?? false)
          )
        }}
        autoHighlight
      >
        <ComboboxInput
          placeholder={searchPlaceholder ?? placeholder}
          className={cn("w-full", triggerClassName)}
          showClear={false}
        />
        <ComboboxContent className="min-w-[var(--anchor-width)]">
          <ComboboxEmpty>No results found.</ComboboxEmpty>
          <ComboboxList>
            {(item) => (
              <ComboboxItem key={item.value} value={item}>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate">{item.label}</span>
                  {item.subLabel ? (
                    <span className="truncate text-[11px] text-muted-foreground">
                      {item.subLabel}
                    </span>
                  ) : null}
                </div>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
