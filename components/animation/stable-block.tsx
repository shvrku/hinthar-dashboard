"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Keeps a consistent footprint between loading and loaded states.
 * Pass `minHeight` (px or CSS) or let children define natural height —
 * once measured while loading, the min-height is locked until unlock.
 */
export function StableBlock({
  children,
  className,
  minHeight,
  lock = false,
}: {
  children: React.ReactNode
  className?: string
  /** Explicit reserved height (e.g. "320px" or 320). */
  minHeight?: number | string
  /** When true, measure current height and keep it as minHeight. */
  lock?: boolean
}) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [lockedMin, setLockedMin] = React.useState<number | undefined>(undefined)

  React.useLayoutEffect(() => {
    if (!lock || !ref.current) return
    const h = ref.current.getBoundingClientRect().height
    if (h > 0) setLockedMin(h)
  }, [lock, children])

  const style: React.CSSProperties | undefined =
    minHeight != null || lockedMin != null
      ? {
          minHeight:
            typeof minHeight === "number"
              ? minHeight
              : minHeight ?? lockedMin,
        }
      : lockedMin != null
        ? { minHeight: lockedMin }
        : undefined

  return (
    <div ref={ref} className={cn(className)} style={style}>
      {children}
    </div>
  )
}
