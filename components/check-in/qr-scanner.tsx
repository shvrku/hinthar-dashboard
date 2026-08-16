"use client"

import * as React from "react"
import { Camera, Loader2, SwitchCamera } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CAMERA_STORAGE_KEY = "hinthar.checkin.cameraDeviceId"

export type QrScannerHandle = {
  resetScanLock: () => void
  lockScan: () => void
}

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

export const QrScanner = React.forwardRef<QrScannerHandle, { onScan: (token: string) => void }>(
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
  }
)
QrScanner.displayName = "QrScanner"
