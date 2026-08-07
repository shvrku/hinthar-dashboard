"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
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
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import { useTableReveal } from "@/components/animation/table-reveal-context"

interface StandardTablePaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  startIndex: number
  endIndex: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  /** True while the current page of rows is being fetched. */
  loading?: boolean
  className?: string
  /**
   * Which bar this is — used to reverse table row entrance when the user
   * paginates from the bottom control.
   */
  placement?: "top" | "bottom"
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
  loading = false,
  className,
  placement,
}: StandardTablePaginationProps) {
  const reveal = useTableReveal()

  const markOrigin = React.useCallback(() => {
    if (placement === "bottom") reveal.markBottom()
    else if (placement === "top") reveal.markTop()
  }, [placement, reveal])

  const handlePageChange = React.useCallback(
    (page: number) => {
      markOrigin()
      onPageChange(page)
    },
    [markOrigin, onPageChange]
  )

  const handlePageSizeChange = React.useCallback(
    (size: number) => {
      markOrigin()
      onPageSizeChange(size)
    },
    [markOrigin, onPageSizeChange]
  )

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
    <div
      className={cn(
        "flex w-full flex-col items-center justify-between gap-3 rounded-xl border border-border/80 bg-card px-4 py-3 text-xs text-muted-foreground shadow-2xs sm:flex-row sm:gap-4",
        loading && "opacity-90",
        className
      )}
      aria-busy={loading}
    >
      <div className="flex w-full items-center justify-center gap-2 text-center sm:w-auto sm:justify-start sm:text-left">
        {loading ? (
          <>
            <Loader2 className="size-3.5 shrink-0 animate-spin text-foreground" />
            <span className="font-medium text-foreground">Loading page…</span>
          </>
        ) : (
          <span>
            Showing <span className="font-semibold text-foreground">{startIndex}</span> to{" "}
            <span className="font-semibold text-foreground">{endIndex}</span> of{" "}
            <span className="font-semibold text-foreground">{totalItems}</span> items
          </span>
        )}
      </div>

      <div className="flex w-full flex-wrap items-center justify-center gap-3 sm:w-auto sm:justify-end sm:gap-4">
        <div className="flex shrink-0 items-center gap-2">
          <span className="whitespace-nowrap">Rows per page</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(val) => handlePageSizeChange(Number(val))}
            disabled={loading}
          >
            <SelectTrigger className="h-8 w-16 bg-background text-xs">
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

        <Pagination className="mx-0 w-auto shrink-0">
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={loading || currentPage <= 1}
              />
            </PaginationItem>

            {pageNumbers.map((page) => {
              const isCurrent = page === currentPage
              const isAdjacent = Math.abs(page - currentPage) <= 1
              const isHiddenOnMobile = !isCurrent && !isAdjacent && pageNumbers.length > 3

              return (
                <PaginationItem
                  key={page}
                  className={isHiddenOnMobile ? "hidden sm:inline-block" : ""}
                >
                  <PaginationButton
                    isActive={isCurrent}
                    onClick={() => handlePageChange(page)}
                    disabled={loading}
                  >
                    {page}
                  </PaginationButton>
                </PaginationItem>
              )
            })}

            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={loading || currentPage >= totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
