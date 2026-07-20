import * as React from "react"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SortOrder } from "@/lib/use-sortable-data"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto rounded-xl border border-border/70 bg-card shadow-xs">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm border-collapse", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-muted/40 font-medium text-muted-foreground [&_tr]:border-b", className)}
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
      className={cn("border-t bg-muted/50 font-medium [&>tr]:last-child:border-0", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border/50 transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted",
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
        "h-11 px-4 py-3.5 text-left align-middle font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap [&:has([role=checkbox])]:pr-0",
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
  children: React.ReactNode
}

function TableHeadSortable({
  sortKey,
  currentSortKey,
  currentSortOrder,
  onSort,
  children,
  className,
  ...props
}: TableHeadSortableProps) {
  const isSorted = currentSortKey === sortKey
  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none hover:text-foreground transition-colors group/sort",
        className
      )}
      onClick={() => onSort(sortKey)}
      {...props}
    >
      <div className="inline-flex items-center gap-1.5">
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
        "px-4 py-3.5 align-middle text-sm text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
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
}
