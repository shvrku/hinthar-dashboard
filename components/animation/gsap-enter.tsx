"use client"

import { useGsapEnter } from "@/lib/gsap/use-gsap-enter"
import { durations } from "@/lib/gsap/easings"
import { cn } from "@/lib/utils"

/** Mount-enter wrapper (fade + slight rise). Remount via `key` to replay. */
export function GsapEnter({
  children,
  className,
  y = 10,
  duration = durations.presence,
}: {
  children: React.ReactNode
  className?: string
  y?: number
  duration?: number
}) {
  const ref = useGsapEnter<HTMLDivElement>({ y, duration })
  // No React opacity style — GSAP owns the enter tween; CSS can hide pre-show if needed
  return (
    <div ref={ref} className={cn(className)} data-gsap-enter>
      {children}
    </div>
  )
}
