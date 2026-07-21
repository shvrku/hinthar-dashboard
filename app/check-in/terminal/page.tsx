"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { User, Check, X, Camera, Loader2, Search, Maximize2, Minimize2, Users } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { Student, Class, ClassStudent } from "@/lib/types"
import jsQR from "jsqr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function Clock() {
  const [time, setTime] = React.useState(new Date())

  React.useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="text-center md:text-right">
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
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-8">
        <div className="text-center text-sm text-muted-foreground">
          <Camera className="mx-auto mb-2 size-8" />
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex items-center justify-center">
      <video
        ref={videoRef}
        className="w-full max-w-md rounded-lg border"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />
      {!active && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}
      {/* Scan overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-48 rounded-xl border-2 border-foreground/60" />
      </div>
    </div>
  )
})
QrScanner.displayName = "QrScanner"

export default function TerminalPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [students, setStudents] = React.useState<Student[]>([])
  const [classes, setClasses] = React.useState<Class[]>([])
  const [classStudents, setClassStudents] = React.useState<ClassStudent[]>([])
  const [dataLoaded, setDataLoaded] = React.useState(false)
  const [isFocused, setIsFocused] = React.useState(false)

  const scannerRef = React.useRef<{ resetScanLock: () => void }>(null)
  const [scannedToken, setScannedToken] = React.useState<string | null>(null)
  const [matchedStudent, setMatchedStudent] = React.useState<Student | null>(null)
  const [manualId, setManualId] = React.useState("")
  const [checkingIn, setCheckingIn] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  // Toggle class on body
  React.useEffect(() => {
    if (isFocused) {
      document.body.classList.add("terminal-focus-mode")
    } else {
      document.body.classList.remove("terminal-focus-mode")
    }
    return () => {
      document.body.classList.remove("terminal-focus-mode")
    }
  }, [isFocused])

  // Load students, classes, and mappings for matching
  React.useEffect(() => {
    if (!isSignedIn || dataLoaded) return
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) return
        const api = createApi(token)
        const [studentsData, classesData, classStudentsData] = await Promise.all([
          api.listStudents(),
          api.listClasses(),
          api.listClassStudents(),
        ])
        setStudents(studentsData)
        setClasses(classesData)
        setClassStudents(classStudentsData)
        setDataLoaded(true)
      } catch (err) {
        console.error("Failed to load terminal initialization data", err)
      }
    })()
  }, [isSignedIn, getToken, dataLoaded])

  const getStudentClassName = React.useCallback((studentId: number) => {
    const mapping = classStudents.find((cs) => {
      const sId = typeof cs.student === "object" ? cs.student.id : cs.student
      return sId === studentId
    })
    if (!mapping) return "No Class Assigned"

    let classObj: Class | undefined
    if (typeof mapping.class_obj === "object") {
      classObj = mapping.class_obj
    } else {
      classObj = classes.find((c) => c.id === mapping.class_obj)
    }

    if (!classObj) return "No Class Assigned"
    return `${classObj.education_level} - ${classObj.cohort_identifier} ${classObj.cohort_sub_category ? `(${classObj.cohort_sub_category})` : ""}`.trim()
  }, [classes, classStudents])

  const handleScan = React.useCallback((token: string) => {
    setScannedToken(token)
    setError(null)
    setSuccess(null)
    const match = students.find((s) => s.check_in_token === token)
    setMatchedStudent(match ?? null)
    if (!match) {
      setError(`No student found with this check-in token.`)
    }
  }, [students])

  const handleManualLookup = React.useCallback(() => {
    const id = parseInt(manualId, 10)
    if (isNaN(id)) {
      setError("Please enter a valid student ID.")
      return
    }
    setError(null)
    setSuccess(null)
    setScannedToken(null)
    const match = students.find((s) => s.id === id)
    setMatchedStudent(match ?? null)
    if (!match) {
      setError(`No student found with ID ${id}.`)
    }
    scannerRef.current?.resetScanLock()
  }, [manualId, students])

  const handleConfirm = React.useCallback(async (confirmed: boolean) => {
    if (!matchedStudent || !isSignedIn) return

    if (!confirmed) {
      setMatchedStudent(null)
      setScannedToken(null)
      setManualId("")
      scannerRef.current?.resetScanLock()
      return
    }

    setCheckingIn(true)
    setError(null)
    setSuccess(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      if (scannedToken) {
        await api.createCheckInByQr(scannedToken)
      } else {
        await api.createCheckInManual(matchedStudent.id)
      }
      setSuccess(`${matchedStudent.name} checked in successfully.`)
      setMatchedStudent(null)
      setScannedToken(null)
      setManualId("")
      scannerRef.current?.resetScanLock()
      setTimeout(() => setSuccess(null), 4000)
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to check in")
      scannerRef.current?.resetScanLock()
    } finally {
      setCheckingIn(false)
    }
  }, [matchedStudent, isSignedIn, getToken, scannedToken])

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
    <div className={`container mx-auto px-4 py-8 max-w-7xl transition-all duration-300 ${isFocused ? "min-h-[90vh] flex flex-col justify-center" : ""}`}>
      {/* Header with Title, Clock and Focus button */}
      <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Users className="h-5 w-5 text-primary" />
          </div>
        </div>

        <Clock />

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFocused((f) => !f)}
            className="shadow-xs gap-2"
          >
            {isFocused ? (
              <>
                <Minimize2 className="size-4" />
                Exit Focus Mode
              </>
            ) : (
              <>
                <Maximize2 className="size-4" />
                Focus Mode
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <span>{error}</span>
          <button onClick={() => { setError(null); scannerRef.current?.resetScanLock() }} className="ml-2 text-red-500 hover:text-red-700">
            <X className="size-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          {success}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left: QR Scanner */}
        <div className="min-w-0 flex-1">
          <h2 className="mb-4 text-lg font-semibold">Scan QR Code</h2>
          <QrScanner ref={scannerRef} onScan={handleScan} />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Point the camera at a student&apos;s QR code to scan
          </p>
        </div>

        {/* Right: Confirmation */}
        <div className="w-full lg:w-96">
          <h2 className="mb-4 text-lg font-semibold">Confirmation</h2>

          {matchedStudent ? (
            <div className="rounded-lg border p-6">
              {/* Student icon + info */}
              <div className="mb-6 flex items-center gap-4">
                <div className="flex size-16 items-center justify-center rounded-full border bg-primary/5 border-primary/10">
                  <User className="size-8 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">ID: {matchedStudent.id}</p>
                  <p className="text-xl font-bold tracking-tight text-foreground">{matchedStudent.name}</p>
                  <p className="text-xs font-semibold text-primary mt-0.5">
                    {getStudentClassName(matchedStudent.id)}
                  </p>
                </div>
              </div>

              {/* Check-in time */}
              <div className="mb-6 rounded-lg bg-muted/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">Checking in at</p>
                <p className="text-lg font-semibold tabular-nums">
                  {new Date().toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  })}
                </p>
              </div>

              {/* Confirm / Reject */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleConfirm(true)}
                  disabled={checkingIn}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  {checkingIn ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Yes
                </button>
                <button
                  onClick={() => handleConfirm(false)}
                  disabled={checkingIn}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <X className="size-4" />
                  No
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
              <p className="text-center text-sm text-muted-foreground">
                Scan a QR code or enter<br />a student ID manually
              </p>
            </div>
          )}

          {/* Manual entry */}
          <div className="mt-6 rounded-xl border border-neutral-800 bg-[#0a0a0a] p-5 shadow-xs text-white">
            <h3 className="mb-1 text-sm font-semibold text-neutral-200">
              Manual Lookup
            </h3>
            <p className="mb-4 text-xs text-neutral-400">
              Not Recognized? Search by typing in the student ID manually
            </p>
            <div className="flex gap-2">
              <Input
                type="number"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleManualLookup() }}
                placeholder="Student ID (e.g. 101)"
                className="min-w-0 flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-neutral-850 bg-neutral-950 text-white placeholder:text-neutral-500 focus-visible:ring-neutral-800"
              />
              <Button
                onClick={handleManualLookup}
                variant="outline"
                className="shadow-xs gap-1.5 border-neutral-800 text-white hover:bg-neutral-900 hover:text-white"
              >
                <Search className="size-4" />
                Look Up
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
