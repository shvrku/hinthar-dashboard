"use client"

import { useEffect, useState } from "react"

/**
 * Sync check for GSAP callbacks (client only).
 * Prefers the header toggle (`data-reduced-motion` / localStorage),
 * falling back to the OS `prefers-reduced-motion` media query.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false

  const attr = document.documentElement.getAttribute("data-reduced-motion")
  if (attr === "true") return true
  if (attr === "false") return false

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Reactive preference for components that need to re-render on change.
 * Watches the document attribute set by MotionPreferenceProvider.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const update = () => setReduced(prefersReducedMotion())
    update()

    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-reduced-motion"],
    })

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    mq.addEventListener("change", update)

    return () => {
      observer.disconnect()
      mq.removeEventListener("change", update)
    }
  }, [])

  return reduced
}
