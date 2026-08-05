"use client"

import * as React from "react"

/**
 * Server-driven table pagination (DRF page / page_size / count).
 * Use with list*Page API helpers — do not slice a full client array.
 */
export function useServerPagination(initialPageSize = 50) {
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(initialPageSize)
  const [totalItems, setTotalItems] = React.useState(0)

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)

  React.useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endIndex = Math.min(safePage * pageSize, totalItems)

  const onPageSizeChange = React.useCallback((size: number) => {
    setPageSize(size)
    setPage(1)
  }, [])

  return {
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    setPage,
    setPageSize: onPageSizeChange,
    setTotalItems,
    /** Query params to pass to list*Page */
    params: { page: safePage, page_size: pageSize } as const,
  }
}
