"use client"

import * as React from "react"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

import { cn } from "@/lib/utils"
import type { SortOrder } from "@/lib/use-sortable-data"

function useSyncedHorizontalScroll(defaultTrackWidth = 900) {
  const topBarRef = React.useRef<HTMLDivElement | null>(null)
  const containerElRef = React.useRef<HTMLDivElement | null>(null)
  const [containerNode, setContainerNode] = React.useState<HTMLDivElement | null>(null)
  const syncingSource = React.useRef<"top" | "main" | null>(null)
  const [trackWidth, setTrackWidth] = React.useState(defaultTrackWidth)

  const containerRef = React.useCallback((node: HTMLDivElement | null) => {
    containerElRef.current = node
    setContainerNode((prev) => (prev === node ? prev : node))
  }, [])

  React.useEffect(() => {
    if (!containerNode) {
      setTrackWidth(defaultTrackWidth)
      return
    }

    const updateWidth = () => {
      const next = Math.max(
        defaultTrackWidth,
        containerNode.scrollWidth,
        containerNode.clientWidth
      )
      setTrackWidth((prev) => (prev === next ? prev : next))
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(containerNode)
    if (containerNode.firstElementChild) {
      observer.observe(containerNode.firstElementChild)
    }

    return () => observer.disconnect()
  }, [containerNode, defaultTrackWidth])

  const onTopScroll = React.useCallback(() => {
    if (syncingSource.current === "main") {
      syncingSource.current = null
      return
    }
    const top = topBarRef.current
    const main = containerElRef.current
    if (!top || !main) return
    if (Math.abs(main.scrollLeft - top.scrollLeft) <= 1) return
    syncingSource.current = "top"
    main.scrollLeft = top.scrollLeft
    requestAnimationFrame(() => {
      if (syncingSource.current === "top") syncingSource.current = null
    })
  }, [])

  const onMainScroll = React.useCallback(() => {
    if (syncingSource.current === "top") {
      syncingSource.current = null
      return
    }
    const top = topBarRef.current
    const main = containerElRef.current
    if (!top || !main) return
    if (Math.abs(top.scrollLeft - main.scrollLeft) <= 1) return
    syncingSource.current = "main"
    top.scrollLeft = main.scrollLeft
    requestAnimationFrame(() => {
      if (syncingSource.current === "main") syncingSource.current = null
    })
  }, [])

  const scrollByAmount = React.useCallback((delta: number) => {
    const main = containerElRef.current
    if (!main) return
    main.scrollBy({ left: delta, behavior: "smooth" })
  }, [])

  return {
    topBarRef,
    containerRef,
    trackWidth,
    onTopScroll,
    onMainScroll,
    scrollByAmount,
  }
}

function Table({
  className,
  containerClassName,
  noWrapper = false,
  ...props
}: React.ComponentProps<"table"> & {
  containerClassName?: string
  noWrapper?: boolean
}) {
  const tableElement = (
    <table
      data-slot="table"
      className={cn("w-full caption-bottom border-collapse text-sm", className)}
      {...props}
    />
  )

  if (noWrapper) {
    return tableElement
  }

  return (
    <div
      data-slot="table-container"
      className={cn("relative w-full max-w-full overflow-x-auto overflow-y-hidden custom-scrollbar", containerClassName)}
    >
      {tableElement}
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "sticky top-0 z-20 bg-zinc-950 border-b border-zinc-800 [&_tr]:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border/60 transition-colors hover:bg-muted/40 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-9 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

interface TableHeadSortableProps extends React.ComponentProps<"th"> {
  sortKey: string
  currentSortKey: string | null
  currentSortOrder: SortOrder
  onSort: (key: string) => void
  align?: "left" | "center" | "right"
  children: React.ReactNode
}

function TableHeadSortable({
  sortKey,
  currentSortKey,
  currentSortOrder,
  onSort,
  align = "left",
  children,
  className,
  ...props
}: TableHeadSortableProps) {
  const isSorted = currentSortKey === sortKey
  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none hover:text-foreground transition-colors group/sort",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
      onClick={() => onSort(sortKey)}
      {...props}
    >
      <div
        className={cn(
          "inline-flex items-center gap-1.5",
          align === "right" && "ml-auto justify-end",
          align === "center" && "mx-auto justify-center"
        )}
      >
        <span>{children}</span>
        {isSorted ? (
          currentSortOrder === "asc" ? (
            <ArrowUp className="size-3.5 text-foreground" />
          ) : (
            <ArrowDown className="size-3.5 text-foreground" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 text-muted-foreground/40 group-hover/sort:text-muted-foreground transition-colors" />
        )}
      </div>
    </TableHead>
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-4 py-2 align-middle text-xs whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableHeadSortable,
  TableRow,
  TableCell,
  TableCaption,
  useSyncedHorizontalScroll,
}
