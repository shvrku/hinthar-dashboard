"use client"

import * as React from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Database, SearchX } from "lucide-react"
import { TableBody, TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  durations,
  easeOutSoft,
  staggers,
  TABLE_ROW_STAGGER_CAP,
} from "@/lib/gsap/easings"
import { prefersReducedMotion } from "@/lib/gsap/reduced-motion"
import { useTableReveal } from "@/components/animation/table-reveal-context"

gsap.registerPlugin(useGSAP)

const DEFAULT_ROW_HEIGHT = 41
/** Default reserved body height in rows (loading / short pages). */
export const TABLE_RESERVE_ROWS = 8

type AnimatedTableBodyProps = {
  loading: boolean
  /**
   * Minimum reserved row slots for loading/empty height stability.
   * Prefer ~8–10, not full pageSize (avoids huge empty voids).
   */
  rowCount?: number
  /** How many skeleton rows are in `skeleton`. */
  skeletonRowCount?: number
  colSpan: number
  skeleton: React.ReactNode
  /**
   * True when the user has never loaded data yet (show idle placeholder
   * instead of a sparse empty row under the header divider).
   */
  idle?: boolean
  /** Idle copy — title + optional description. */
  idleTitle?: string
  idleDescription?: string
  /** After a load with zero rows. */
  emptyTitle?: string
  emptyDescription?: string
  children: React.ReactNode
  className?: string
  rowHeight?: number
  /** Keep data visible with a soft pulse while reloading. */
  hasData?: boolean
}

function FillerRows({
  count,
  colSpan,
  rowHeight,
}: {
  count: number
  colSpan: number
  rowHeight: number
}) {
  if (count <= 0) return null
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <TableRow
          key={`filler-${i}`}
          aria-hidden
          className="pointer-events-none border-0 hover:bg-transparent"
          style={{ height: rowHeight }}
        >
          <TableCell colSpan={colSpan} className="border-0 p-0" style={{ height: rowHeight }} />
        </TableRow>
      ))}
    </>
  )
}

