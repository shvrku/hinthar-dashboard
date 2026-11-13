"use client"

import * as React from "react"
import Image from "next/image"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { useAuth } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import { useCurrentUser } from "@/components/current-user-provider"
import { prefersReducedMotion } from "@/lib/gsap/reduced-motion"
import { easeOutSoft, easeOutSnap, durations } from "@/lib/gsap/easings"
import { cn } from "@/lib/utils"
import { sysLog } from "@/lib/sys-log"

gsap.registerPlugin(useGSAP)

// ─── Phase labels (keybind-revealed only) ──────────────────────────────────
type Phase = "session" | "profile" | "routing" | "done"
const PHASE_LABELS: Record<Phase, string> = {
  session: "Verifying Clerk session…",
  profile: "Fetching your profile…",
  routing: "Routing…",
  done: "Done",
}

const PHASE_BADGE_STYLES: Record<Phase, string> = {
  session: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  profile: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  routing: "border-warning/30 bg-warning/10 text-warning",
  done: "border-success/30 bg-success/10 text-success",
}

interface BootLogEntry {
  elapsedSec: string
  phase: Phase
  label: string
}

// ─── Indeterminate progress animation values per phase ─────────────────────
// We fake a smooth-feeling progress value — not real % — to give visual feedback
const PHASE_PROGRESS: Record<Phase, number> = {
  session: 20,
  profile: 60,
  routing: 88,
  done: 100,
}

// ─── How long before "taking longer" hint appears (ms) ────────────────────
const SLOW_THRESHOLD_MS = 8_000

