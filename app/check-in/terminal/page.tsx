"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { motion, AnimatePresence } from "motion/react"
import { Check, X, Camera, Loader2, Search, User as UserIcon } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { CheckInLookup } from "@/lib/types"
import jsQR from "jsqr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StandardPageHeader } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"

function Clock() {
  const [time, setTime] = React.useState(new Date())

  React.useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="text-center md:text-left">
      <div className="text-3xl font-bold tracking-tight tabular-nums">
        {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
      </div>
      <div className="text-sm text-muted-foreground">
        {time.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  )
}

const QrScanner = React.forwardRef<{ resetScanLock: () => void }, { onScan: (token: string) => void }>(
  ({ onScan }, ref) => {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const onScanRef = React.useRef(onScan)
  const scanLockedRef = React.useRef(false)
  const [active, setActive] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Keep ref in sync so the effect never needs to re-run
  React.useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  // Expose resetScanLock for parent to call after confirm/reject
  React.useImperativeHandle(ref, () => ({
    resetScanLock: () => { scanLockedRef.current = false }
  }), [])

  React.useEffect(() => {
    let stream: MediaStream | null = null
    let animationId: number | null = null

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: 640, height: 480 },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setActive(true)
          scan()
        }
      } catch {
        setError("Camera access denied or unavailable.")
      }
    }

    function scan() {
      if (!videoRef.current || !canvasRef.current) {
        animationId = requestAnimationFrame(scan)
        return
      }
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx || video.readyState < 2) {
        animationId = requestAnimationFrame(scan)
        return
      }
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      })
      if (code && !scanLockedRef.current) {
        scanLockedRef.current = true
        onScanRef.current(code.data)
      }
      animationId = requestAnimationFrame(scan)
    }

    start()

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
  }, []) // empty deps — camera starts once, never restarts

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed p-8">
        <div className="text-center text-sm text-muted-foreground">
          <Camera className="mx-auto mb-2 size-8" />
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-xl">
      <video
        ref={videoRef}
        className="w-full max-w-md rounded-xl border border-border shadow-md"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />
      {!active && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-xs">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}
      {/* Clean QR Target Box */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-52 rounded-2xl border-2 border-foreground/60" />
      </div>
    </div>
  )
})
QrScanner.displayName = "QrScanner"

