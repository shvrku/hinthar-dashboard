"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { useGsapEnter } from "@/lib/gsap/use-gsap-enter"
import { durations } from "@/lib/gsap/easings"

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const ref = useGsapEnter<HTMLDivElement>(
    { y: 14, duration: durations.page },
    [pathname]
  )

  return (
    <div
      ref={ref}
      key={pathname}
      className="w-full flex-1 flex flex-col min-h-full origin-top"
      data-gsap-enter
    >
      {children}
    </div>
  )
}
