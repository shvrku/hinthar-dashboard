"use client"

import * as React from "react"

export function usePagination<T>(items: T[], initialPageSize = 10) {
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(initialPageSize)

  // Reset to page 1 if items change or page size changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [items.length, pageSize])

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  const safePage = Math.min(Math.max(1, currentPage), totalPages)

  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)

  const paginatedItems = React.useMemo(() => {
    return items.slice(startIndex, endIndex)
  }, [items, startIndex, endIndex])

  return {
    currentPage: safePage,
    pageSize,
    totalItems,
    totalPages,
    startIndex: totalItems > 0 ? startIndex + 1 : 0,
    endIndex,
    paginatedItems,
    setCurrentPage,
    setPageSize,
  }
}
