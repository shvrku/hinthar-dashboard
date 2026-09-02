"use client"

import * as React from "react"

export function useInsetCenter() {
  const [centerX, setCenterX] = React.useState<number | null>(null)

  React.useLayoutEffect(() => {
    const inset = document.querySelector('[data-slot="sidebar-inset"]')
    if (!inset) return

    const update = () => {
      const rect = inset.getBoundingClientRect()
      setCenterX(rect.left + rect.width / 2)
    }

    update()
    window.addEventListener("resize", update)

    const observer = new ResizeObserver(update)
    observer.observe(inset)

    return () => {
      window.removeEventListener("resize", update)
      observer.disconnect()
    }
  }, [])

  return centerX
}
