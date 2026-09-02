"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { useInsetCenter } from "@/lib/use-inset-center"
import { cn } from "@/lib/utils"

const TOOLBAR_BOTTOM = "calc(1.5rem + env(safe-area-inset-bottom, 0px))"

export function EditorFloatingBar({
  optionsSlot,
  actions,
  className,
}: {
  optionsSlot?: React.ReactNode
  actions: React.ReactNode
  className?: string
}) {
  const [mounted, setMounted] = React.useState(false)
  const optionsScrollRef = React.useRef<HTMLDivElement>(null)
  const centerX = useInsetCenter()
  const dockStyle = centerX
    ? ({ left: centerX, transform: "translateX(-50%)" } as const)
    : ({ left: "50%", transform: "translateX(-50%)" } as const)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleOptionsWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const element = optionsScrollRef.current
    if (!element || element.scrollWidth <= element.clientWidth) return
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    element.scrollLeft += event.deltaY
    event.preventDefault()
  }

  if (!mounted) return null

  return createPortal(
    <div
      className={cn(
        "pointer-events-auto fixed z-50 w-[min(56rem,calc(100vw-1rem))] px-2",
        className
      )}
      style={{ ...dockStyle, bottom: TOOLBAR_BOTTOM }}
    >
      <div className="flex w-full min-w-0 items-center gap-1 overflow-hidden rounded-full border border-border/80 bg-background/95 py-1 pl-2 pr-1 shadow-lg backdrop-blur-md">
        {optionsSlot ? (
          <div
            ref={optionsScrollRef}
            onWheel={handleOptionsWheel}
            className="scroll-fade-x hinthar-scrollbar min-w-0 flex-1 touch-pan-x overflow-x-auto overscroll-x-contain"
          >
            <div className="flex w-max items-center gap-1 px-1 py-0.5">{optionsSlot}</div>
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}

        <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </div>
    </div>,
    document.body
  )
}
