"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationButton,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"

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
    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 px-4 py-3 rounded-xl border border-border/80 bg-card shadow-2xs text-xs text-muted-foreground w-full">
      {/* Items range summary */}
      <div className="text-center sm:text-left text-muted-foreground w-full sm:w-auto">
        Showing <span className="font-semibold text-foreground">{startIndex}</span> to{" "}
        <span className="font-semibold text-foreground">{endIndex}</span> of{" "}
        <span className="font-semibold text-foreground">{totalItems}</span> items
      </div>

      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto">
        {/* Rows per page selector */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="whitespace-nowrap">Rows per page</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(val) => onPageSizeChange(Number(val))}
          >
            <SelectTrigger className="h-8 w-16 text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Page navigation buttons using shadcn Pagination */}
        <Pagination className="mx-0 w-auto shrink-0">
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              />
            </PaginationItem>

            {pageNumbers.map((page) => {
              const isCurrent = page === currentPage
              const isAdjacent = Math.abs(page - currentPage) <= 1
              const isHiddenOnMobile = !isCurrent && !isAdjacent && pageNumbers.length > 3

              return (
                <PaginationItem key={page} className={isHiddenOnMobile ? "hidden sm:inline-block" : ""}>
                  <PaginationButton
                    isActive={isCurrent}
                    onClick={() => onPageChange(page)}
                  >
                    {page}
                  </PaginationButton>
                </PaginationItem>
              )
            })}

            <PaginationItem>
              <PaginationNext
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
