"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { cn } from "@/lib/utils"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"

interface SelectItemData {
  value: string
  label: React.ReactNode
}

interface SelectContextType {
  value: string | undefined
  itemMap: Record<string, React.ReactNode>
  registerItem: (value: string, label: React.ReactNode) => void
}

const SelectContext = React.createContext<SelectContextType>({
  value: undefined,
  itemMap: {},
  registerItem: () => {},
})

function Select({
  value,
  items,
  children,
  ...props
}: SelectPrimitive.Root.Props<string> & {
  items?: SelectItemData[]
}) {
  const [itemMap, setItemMap] = React.useState<Record<string, React.ReactNode>>(() => {
    const map: Record<string, React.ReactNode> = {}
    if (items) {
      items.forEach((item) => {
        map[item.value] = item.label
      })
    }
    return map
  })

  React.useEffect(() => {
    if (items) {
      const map: Record<string, React.ReactNode> = {}
      items.forEach((item) => {
        map[item.value] = item.label
      })
      setItemMap((prev) => ({ ...prev, ...map }))
    }
  }, [items])

  const registerItem = React.useCallback((val: string, label: React.ReactNode) => {
    setItemMap((prev) => {
      if (prev[val] === label) return prev
      return { ...prev, [val]: label }
    })
  }, [])

  return (
    <SelectContext.Provider value={{ value: value as string, itemMap, registerItem }}>
      <SelectPrimitive.Root value={value} {...props}>
        {children}
      </SelectPrimitive.Root>
    </SelectContext.Provider>
  )
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue({
  className,
  placeholder,
  children,
  ...props
}: SelectPrimitive.Value.Props & { placeholder?: React.ReactNode }) {
  const { value, itemMap } = React.useContext(SelectContext)

  if (children) {
    return (
      <span className={cn("flex flex-1 text-left line-clamp-1", className)}>
        {typeof children === "function" ? children(value) : children}
      </span>
    )
  }

  const mappedLabel = value !== undefined ? itemMap[value] : undefined

  let fallbackLabel: React.ReactNode = mappedLabel

  if (fallbackLabel === undefined && value !== undefined) {
    if (value === "all") fallbackLabel = "All"
    else if (value === "present") fallbackLabel = "Present"
    else if (value === "late") fallbackLabel = "Late"
    else if (value === "absent") fallbackLabel = "Absent"
    else if (typeof value === "string" && value.includes("_")) {
      fallbackLabel = value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    }
  }

  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left line-clamp-1", className)}
      placeholder={placeholder}
      {...props}
    >
      {fallbackLabel !== undefined ? fallbackLabel : undefined}
    </SelectPrimitive.Value>
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-xl border border-input bg-background/90 px-3 text-sm font-medium whitespace-nowrap shadow-xs transition-all outline-none select-none hover:bg-muted/50 hover:border-border focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-7.5 data-[size=sm]:px-2.5 data-[size=sm]:text-xs *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground transition-transform duration-200" />
        }
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  alignItemWithTrigger = false,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "relative isolate z-50 max-h-60 w-(--anchor-width) min-w-36 overflow-x-hidden overflow-y-auto rounded-xl border border-border/80 bg-popover text-popover-foreground p-1 shadow-xl backdrop-blur-md transition-all duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List className="space-y-0.5">{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  value,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  const { registerItem } = React.useContext(SelectContext)

  React.useEffect(() => {
    if (value !== undefined) {
      registerItem(value.toString(), children)
    }
  }, [value, children, registerItem])

  return (
    <SelectPrimitive.Item
      value={value}
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-pointer items-center justify-between rounded-lg py-1.5 pr-8 pl-2.5 text-sm font-medium outline-none select-none transition-colors hover:bg-muted focus:bg-muted focus:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 items-center gap-2 whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2.5 flex size-4 items-center justify-center text-primary" />
        }
      >
        <CheckIcon className="pointer-events-none size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border/60", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 text-muted-foreground",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 text-muted-foreground",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
