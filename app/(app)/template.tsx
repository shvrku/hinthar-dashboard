"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { useGsapEnter } from "@/lib/gsap/use-gsap-enter"
import { durations } from "@/lib/gsap/easings"
import { cn } from "@/lib/utils"

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isTerminal = pathname.includes("/check-in/terminal")
  const ref = useGsapEnter<HTMLDivElement>(
    { y: isTerminal ? 0 : 14, duration: durations.page },
    [pathname]
  )

  return (
    <div
      ref={ref}
      key={pathname}
      className={cn(
        "flex w-full flex-1 flex-col origin-top",
        isTerminal ? "h-full min-h-0 overflow-hidden" : "min-h-full"
      )}
      data-gsap-enter
    >
      {children}
    </div>
  )
}
