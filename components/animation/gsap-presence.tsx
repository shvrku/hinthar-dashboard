"use client"

import * as React from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { durations, easeOutSnap } from "@/lib/gsap/easings"
import { prefersReducedMotion } from "@/lib/gsap/reduced-motion"
import { cn } from "@/lib/utils"

gsap.registerPlugin(useGSAP)

/**
 * Swap children with a short exit→enter tween when `activeKey` changes.
 * Instant swap when reduced motion is preferred.
 */
export function GsapPresence({
  activeKey,
  children,
  className,
  duration = durations.presence,
}: {
  activeKey: string | number
  children: React.ReactNode
  className?: string
  duration?: number
}) {
  const outerRef = React.useRef<HTMLDivElement | null>(null)
  const [renderKey, setRenderKey] = React.useState(activeKey)
  const [renderChildren, setRenderChildren] = React.useState(children)
  const pendingKey = React.useRef(activeKey)
  const pendingChildren = React.useRef(children)

  pendingKey.current = activeKey
  pendingChildren.current = children

  useGSAP(
    () => {
      const el = outerRef.current
      if (!el) return

      if (prefersReducedMotion()) {
        setRenderKey(pendingKey.current)
        setRenderChildren(pendingChildren.current)
        el.setAttribute("data-gsap-entered", "")
        gsap.set(el, { clearProps: "opacity,transform" })
        return
      }

      if (activeKey === renderKey) {
        gsap.fromTo(
          el,
          { opacity: 0, rotate: -20, scale: 0.85 },
          {
            opacity: 1,
            rotate: 0,
            scale: 1,
            duration,
            ease: easeOutSnap,
            clearProps: "transform",
            onComplete: () => {
              el.setAttribute("data-gsap-entered", "")
              gsap.set(el, { clearProps: "opacity" })
            },
          }
        )
        return
      }

      el.removeAttribute("data-gsap-entered")
      const tween = gsap.to(el, {
        opacity: 0,
        rotate: 20,
        scale: 0.85,
        duration,
        ease: easeOutSnap,
        onComplete: () => {
          setRenderKey(pendingKey.current)
          setRenderChildren(pendingChildren.current)
        },
      })

      return () => {
        tween.kill()
      }
    },
    { dependencies: [activeKey, renderKey, duration] }
  )

  React.useEffect(() => {
    if (activeKey === renderKey) {
      setRenderChildren(children)
    }
  }, [activeKey, renderKey, children])

  return (
    <div
      ref={outerRef}
      data-gsap-enter
      className={cn("inline-flex", className)}
    >
      {renderChildren}
    </div>
  )
}