// ─── Component ────────────────────────────────────────────────────────────
export function BootstrapOverlay() {
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth()
  const { role, loading: profileLoading } = useCurrentUser()
  const pathname = usePathname()

  // Phase tracking
  const [phase, setPhase] = React.useState<Phase>("session")
  // Whether the hidden Shift+D keybind has been pressed
  const [debugVisible, setDebugVisible] = React.useState(false)
  // Whether the slow-network hint is showing
  const [showSlow, setShowSlow] = React.useState(false)
  // Whether we have confirmed the destination route has committed
  // (overlay stays up through router.replace to cover the 1-frame flicker)
  const [routeCommitted, setRouteCommitted] = React.useState(false)
  // Controlled display — stays true until fade-out completes
  const [visible, setVisible] = React.useState(true)
  const overlayRef = React.useRef<HTMLDivElement>(null)
  const progressBarRef = React.useRef<HTMLDivElement>(null)
  const slowTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const startedAt = React.useRef(Date.now())
  const exitingRef = React.useRef(false)
  const [bootLog, setBootLog] = React.useState<BootLogEntry[]>(() => [
    { elapsedSec: "0.00s", phase: "session", label: PHASE_LABELS.session },
  ])
  const lastLoggedPhaseRef = React.useRef<Phase | null>(null)

  React.useEffect(() => {
    const active = visible && (isSignedIn || !clerkLoaded)
    sysLog.setBootstrapActive(active)
    return () => sysLog.setBootstrapActive(false)
  }, [visible, isSignedIn, clerkLoaded])

  React.useEffect(() => {
    if (lastLoggedPhaseRef.current === phase) return
    lastLoggedPhaseRef.current = phase
    const elapsedSec = `${((Date.now() - startedAt.current) / 1000).toFixed(2)}s`
    sysLog.add({
      level: "BOOT",
      title: `stage:${phase} (${PHASE_PROGRESS[phase]}%)`,
      detail: PHASE_LABELS[phase],
    })
    setBootLog((prev) => {
      if (prev.some((item) => item.phase === phase)) return prev
      return [...prev, { elapsedSec, phase, label: PHASE_LABELS[phase] }]
    })
  }, [phase])

  // ── Phase transitions ──────────────────────────────────────────────────
  React.useEffect(() => {
    if (!clerkLoaded) {
      setPhase("session")
      return
    }
    if (profileLoading) {
      setPhase("profile")
      return
    }
    if (!routeCommitted) {
      setPhase("routing")
      return
    }
    setPhase("done")
  }, [clerkLoaded, profileLoading, routeCommitted])

  // ── Start slow-network timer once profile loading begins ───────────────
  React.useEffect(() => {
    if (!profileLoading) return
    slowTimerRef.current = setTimeout(() => setShowSlow(true), SLOW_THRESHOLD_MS)
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
    }
  }, [profileLoading])

  // ── Once role is resolved, wait for pathname to change from "/" ────────
  // router.replace runs client-side; usePathname updates after commit
  const expectedNonDispatcher = role !== null && !profileLoading
  React.useEffect(() => {
    if (!expectedNonDispatcher) return
    // If we're already on a non-dispatcher route (e.g. back navigation), commit immediately
    if (pathname !== "/" && pathname !== "") {
      setRouteCommitted(true)
    }
    // else we wait; the next pathname change will trigger this effect again
  }, [expectedNonDispatcher, pathname])

  // ── Progress bar GSAP tween ────────────────────────────────────────────
  useGSAP(
    () => {
      const bar = progressBarRef.current
      if (!bar) return
      if (prefersReducedMotion()) {
        gsap.set(bar, { width: `${PHASE_PROGRESS[phase]}%` })
        return
      }
      gsap.to(bar, {
        width: `${PHASE_PROGRESS[phase]}%`,
        duration: phase === "done" ? 0.25 : 0.6,
        ease: easeOutSoft,
      })
    },
    { dependencies: [phase] }
  )

  // ── Entrance: icon layers stagger in ──────────────────────────────────
  const layer1Ref = React.useRef<SVGPathElement>(null)
  const layer2Ref = React.useRef<SVGPathElement>(null)
  const layer3Ref = React.useRef<SVGPathElement>(null)

  useGSAP(() => {
    if (prefersReducedMotion()) return
    const layers = [layer1Ref.current, layer2Ref.current, layer3Ref.current]
    gsap.fromTo(
      layers,
      { opacity: 0, y: 10 },
      {
        opacity: 1,
        y: 0,
        duration: durations.reveal,
        stagger: 0.12,
        ease: easeOutSoft,
        delay: 0.1,
      }
    )
  }, { dependencies: [] })

  // ── Exit: fade out once phase is "done" ───────────────────────────────
  React.useEffect(() => {
    if (phase !== "done" || exitingRef.current) return
    exitingRef.current = true
    const el = overlayRef.current
    if (!el) {
      setVisible(false)
      return
    }
    if (prefersReducedMotion()) {
      setVisible(false)
      return
    }
    gsap.to(el, {
      opacity: 0,
      duration: 0.35,
      ease: easeOutSnap,
      onComplete: () => setVisible(false),
    })
  }, [phase])

  // ── Hidden keybind: Shift+D ────────────────────────────────────────────
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "D" || e.key === "d")) {
        setDebugVisible((v) => !v)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  if (!visible) return null

  // Don't show on sign-in/up pages — auth.protect handles those
  if (!isSignedIn && clerkLoaded) return null

  return (
    <div
      ref={overlayRef}
      role="status"
      aria-live="polite"
      aria-busy={phase !== "done"}
      aria-label="Loading your account"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background gap-5"
    >
      {/* Brand icon — light mode uses icon.svg (black bg + white layers), dark uses transparent */}
      <div className="relative flex items-center justify-center">
        <svg
          width="90"
          height="90"
          viewBox="0 0 1024 1024"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          {/* Rounded background — rx tuned to match --radius-2xl at this render size */}
          <rect
            width="1024"
            height="1024"
            rx="240"
            className="fill-foreground dark:fill-transparent"
          />
          <g clipPath="url(#bootstrap-icon-clip)">
            <path
              ref={layer1Ref}
              d="M312.002 541.381L312.999 391.39C313.179 364.238 332.16 340.979 358.378 335.782L503.213 307.074C538.018 300.175 570.316 327.408 570.077 363.452L569.079 513.443C568.899 540.594 549.918 563.854 523.701 569.051L378.865 597.759C344.06 604.658 311.762 577.425 312.002 541.381Z"
              fill="white"
              fillOpacity="0.2"
              style={prefersReducedMotion() ? {} : { opacity: 0 }}
            />
            <path
              ref={layer2Ref}
              d="M382.963 601.193L383.959 451.202C384.14 424.051 403.121 400.791 429.339 395.594L574.175 366.886C608.98 359.987 641.277 387.22 641.037 423.264L640.041 573.256C639.861 600.407 620.878 623.667 594.661 628.863L449.826 657.572C415.021 664.471 382.723 637.237 382.963 601.193Z"
              fill="white"
              fillOpacity="0.5"
              style={prefersReducedMotion() ? {} : { opacity: 0 }}
            />
            <path
              ref={layer3Ref}
              d="M453.924 661.061L454.921 511.07C455.101 483.917 474.082 460.659 500.3 455.461L645.135 426.753C679.94 419.854 712.239 447.087 711.999 483.131L711.002 633.122C710.821 660.274 691.84 683.534 665.622 688.731L520.787 717.439C485.982 724.337 453.685 697.105 453.924 661.061Z"
              fill="white"
              fillOpacity="0.8"
              style={prefersReducedMotion() ? {} : { opacity: 0 }}
            />
          </g>
          <defs>
            <clipPath id="bootstrap-icon-clip">
              <rect width="400" height="412.5" fill="white" transform="translate(312 306)" />
            </clipPath>
          </defs>
        </svg>
      </div>

      {/* Progress bar — thin solid rectangle */}
      <div className="w-56 space-y-3">
        <div className="relative h-[3px] w-full overflow-hidden rounded-none bg-foreground/10">
          <div
            ref={progressBarRef}
            className="absolute left-0 top-0 h-full rounded-none bg-foreground/80 transition-none"
            style={{ width: `${PHASE_PROGRESS[phase]}%` }}
            aria-hidden
          />
        </div>

        {/* Slow-network hint */}
        {showSlow && phase !== "done" && (
          <div className="flex flex-col items-center gap-2 pt-1">
            <p className="text-xs text-muted-foreground">Taking longer than expected</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border hover:bg-accent transition-colors"
            >
              Reload
            </button>
          </div>
        )}
      </div>

      {/* Boot telemetry log — Shift+D to toggle */}
      {debugVisible && (
        <div
          className="fixed bottom-3 left-3 z-10 w-[min(21rem,calc(100vw-1.5rem))] rounded-sm border border-border bg-card/95 p-2.5 font-mono text-[10px] text-foreground shadow-2xl backdrop-blur-md"
          aria-live="off"
        >
          <div className="mb-1.5 flex items-center justify-between border-b border-border pb-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-1.5 bg-success" />
              <span className="font-bold tracking-wider text-foreground">BOOT LOG</span>
            </div>
            <span className="rounded-xs border border-border bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">
              SHIFT+D
            </span>
          </div>

          <div className="mb-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 border-b border-border/60 pb-1.5 text-[9px] text-muted-foreground">
            <div>
              STAGE: <span className="font-semibold text-foreground">{phase}</span>
            </div>
            <div className="text-right">
              PROGRESS: <span className="font-semibold text-foreground">{PHASE_PROGRESS[phase]}%</span>
            </div>
            <div>
              CLERK: <span className="text-foreground">{clerkLoaded ? (isSignedIn ? "signed-in" : "signed-out") : "loading"}</span>
            </div>
            <div className="text-right">
              ROLE: <span className="text-foreground">{role ?? (profileLoading ? "fetching" : "none")}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            {bootLog.map((entry) => (
              <div key={entry.phase} className="flex items-center gap-1.5 leading-tight">
                <span className="w-10 shrink-0 text-[9px] text-muted-foreground tabular-nums">
                  {entry.elapsedSec}
                </span>
                <span
                  className={cn(
                    "w-14 shrink-0 border px-1 py-0 text-center text-[8px] font-bold uppercase tracking-wider",
                    PHASE_BADGE_STYLES[entry.phase]
                  )}
                >
                  {entry.phase}
                </span>
                <span className="truncate text-[10px] text-foreground/90">{entry.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
