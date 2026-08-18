"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { prefersReducedMotion } from "@/lib/gsap/reduced-motion"
import { easeOutSoft } from "@/lib/gsap/easings"

gsap.registerPlugin(useGSAP)

/**
 * Viewport-fixed thin progress bar that animates on client-side route changes.
 * Placed above the app shell so it appears over the sidebar and header.
 * Only active after the bootstrap overlay has unmounted (role is known).
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const barRef = React.useRef<HTMLDivElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const prevPathRef = React.useRef<string | null>(null)
  const completingRef = React.useRef(false)

  React.useEffect(() => {
    const bar = barRef.current
    const container = containerRef.current
    if (!bar || !container) return

    // Skip the very first paint — that's the bootstrap overlay's job
    if (prevPathRef.current === null) {
      prevPathRef.current = pathname
      return
    }

    if (prevPathRef.current === pathname) return
    prevPathRef.current = pathname
    completingRef.current = false

    if (prefersReducedMotion()) return

    // Show container
    gsap.set(container, { opacity: 1 })
    gsap.set(bar, { scaleX: 0, transformOrigin: "left center" })

    // Spring to ~80% quickly (fake indeterminate feel)
    gsap.to(bar, {
      scaleX: 0.8,
      duration: 0.4,
      ease: easeOutSoft,
      onComplete: () => {
        // Jump to 100% and fade out
        gsap.to(bar, {
          scaleX: 1,
          duration: 0.2,
          ease: "power1.out",
          onComplete: () => {
            gsap.to(container, {
              opacity: 0,
              duration: 0.3,
              delay: 0.05,
              ease: "power2.out",
            })
          },
        })
      },
    })
  }, [pathname])

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 top-0 z-[9998] h-[2px] opacity-0"
    >
      <div
        ref={barRef}
        className="h-full w-full origin-left bg-foreground"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  )
}
