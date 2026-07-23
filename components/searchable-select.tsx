"use client"

import * as React from "react"
import { Popover } from "@base-ui/react/popover"
import { Check, ChevronsUpDown, Search, X } from "lucide-react"

import { cn } from "@/lib/utils"

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
  searchPlaceholder = "Search...",
  className,
  triggerClassName,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const selectedOption = React.useMemo(() => {
    return options.find((opt) => opt.value === value)
  }, [options, value])

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options
    const q = searchQuery.toLowerCase().trim()
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q))
    )
  }, [options, searchQuery])

  // When open changes, focus input
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 20)
    } else {
      setSearchQuery("")
    }
  }, [open])

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        nativeButton={true}
        render={
          <button
            type="button"
            className={cn(
              "relative flex h-9 w-full items-center justify-between gap-2 rounded-4xl border border-input bg-input/30 px-3.5 text-xs font-medium text-foreground transition-all hover:bg-input/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer select-none outline-none",
              open && "border-ring ring-2 ring-ring/50 bg-background",
              triggerClassName
            )}
          >
            <span className="truncate font-semibold">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
          </button>
        }
      />

      <Popover.Portal container={typeof document !== "undefined" ? document.body : null}>
        <Popover.Positioner side="bottom" align="start" sideOffset={4} className="z-50 min-w-[var(--anchor-width)]">
          <Popover.Popup
            className={cn(
              "w-[var(--anchor-width)] min-w-[200px] max-w-xs rounded-xl border border-border bg-popover/95 p-1.5 text-popover-foreground shadow-xl backdrop-blur-md outline-none duration-150 animate-in fade-in-0 slide-in-from-top-1 flex flex-col gap-1.5",
              className
            )}
          >
            {/* Floating Search Header */}
            <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/40 px-2.5 py-1.5 text-xs">
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Floating Options List */}
            <div className="max-h-56 overflow-y-auto hinthar-scrollbar space-y-0.5">
              {filteredOptions.length === 0 ? (
                <p className="p-2.5 text-center text-xs text-muted-foreground">
                  No results found.
                </p>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onValueChange(opt.value)
                        setOpen(false)
                        setSearchQuery("")
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-foreground hover:bg-muted/60"
                      )}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{opt.label}</span>
                        {opt.subLabel && (
                          <span
                            className={cn(
                              "text-[10px] truncate",
                              isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                            )}
                          >
                            {opt.subLabel}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="size-3.5 shrink-0 ml-2" />}
                    </button>
                  )
                })
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