export default function TerminalPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const scannerRef = React.useRef<{ resetScanLock: () => void }>(null)
  const [manualCode, setManualCode] = React.useState("")
  const [looking, setLooking] = React.useState(false)
  const [checkingIn, setCheckingIn] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  // Student awaiting staff confirmation. pendingToken is the scanned QR (kept only
  // for the single student being confirmed — never the whole roster).
  const [pending, setPending] = React.useState<CheckInLookup | null>(null)
  const [pendingToken, setPendingToken] = React.useState<string | null>(null)

  const resetPending = React.useCallback(() => {
    setPending(null)
    setPendingToken(null)
    scannerRef.current?.resetScanLock()
  }, [])

  const finishWithMessage = React.useCallback((message: string) => {
    setSuccess(message)
    setError(null)
    setManualCode("")
    setPending(null)
    setPendingToken(null)
    scannerRef.current?.resetScanLock()
    setTimeout(() => setSuccess(null), 4000)
  }, [])

  // QR scanned → look up (no check-in yet) → show confirmation card.
  const handleScan = React.useCallback(
    async (checkInToken: string) => {
      if (!isSignedIn || looking || checkingIn || pending) return
      setLooking(true)
      setError(null)
      setSuccess(null)
      try {
        const token = await getToken()
        if (!token) throw new Error("No auth token available")
        const match = await createApi(token).lookupCheckIn({ check_in_token: checkInToken })
        setPending(match)
        setPendingToken(checkInToken)
      } catch (err) {
        if (err instanceof ApiError) setError(err.userMessage)
        else setError(err instanceof Error ? err.message : "Lookup failed")
        scannerRef.current?.resetScanLock()
      } finally {
        setLooking(false)
      }
    },
    [isSignedIn, looking, checkingIn, pending, getToken]
  )

  // Manual code entered → look up by unique_code → show confirmation card.
  const handleManualLookup = React.useCallback(async () => {
    const code = manualCode.trim()
    if (!code) {
      setError("Enter a student code (e.g. HIS26-00001).")
      return
    }
    if (!isSignedIn || looking || checkingIn) return
    setLooking(true)
    setError(null)
    setSuccess(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const match = await createApi(token).lookupCheckIn({ unique_code: code })
      setPending(match)
      setPendingToken(null)
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Lookup failed")
    } finally {
      setLooking(false)
    }
  }, [manualCode, isSignedIn, looking, checkingIn, getToken])

  // Staff confirmed → commit the check-in (QR by token, otherwise by student id).
  const handleConfirm = React.useCallback(
    async (confirmed: boolean) => {
      if (!pending) return
      if (!confirmed) {
        resetPending()
        return
      }
      setCheckingIn(true)
      setError(null)
      setSuccess(null)
      try {
        const token = await getToken()
        if (!token) throw new Error("No auth token available")
        const api = createApi(token)
        const result = pendingToken
          ? await api.createCheckInByQr(pendingToken)
          : await api.createCheckInManual(pending.id)
        const name = result.student_name || pending.name || "Student"
        finishWithMessage(`${name} checked in successfully.`)
      } catch (err) {
        if (err instanceof ApiError) setError(err.userMessage)
        else setError(err instanceof Error ? err.message : "Failed to check in")
        resetPending()
      } finally {
        setCheckingIn(false)
      }
    },
    [pending, pendingToken, getToken, finishWithMessage, resetPending]
  )

  if (!isLoaded) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">Please sign in to use the check-in terminal.</p>
      </div>
    )
  }

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <StandardPageHeader
          title="Check-In Terminal"
          description="Scan a QR code or enter a student code, confirm the student, then check them in. Lookups are validated on the server"
        >
          <Clock />
        </StandardPageHeader>
      </StaggerItem>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="mb-4 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <span>{error}</span>
            <button
              onClick={() => {
                setError(null)
                scannerRef.current?.resetScanLock()
              }}
              className="ml-2 text-destructive hover:opacity-80 transition-opacity"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400"
          >
            <Check className="size-5 text-emerald-500 shrink-0" />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <StaggerItem>
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="min-w-0 flex-1">
            <h2 className="mb-4 text-lg font-semibold tracking-tight">Scan QR Code</h2>
            <QrScanner ref={scannerRef} onScan={(token) => void handleScan(token)} />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {looking
                ? "Looking up student…"
                : pending
                  ? "Confirm the student on the right"
                  : "Point camera at a student QR code"}
            </p>
          </div>

          <div className="w-full lg:w-96 space-y-6">
            <div>
              <h2 className="mb-4 text-lg font-semibold tracking-tight">Confirmation</h2>
              <AnimatePresence mode="wait">
                {pending ? (
                  <motion.div
                    key={`${pending.id}-${pendingToken ?? "manual"}`}
                    initial={{ opacity: 0, scale: 0.93, y: 14 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.93, y: -10 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-xl border border-primary/30 bg-card p-6 shadow-md"
                  >
                    <div className="mb-6 flex items-center gap-4">
                      <div className="flex size-16 items-center justify-center rounded-full border bg-primary/10 border-primary/20">
                        <UserIcon className="size-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">
                          Code: {pending.unique_code || `#${pending.id}`}
                        </p>
                        <p className="text-xl font-bold tracking-tight text-foreground">
                          {pending.name}
                        </p>
                        <p className="text-xs font-semibold text-primary mt-0.5">
                          {pending.class_name || "No Class Assigned"}
                        </p>
                      </div>
                    </div>

                    {pending.checked_in_today ? (
                      <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                        Already checked in today — confirming again will be rejected.
                      </div>
                    ) : null}

                    <div className="mb-6 rounded-lg bg-muted/50 px-4 py-3 border border-border/50">
                      <p className="text-xs text-muted-foreground">Checking in via</p>
                      <p className="text-sm font-semibold text-foreground">
                        {pendingToken ? "QR scan" : "Manual code"}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => void handleConfirm(true)}
                        disabled={checkingIn}
                        className="flex-1 gap-2"
                      >
                        {checkingIn ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        Confirm
                      </Button>
                      <Button
                        onClick={() => void handleConfirm(false)}
                        disabled={checkingIn}
                        variant="outline"
                        className="flex-1 gap-2"
                      >
                        <X className="size-4" />
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty-match"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center"
                  >
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/50 mb-3">
                      <Search className="size-5 text-muted-foreground/60" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Ready to scan</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Scan a QR code or enter a student code below
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-semibold tracking-tight">Manual lookup</h2>
              <div className="rounded-xl border border-border/80 bg-card p-6 shadow-2xs space-y-3">
                <p className="text-xs text-muted-foreground">
                  Enter the student code printed on their card (e.g. HIS26-00001).
                </p>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleManualLookup()
                    }}
                    placeholder="Student Code (e.g. HIS26-00001)"
                    className="min-w-0 flex-1 bg-background"
                    disabled={looking || checkingIn}
                  />
                  <Button
                    onClick={() => void handleManualLookup()}
                    variant="outline"
                    disabled={looking || checkingIn}
                    className="shadow-xs gap-1.5"
                  >
                    {looking ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                    Look Up
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </StaggerItem>
    </StaggerContainer>
  )
}