function TableBodyPlaceholder({
  colSpan,
  minHeight,
  icon,
  title,
  description,
}: {
  colSpan: number
  minHeight: number
  icon: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <TableRow className="border-0 hover:bg-transparent">
      <TableCell colSpan={colSpan} className="border-0 p-0">
        <div
          className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center"
          style={{ minHeight }}
        >
          <div className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground">
            {icon}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{title}</p>
            {description ? (
              <p className="max-w-sm text-xs text-muted-foreground text-balance">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

function revealRows(
  rows: HTMLElement[],
  from: "start" | "end"
) {
  if (!rows.length) return

  if (prefersReducedMotion()) {
    gsap.set(rows, { clearProps: "opacity" })
    return
  }

  gsap.set(rows, { opacity: 0 })

  if (rows.length <= TABLE_ROW_STAGGER_CAP) {
    gsap.to(rows, {
      opacity: 1,
      duration: durations.row,
      ease: easeOutSoft,
      stagger: { each: staggers.row, from },
      onComplete: () => gsap.set(rows, { clearProps: "opacity" }),
    })
    return
  }

  // Cap: stagger a window of rows; fade the rest as one group.
  const staggered =
    from === "end"
      ? rows.slice(-TABLE_ROW_STAGGER_CAP)
      : rows.slice(0, TABLE_ROW_STAGGER_CAP)
  const rest =
    from === "end"
      ? rows.slice(0, -TABLE_ROW_STAGGER_CAP)
      : rows.slice(TABLE_ROW_STAGGER_CAP)

  const tl = gsap.timeline({
    onComplete: () => gsap.set(rows, { clearProps: "opacity" }),
  })

  if (rest.length) {
    tl.to(
      rest,
      { opacity: 1, duration: durations.row, ease: easeOutSoft },
      0
    )
  }

  tl.to(
    staggered,
    {
      opacity: 1,
      duration: durations.row,
      ease: easeOutSoft,
      stagger: { each: staggers.row, from },
    },
    0
  )
}

/**
 * Table body with layout-stable loading: reserves a modest min height,
 * shimmer skeletons while loading, then fade-in real rows (opacity only —
 * no Y translate, so the table container does not grow a scrollbar).
 */
export function AnimatedTableBody({
  loading,
  rowCount = TABLE_RESERVE_ROWS,
  skeletonRowCount,
  colSpan,
  skeleton,
  idle = false,
  idleTitle = "No data loaded yet",
  idleDescription = "Use Load Data in the toolbar to fetch this list.",
  emptyTitle = "No results found",
  emptyDescription,
  children,
  className,
  rowHeight = DEFAULT_ROW_HEIGHT,
  hasData = false,
}: AnimatedTableBodyProps) {
  const bodyRef = React.useRef<HTMLTableSectionElement | null>(null)
  const { from: revealFrom } = useTableReveal()
  const revealFromRef = React.useRef(revealFrom)
  revealFromRef.current = revealFrom
  const showSkeleton = loading && !hasData
  const childArray = React.Children.toArray(children).filter(Boolean)
  const isEmpty = !loading && childArray.length === 0
  const showIdle = isEmpty && idle
  const showEmpty = isEmpty && !idle
  const reserveRows = Math.max(1, Math.min(rowCount, 12))
  const skRows = skeletonRowCount ?? reserveRows
  const reserveHeight = reserveRows * rowHeight
  const childKeys = childArray
    .map((child) => (React.isValidElement(child) ? String(child.key ?? "") : ""))
    .join("|")
  const revealKey = showSkeleton
    ? "skeleton"
    : showIdle
      ? "idle"
      : showEmpty
        ? "empty"
        : `data-${childKeys || "0"}`

  useGSAP(
    () => {
      const body = bodyRef.current
      if (!body || showSkeleton || showIdle || showEmpty) return

      const rows = Array.from(
        body.querySelectorAll<HTMLElement>(":scope > tr:not([aria-hidden])")
      )
      revealRows(rows, revealFromRef.current)
    },
    { dependencies: [revealKey], revertOnUpdate: true }
  )

  useGSAP(
    () => {
      const body = bodyRef.current
      if (!body || !loading || !hasData) return
      if (prefersReducedMotion()) return

      const rows = body.querySelectorAll<HTMLElement>(
        ":scope > tr:not([aria-hidden])"
      )
      if (!rows.length) return
      gsap.to(rows, { opacity: 0.55, duration: 0.2, ease: "power1.inOut" })
      return () => {
        gsap.to(rows, {
          opacity: 1,
          duration: 0.25,
          ease: easeOutSoft,
          onComplete: () => gsap.set(rows, { clearProps: "opacity" }),
        })
      }
    },
    { dependencies: [loading, hasData], revertOnUpdate: true }
  )

  const contentRowCount = showSkeleton
    ? skRows
    : isEmpty
      ? reserveRows
      : childArray.length
  const fillerCount = Math.max(0, reserveRows - contentRowCount)

  return (
    <TableBody ref={bodyRef} className={cn(className)}>
      {showSkeleton ? (
        <>
          {skeleton}
          <FillerRows count={fillerCount} colSpan={colSpan} rowHeight={rowHeight} />
        </>
      ) : showIdle ? (
        <TableBodyPlaceholder
          colSpan={colSpan}
          minHeight={reserveHeight}
          icon={<Database className="size-5" />}
          title={idleTitle}
          description={idleDescription}
        />
      ) : showEmpty ? (
        <TableBodyPlaceholder
          colSpan={colSpan}
          minHeight={reserveHeight}
          icon={<SearchX className="size-5" />}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <>
          {children}
          <FillerRows count={fillerCount} colSpan={colSpan} rowHeight={rowHeight} />
        </>
      )}
    </TableBody>
  )
}
