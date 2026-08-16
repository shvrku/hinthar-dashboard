"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { AlertTriangle, Check, X, Camera, Loader2, Search, SwitchCamera, User as UserIcon } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { CheckInLookup } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StandardPageHeader } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { GsapEnter } from "@/components/animation/gsap-enter"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type TerminalLookupCard =
  | {
      kind: "confirm"
      student: CheckInLookup
      pendingToken: string | null
    }
  | {
      kind: "deactivated"
      student: CheckInLookup | null
      message: string
    }

function parseBlockedLookupStudent(payload: unknown): CheckInLookup | null {
  if (!payload || typeof payload !== "object") return null
  const candidate = (payload as { student?: unknown }).student
  if (!candidate || typeof candidate !== "object") return null
  const s = candidate as Record<string, unknown>
  if (typeof s.id !== "number" || typeof s.name !== "string") return null
  return {
    id: s.id,
    name: s.name,
    unique_code: typeof s.unique_code === "string" ? s.unique_code : null,
    class_name: typeof s.class_name === "string" ? s.class_name : null,
    checked_in_today: Boolean(s.checked_in_today),
    method: s.method === "manual" ? "manual" : "qr",
  }
}

function Clock() {
  const [time, setTime] = React.useState(new Date())

  React.useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="text-center md:text-right">
      <div className="text-2xl font-bold tracking-tight tabular-nums">
        {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
      </div>
      <div className="text-xs text-muted-foreground">
        {time.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  )
}

const CAMERA_STORAGE_KEY = "hinthar.checkin.cameraDeviceId"

async function listVideoInputs(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return []
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((d) => d.kind === "videoinput" && d.deviceId)
}

function cameraLabel(device: MediaDeviceInfo, index: number): string {
  const label = device.label.trim()
  if (!label) return `Camera ${index + 1}`
  return label
}

const QrScanner = React.forwardRef<{ resetScanLock: () => void; lockScan: () => void }, { onScan: (token: string) => void }>(
  ({ onScan }, ref) => {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const onScanRef = React.useRef(onScan)
  const scanLockedRef = React.useRef(false)
  const lastDecodeAtRef = React.useRef(0)
  const [hydrated, setHydrated] = React.useState(false)
  const [deviceId, setDeviceId] = React.useState("")
  const [activeId, setActiveId] = React.useState("")
  const [cameras, setCameras] = React.useState<MediaDeviceInfo[]>([])
  const [active, setActive] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [aspect, setAspect] = React.useState(4 / 3)

  const syncAspect = React.useCallback(() => {
    const video = videoRef.current
    if (!video?.videoWidth || !video.videoHeight) return
    setAspect(video.videoWidth / video.videoHeight)
  }, [])

  React.useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  React.useImperativeHandle(ref, () => ({
    resetScanLock: () => { scanLockedRef.current = false },
    lockScan: () => { scanLockedRef.current = true },
  }), [])

  React.useEffect(() => {
    try {
      setDeviceId(localStorage.getItem(CAMERA_STORAGE_KEY) ?? "")
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  const persistDevice = React.useCallback((id: string) => {
    setDeviceId(id)
    try {
      localStorage.setItem(CAMERA_STORAGE_KEY, id)
    } catch {
      /* ignore */
    }
  }, [])

  React.useEffect(() => {
    if (!hydrated) return

    let stream: MediaStream | null = null
    let animationId: number | null = null
    let cancelled = false
    const DECODE_INTERVAL_MS = 125
    const MAX_DECODE_WIDTH = 320

    async function start() {
      try {
        const { default: jsQR } = await import("jsqr")
        if (cancelled) return

        const videoConstraint: MediaTrackConstraints = deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }

        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraint })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
          })
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        const listed = await listVideoInputs()
        if (!cancelled) {
          setCameras(listed)
          const liveId = stream.getVideoTracks()[0]?.getSettings().deviceId
          if (liveId) {
            setActiveId(liveId)
            try {
              localStorage.setItem(CAMERA_STORAGE_KEY, liveId)
            } catch {
              /* ignore */
            }
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          if (!cancelled) {
            const video = videoRef.current
            video.addEventListener("loadedmetadata", syncAspect)
            video.addEventListener("resize", syncAspect)
            syncAspect()
            setActive(true)
            setError(null)
            scan(jsQR)
          }
        }
      } catch {
        if (!cancelled) setError("Camera access denied or unavailable.")
      }
    }

    function scan(jsQR: typeof import("jsqr").default) {
      if (cancelled) return
      animationId = requestAnimationFrame(() => scan(jsQR))

      if (scanLockedRef.current || document.hidden) return
      const now = performance.now()
      if (now - lastDecodeAtRef.current < DECODE_INTERVAL_MS) return

      if (!videoRef.current || !canvasRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx || video.readyState < 2) return

      lastDecodeAtRef.current = now
      const scale = Math.min(1, MAX_DECODE_WIDTH / Math.max(video.videoWidth, 1))
      const w = Math.max(1, Math.floor(video.videoWidth * scale))
      const h = Math.max(1, Math.floor(video.videoHeight * scale))
      canvas.width = w
      canvas.height = h
      ctx.drawImage(video, 0, 0, w, h)
      const imageData = ctx.getImageData(0, 0, w, h)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      })
      if (code && !scanLockedRef.current) {
        scanLockedRef.current = true
        onScanRef.current(code.data)
      }
    }

    void start()

    const onDeviceChange = () => {
      void listVideoInputs().then((listed) => {
        if (!cancelled) setCameras(listed)
      })
    }
    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange)

    return () => {
      cancelled = true
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange)
      if (animationId) cancelAnimationFrame(animationId)
      if (stream) stream.getTracks().forEach((t) => t.stop())
      const video = videoRef.current
      if (video) {
        video.removeEventListener("loadedmetadata", syncAspect)
        video.removeEventListener("resize", syncAspect)
      }
      setActive(false)
    }
  }, [hydrated, deviceId, syncAspect])

  const slotRef = React.useRef<HTMLDivElement>(null)
  const [frame, setFrame] = React.useState({ width: 0, height: 0 })

  React.useLayoutEffect(() => {
    const slot = slotRef.current
    if (!slot) return
    const fit = () => {
      const cw = slot.clientWidth
      const ch = slot.clientHeight
      if (cw < 8 || ch < 8) return
      let width = cw
      let height = width / aspect
      if (height > ch) {
        height = ch
        width = height * aspect
      }
      setFrame({ width: Math.round(width), height: Math.round(height) })
    }
    const observer = new ResizeObserver(fit)
    observer.observe(slot)
    fit()
    return () => observer.disconnect()
  }, [aspect])

  const selectedId = deviceId || activeId || cameras[0]?.deviceId || ""
  const selectedCamera = cameras.find((cam) => cam.deviceId === selectedId)
  const selectedLabel = selectedCamera
    ? cameraLabel(selectedCamera, Math.max(0, cameras.indexOf(selectedCamera)))
    : "Choose camera"

  const frameClass =
    "relative overflow-hidden rounded-xl border border-border bg-black shadow-md"
  const frameStyle: React.CSSProperties =
    frame.width > 0
      ? { width: frame.width, height: frame.height }
      : { width: "100%", height: "100%", maxHeight: "100%" }

  const slot = (
    <div
      ref={slotRef}
      className="flex min-h-0 w-full flex-1 items-center justify-center"
    >
      <div
        className={
          error
            ? `${frameClass} flex items-center justify-center border-dashed bg-transparent`
            : frameClass
        }
        style={frameStyle}
      >
        {error ? (
          <div className="text-center text-sm text-muted-foreground">
            <Camera className="mx-auto mb-2 size-8" />
            <p>{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 size-full object-contain"
              playsInline
              muted
              autoPlay
            />
            <canvas ref={canvasRef} className="hidden" />
            {!active && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-950/90">
                <div className="flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/5">
                  <Camera className="size-7 text-white/70" />
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Loader2 className="size-3.5 animate-spin" />
                  Starting camera…
                </div>
              </div>
            )}
            {active ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className="rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.32)]"
                  style={{
                    width: Math.round(Math.min(frame.width || 0, frame.height || 0) * 0.88) || "88%",
                    height: Math.round(Math.min(frame.width || 0, frame.height || 0) * 0.88) || "88%",
                  }}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {slot}
      {!error && cameras.length > 1 ? (
        <div className="flex shrink-0 justify-center">
          <div className="flex w-56 items-center gap-2">
            <SwitchCamera className="size-4 shrink-0 text-muted-foreground" />
            <Select
              value={selectedId}
              onValueChange={(id) => {
                if (id) persistDevice(id)
              }}
            >
              <SelectTrigger size="sm" className="w-full min-w-0 bg-background">
                <SelectValue placeholder="Choose camera">
                  {(value: string | null) => {
                    const cam = cameras.find((c) => c.deviceId === value)
                    if (!cam) return selectedLabel
                    return cameraLabel(cam, Math.max(0, cameras.indexOf(cam)))
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {cameras.map((cam, i) => (
                  <SelectItem key={cam.deviceId || String(i)} value={cam.deviceId}>
                    {cameraLabel(cam, i)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
    </div>
  )
})
QrScanner.displayName = "QrScanner"

export default function TerminalPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const scannerRef = React.useRef<{ resetScanLock: () => void; lockScan: () => void }>(null)
  const [manualCode, setManualCode] = React.useState("")
  const [looking, setLooking] = React.useState(false)
  const [checkingIn, setCheckingIn] = React.useState(false)
  const [lookupCard, setLookupCard] = React.useState<TerminalLookupCard | null>(null)
  const [throttleUntil, setThrottleUntil] = React.useState<number | null>(null)
  const [throttleLeft, setThrottleLeft] = React.useState(0)

  React.useEffect(() => {
    if (!throttleUntil) {
      setThrottleLeft(0)
      return
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((throttleUntil - Date.now()) / 1000))
      setThrottleLeft(left)
      if (left <= 0) setThrottleUntil(null)
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [throttleUntil])

  const applyThrottle = React.useCallback((err: ApiError) => {
    const sec = Math.max(1, err.retryAfterSeconds ?? 5)
    setThrottleUntil(Date.now() + sec * 1000)
    toast.add({
      title: `Too many check-ins — try again in ${sec} second${sec === 1 ? "" : "s"}`,
      type: "warning",
    })
  }, [])

  const toastApiError = React.useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof ApiError && err.status === 429) {
        applyThrottle(err)
        return
      }
      const message =
        err instanceof ApiError
          ? err.userMessage
          : err instanceof Error
            ? err.message
            : fallback
      toast.add({ title: message, type: "error" })
    },
    [applyThrottle]
  )

  const resetPending = React.useCallback(() => {
    setLookupCard(null)
    scannerRef.current?.resetScanLock()
  }, [])

  const finishWithMessage = React.useCallback((message: string) => {
    toast.add({ title: message, type: "success" })
    setManualCode("")
    setLookupCard(null)
    scannerRef.current?.resetScanLock()
  }, [])

  // QR scanned → look up (no check-in yet) → show confirmation card.
  const handleScan = React.useCallback(
    async (checkInToken: string) => {
      if (!isSignedIn || looking || checkingIn || lookupCard) return
      if (throttleUntil && Date.now() < throttleUntil) {
        scannerRef.current?.resetScanLock()
        return
      }
      setLooking(true)
      try {
        const token = await getToken()
        if (!token) throw new Error("No auth token available")
        const match = await createApi(token).lookupCheckIn({ check_in_token: checkInToken })
        setLookupCard({
          kind: "confirm",
          student: match,
          pendingToken: checkInToken,
        })
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          const blockedStudent = parseBlockedLookupStudent(err.payload)
          setLookupCard({
            kind: "deactivated",
            student: blockedStudent,
            message: "QR token is deactivated. This student cannot check in until reactivated.",
          })
        } else {
          toastApiError(err, "Lookup failed")
          scannerRef.current?.resetScanLock()
        }
      } finally {
        setLooking(false)
      }
    },
    [isSignedIn, looking, checkingIn, lookupCard, throttleUntil, getToken, toastApiError]
  )

  // Manual code entered → look up by unique_code → show confirmation card.
  const handleManualLookup = React.useCallback(async () => {
    const code = manualCode.trim()
    if (!code) {
      toast.add({ title: "Enter a student code (e.g. HIS26-00001).", type: "error" })
      return
    }
    if (!isSignedIn || looking || checkingIn || lookupCard) return
    if (throttleUntil && Date.now() < throttleUntil) {
      toast.add({
        title: `Too many check-ins — try again in ${throttleLeft} second${throttleLeft === 1 ? "" : "s"}`,
        type: "warning",
      })
      return
    }
    setLooking(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const match = await createApi(token).lookupCheckIn({ unique_code: code })
      setLookupCard({
        kind: "confirm",
        student: match,
        pendingToken: null,
      })
      scannerRef.current?.lockScan()
    } catch (err) {
      toastApiError(err, "Lookup failed")
    } finally {
      setLooking(false)
    }
  }, [manualCode, isSignedIn, looking, checkingIn, lookupCard, throttleUntil, throttleLeft, getToken, toastApiError])

  // Staff confirmed → commit the check-in (QR by token, otherwise by student id).
  const handleConfirm = React.useCallback(
    async (confirmed: boolean) => {
      if (!lookupCard || lookupCard.kind !== "confirm") return
      if (!confirmed) {
        resetPending()
        return
      }
      if (lookupCard.student.checked_in_today) return
      setCheckingIn(true)
      try {
        const token = await getToken()
        if (!token) throw new Error("No auth token available")
        const api = createApi(token)
        const result = lookupCard.pendingToken
          ? await api.createCheckInByQr(lookupCard.pendingToken)
          : await api.createCheckInManual(lookupCard.student.id)
        const name = result.student_name || lookupCard.student.name || "Student"
        finishWithMessage(`${name} checked in successfully.`)
      } catch (err) {
        toastApiError(err, "Failed to check in")
        resetPending()
      } finally {
        setCheckingIn(false)
      }
    },
    [lookupCard, getToken, finishWithMessage, resetPending, toastApiError]
  )

  const statusLabel =
    throttleLeft > 0
      ? `Wait ${throttleLeft}s before the next scan`
      : looking
        ? "Looking up student…"
        : lookupCard
          ? "Confirm this student first"
          : "Point camera at a student QR code"

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
    <StaggerContainer className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <StaggerItem className="shrink-0">
        <StandardPageHeader
          title="Check-In Terminal"
          description="Scan a QR code or enter a student code. Scanned tags auto present all the classes for the rest of the day."
          className="mb-0 pb-3"
        >
          <Clock />
        </StandardPageHeader>
      </StaggerItem>

      <StaggerItem className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <h2 className="mb-2 shrink-0 text-lg font-semibold tracking-tight">Scan QR Code</h2>
            <QrScanner ref={scannerRef} onScan={(token) => void handleScan(token)} />
            <div className="mt-2 flex shrink-0 justify-center">
              <p
                role="status"
                aria-live="polite"
                className={cn(
                  "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium",
                  throttleLeft > 0
                    ? "border-warning/40 bg-warning/10 text-foreground"
                    : looking || lookupCard
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border bg-muted text-foreground"
                )}
              >
                {looking ? <Loader2 className="size-3.5 shrink-0 animate-spin" /> : null}
                <span className="truncate">{statusLabel}</span>
              </p>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto lg:w-96">
            <div>
              <h2 className="mb-2 text-lg font-semibold tracking-tight">Confirmation</h2>
              {lookupCard?.kind === "confirm" ? (
                  <GsapEnter
                    key={`${lookupCard.student.id}-${lookupCard.pendingToken ?? "manual"}`}
                    y={14}
                    className="rounded-xl border border-primary/30 bg-card p-6 shadow-md"
                  >
                    <div className="mb-6 flex items-center gap-4">
                      <div className="flex size-16 items-center justify-center rounded-full border bg-primary/10 border-primary/20">
                        <UserIcon className="size-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">
                          Code: {lookupCard.student.unique_code || `#${lookupCard.student.id}`}
                        </p>
                        <p className="text-xl font-bold tracking-tight text-foreground">
                          {lookupCard.student.name}
                        </p>
                        <p className="text-xs font-semibold text-primary mt-0.5">
                          {lookupCard.student.class_name || "No Class Assigned"}
                        </p>
                      </div>
                    </div>

                    {lookupCard.student.checked_in_today ? (
                      <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
                        Already checked in today.
                      </div>
                    ) : null}

                    <div className="mb-6 rounded-lg bg-muted/50 px-4 py-3 border border-border/50">
                      <p className="text-xs text-muted-foreground">Checking in via</p>
                      <p className="text-sm font-semibold text-foreground">
                        {lookupCard.pendingToken ? "QR scan" : "Manual code"}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => void handleConfirm(true)}
                        disabled={checkingIn || lookupCard.student.checked_in_today}
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
                  </GsapEnter>
                ) : lookupCard?.kind === "deactivated" ? (
                  <GsapEnter
                    key={`deactivated-${lookupCard.student?.id ?? "unknown"}`}
                    y={14}
                    className="rounded-xl border border-warning/35 bg-warning/10 p-6 shadow-md"
                  >
                    <div className="mb-4 flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
                      <div>
                        <p className="text-sm font-semibold text-warning">
                          QR check-in disabled
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lookupCard.message}
                        </p>
                      </div>
                    </div>

                    {lookupCard.student ? (
                      <div className="mb-5 rounded-lg border border-border/60 bg-background/40 p-3">
                        <p className="text-xs text-muted-foreground">
                          Code: {lookupCard.student.unique_code || `#${lookupCard.student.id}`}
                        </p>
                        <p className="text-base font-semibold">{lookupCard.student.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {lookupCard.student.class_name || "No Class Assigned"}
                        </p>
                      </div>
                    ) : null}

                    <Button variant="outline" className="w-full gap-2" onClick={resetPending}>
                      <X className="size-4" />
                      Scan Next
                    </Button>
                  </GsapEnter>
                ) : (
                  <GsapEnter
                    key="empty-match"
                    y={0}
                    className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center"
                  >
                    <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted/50">
                      <Search className="size-5 text-muted-foreground/60" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Ready to scan</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      Scan a QR code or enter a student code below
                    </p>
                  </GsapEnter>
                )}
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold tracking-tight">Manual lookup</h2>
              <div className="space-y-3 rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
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
                    disabled={looking || checkingIn || throttleLeft > 0 || !!lookupCard}
                  />
                  <Button
                    onClick={() => void handleManualLookup()}
                    variant="outline"
                    disabled={looking || checkingIn || throttleLeft > 0 || !!lookupCard}
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
