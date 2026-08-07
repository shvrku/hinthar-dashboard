"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * QR canvas with lazy `qrcode` import (PERF-M3).
 * Same visual as the previous inline helpers — first paint may wait one tick for the chunk.
 */
export function QrCanvas({
  value,
  size = 180,
  className,
}: {
  value: string
  size?: number
  className?: string
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    if (!canvasRef.current || !value) return
    let cancelled = false
    void import("qrcode").then(({ default: QRCode }) => {
      if (cancelled || !canvasRef.current) return
      QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 2 })
    })
    return () => {
      cancelled = true
    }
  }, [value, size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={cn("rounded-lg border bg-background", className)}
    />
  )
}
