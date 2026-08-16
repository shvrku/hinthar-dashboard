"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { useGsapEnter } from "@/lib/gsap/use-gsap-enter"
import { durations } from "@/lib/gsap/easings"
import { cn } from "@/lib/utils"

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isTerminal = pathname.includes("/check-in/terminal")
  // Always pass a fixed-length deps list. `@gsap/react` useGSAP calls an extra
  // useLayoutEffect when `dependencies.length > 0`; switching `[]` ↔ `[pathname]`
  // on terminal navigation throws React #310 (more/fewer hooks than last render).
  const ref = useGsapEnter<HTMLDivElement>(
    { y: 14, duration: durations.page },
    [pathname]
  )

  if (isTerminal) {
    return (
      <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden origin-top">
        {children}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      key={pathname}
      className={cn("flex min-h-full w-full flex-1 flex-col origin-top")}
      data-gsap-enter
    >
      {children}
    </div>
  )
}
