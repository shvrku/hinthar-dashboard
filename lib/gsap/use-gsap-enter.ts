"use client"

import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { durations, easeOutSoft } from "@/lib/gsap/easings"
import { prefersReducedMotion } from "@/lib/gsap/reduced-motion"

gsap.registerPlugin(useGSAP)

/** Sentinel so useGSAP always sees a non-empty deps list (stable hook count). */
const MOUNT_DEPS: unknown[] = ["mount"]

type EnterVars = {
  y?: number
  opacity?: number
  scale?: number
  duration?: number
  delay?: number
  ease?: string
}

/**
 * One-shot mount enter animation on a ref element.
 * Re-runs when `deps` change (e.g. pathname).
 * Skips motion when `prefers-reduced-motion: reduce`.
 */
export function useGsapEnter<T extends HTMLElement>(
  vars: EnterVars = {},
  deps: unknown[] = []
) {
  const ref = useRef<T | null>(null)
  const {
    y = 12,
    opacity = 0,
    scale = 1,
    duration = durations.enter,
    delay = 0,
    ease = easeOutSoft,
  } = vars

  // Keep deps length stable across renders. `@gsap/react` conditionally adds a
  // second useLayoutEffect when `dependencies.length > 0` (deferCleanup path);
  // flipping empty ↔ non-empty between renders causes React error #310.
  const stableDeps = deps.length > 0 ? deps : MOUNT_DEPS

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return

      if (prefersReducedMotion()) {
        el.setAttribute("data-gsap-entered", "")
        gsap.set(el, { clearProps: "opacity,transform" })
        return
      }

      gsap.fromTo(
        el,
        { opacity, y, scale },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration,
          delay,
          ease,
          clearProps: "transform",
          onComplete: () => {
            el.setAttribute("data-gsap-entered", "")
            gsap.set(el, { clearProps: "opacity" })
          },
        }
      )
    },
    { dependencies: stableDeps, revertOnUpdate: true }
  )

  return ref
}
