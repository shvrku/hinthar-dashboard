"use client"

import * as React from "react"

/** GSAP stagger `from` — start = top→bottom, end = bottom→top. */
export type TableRevealFrom = "start" | "end"

type TableRevealApi = {
  from: TableRevealFrom
  /** Call when the user interacts with the top pagination bar. */
  markTop: () => void
  /** Call when the user interacts with the bottom pagination bar. */
  markBottom: () => void
}

const TableRevealContext = React.createContext<TableRevealApi>({
  from: "start",
  markTop: () => {},
  markBottom: () => {},
})

export function TableRevealProvider({ children }: { children: React.ReactNode }) {
  const [from, setFrom] = React.useState<TableRevealFrom>("start")

  const value = React.useMemo<TableRevealApi>(
    () => ({
      from,
      markTop: () => setFrom("start"),
      markBottom: () => setFrom("end"),
    }),
    [from]
  )

  return (
    <TableRevealContext.Provider value={value}>
      {children}
    </TableRevealContext.Provider>
  )
}

export function useTableReveal() {
  return React.useContext(TableRevealContext)
}
