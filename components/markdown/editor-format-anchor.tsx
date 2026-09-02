"use client"

import * as React from "react"

const FormatAnchorContext = React.createContext<HTMLElement | null>(null)

export function FormatAnchorProvider({
  anchor,
  children,
}: {
  anchor: HTMLElement | null
  children: React.ReactNode
}) {
  return <FormatAnchorContext.Provider value={anchor}>{children}</FormatAnchorContext.Provider>
}

export function useFormatAnchor() {
  return React.useContext(FormatAnchorContext)
}
