"use client"

import { School } from "lucide-react"
import { useGsapEnter } from "@/lib/gsap/use-gsap-enter"
import { durations } from "@/lib/gsap/easings"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type AccountBootstrapScreenProps = {
  /** Covers profile fetch and post-login routing in one beat. */
  message?: string
  className?: string
}

/**
 * Shared account bootstrap UI — Clerk session + Django `/me/` + role routing.
 * GSAP fade/rise per ANIMATION_STANDARDS; shimmer bar instead of a spinner.
 */
export function AccountBootstrapScreen({
  message = "Loading your account…",
  className,
}: AccountBootstrapScreenProps) {
  const ref = useGsapEnter({ y: 14, duration: durations.enter })

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 text-center",
        className
      )}
    >
      <div ref={ref} data-gsap-enter className="flex flex-col items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <School className="size-6" aria-hidden />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{message}</p>
          <Skeleton className="mx-auto h-1.5 w-28 rounded-full" aria-hidden />
        </div>
      </div>
    </div>
  )
}
