"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface StandardTablePaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  startIndex: number
  endIndex: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function StandardTablePagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: StandardTablePaginationProps) {
  // Generate page numbers array
  const pageNumbers = React.useMemo(() => {
    const pages: number[] = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }, [currentPage, totalPages])

  return (
    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-4 py-3 rounded-xl border border-border/80 bg-card shadow-2xs text-xs text-muted-foreground">
      {/* Items range summary */}
      <div>
        Showing <span className="font-semibold text-foreground">{startIndex}</span> to{" "}
        <span className="font-semibold text-foreground">{endIndex}</span> of{" "}
        <span className="font-semibold text-foreground">{totalItems}</span> items
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {/* Rows per page selector */}
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(val) => onPageSizeChange(Number(val))}
          >
            <SelectTrigger className="h-8 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Page navigation buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            title="Previous Page"
          >
            <ChevronLeft className="size-3.5" />
          </Button>

          {pageNumbers.map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="xs"
              onClick={() => onPageChange(page)}
              className="h-7 w-7 p-0"
            >
              {page}
            </Button>
          ))}

          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            title="Next Page"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
