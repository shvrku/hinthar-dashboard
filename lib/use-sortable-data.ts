import * as React from "react"

export type SortOrder = "asc" | "desc"

export interface SortConfig<T> {
  key: keyof T | string | null
  order: SortOrder
}

export function useSortableData<T>(
  items: T[] | null,
  initialKey: keyof T | string | null = null,
  initialOrder: SortOrder = "asc"
) {
  const [sortConfig, setSortConfig] = React.useState<SortConfig<T>>({
    key: initialKey,
    order: initialOrder,
  })

  const sortedItems = React.useMemo(() => {
    if (!items || !Array.isArray(items)) return []
    if (!sortConfig.key) return items

    const sorted = [...items]
    sorted.sort((a: any, b: any) => {
      let aVal = getNestedValue(a, sortConfig.key as string)
      let bVal = getNestedValue(b, sortConfig.key as string)

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      // Handle strings (case-insensitive)
      if (typeof aVal === "string" && typeof bVal === "string") {
        const comp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: "base" })
        return sortConfig.order === "asc" ? comp : -comp
      }

      // Handle numbers / dates / booleans
      if (aVal < bVal) return sortConfig.order === "asc" ? -1 : 1
      if (aVal > bVal) return sortConfig.order === "asc" ? 1 : -1
      return 0
    })

    return sorted
  }, [items, sortConfig])

  const requestSort = React.useCallback((key: keyof T | string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, order: prev.order === "asc" ? "desc" : "asc" }
      }
      return { key, order: "asc" }
    })
  }, [])

  return { items: sortedItems, requestSort, sortConfig }
}

function getNestedValue(obj: any, path: string): any {
  if (!obj) return null
  if (!path.includes(".")) return obj[path]
  const keys = path.split(".")
  let curr = obj
  for (const k of keys) {
    if (curr === null || curr === undefined) return null
    curr = curr[k]
  }
  return curr
}
