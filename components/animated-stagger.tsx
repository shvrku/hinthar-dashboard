"use client"

import * as React from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { durations, easeOutSoft, staggers } from "@/lib/gsap/easings"
import { prefersReducedMotion } from "@/lib/gsap/reduced-motion"
import { cn } from "@/lib/utils"

gsap.registerPlugin(useGSAP)

type StaggerApi = { claimIndex: () => number }

const StaggerContext = React.createContext<StaggerApi | null>(null)

/** True when nested inside a StaggerItem (child Cards should not double-animate). */
const NestedStaggerContext = React.createContext(false)

/**
 * Layout wrapper that enables staggered entrance for StaggerItems and Cards.
 * Index only resets when this container remounts (e.g. route change).
 */
export function StaggerContainer({
  children,
  className = "space-y-6",
}: {
  children: React.ReactNode
  className?: string
}) {
  const indexRef = React.useRef(0)
  const api = React.useRef<StaggerApi>({
    claimIndex: () => indexRef.current++,
  }).current

  return (
    <StaggerContext.Provider value={api}>
      <div className={className}>{children}</div>
    </StaggerContext.Provider>
  )
}

/** Shared GSAP entrance used by StaggerItem and auto-staggering Cards. */
export function useStaggerEntrance<T extends HTMLElement>(
  enabled = true
) {
  const api = React.useContext(StaggerContext)
  const nested = React.useContext(NestedStaggerContext)
  const ref = React.useRef<T | null>(null)
  const indexRef = React.useRef<number | null>(null)
  const shouldAnimate = Boolean(enabled && api && !nested)

  useGSAP(
    () => {
      const el = ref.current
      if (!shouldAnimate || !el || el.hasAttribute("data-stagger-shown")) return

      if (prefersReducedMotion()) {
        el.setAttribute("data-stagger-shown", "")
        gsap.set(el, { clearProps: "opacity,transform" })
        return
      }

      if (indexRef.current === null) {
        indexRef.current = api!.claimIndex()
      }

      const delay = 0.04 + indexRef.current * staggers.section

      gsap.fromTo(
        el,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: durations.reveal,
          ease: easeOutSoft,
          delay,
          clearProps: "transform",
          onComplete: () => {
            el.setAttribute("data-stagger-shown", "")
            gsap.set(el, { clearProps: "opacity" })
          },
        }
      )
    },
    { scope: ref, dependencies: [shouldAnimate] }
  )

  return { ref, active: shouldAnimate }
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  const { ref } = useStaggerEntrance<HTMLDivElement>(true)

  return (
    <NestedStaggerContext.Provider value={true}>
      <div ref={ref} data-stagger-item className={cn(className)}>
        {children}
      </div>
    </NestedStaggerContext.Provider>
  )
}
