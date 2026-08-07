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
  /** Extra classes for the popup (e.g. wider panel). */
  contentClassName?: string
  /** Allow long labels to wrap instead of truncating. */
  wrapLabels?: boolean
  disabled?: boolean
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder,
  className,
  triggerClassName,
  contentClassName,
  wrapLabels = false,
  disabled = false,
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
        disabled={disabled}
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
          disabled={disabled}
        />
        <ComboboxContent
          className={cn(
            "min-w-[var(--anchor-width)] w-[var(--anchor-width)] max-w-[min(100vw-2rem,36rem)]",
            contentClassName
          )}
        >
          <ComboboxEmpty>No results found.</ComboboxEmpty>
          <ComboboxList>
            {(item) => (
              <ComboboxItem key={item.value} value={item}>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-0.5">
                  <span className={cn(wrapLabels ? "whitespace-normal break-words" : "truncate")}>
                    {item.label}
                  </span>
                  {item.subLabel ? (
                    <span
                      className={cn(
                        "text-[11px] text-muted-foreground",
                        wrapLabels ? "whitespace-normal break-words" : "truncate"
                      )}
                    >
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
