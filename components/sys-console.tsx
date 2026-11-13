"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Copy, Check, Trash2, X, Maximize2, Minimize2, Pause, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { sysLog, type SysLogLevel, type SysLogSnapshot } from "@/lib/sys-log"

const SERVER_SNAPSHOT: SysLogSnapshot = {
  entries: [],
  inFlight: 0,
  bootstrapActive: false,
}

const LEVEL_STYLES: Record<SysLogLevel, string> = {
  API: "border-success/30 bg-success/10 text-success",
  QUERY: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  LOAD: "border-warning/30 bg-warning/10 text-warning",
  AUTH: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  ROUTE: "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  BOOT: "border-border bg-muted/60 text-foreground",
  ERR: "border-destructive/30 bg-destructive/10 text-destructive",
}

const ALL_LEVELS: SysLogLevel[] = ["API", "QUERY", "LOAD", "AUTH", "ROUTE", "BOOT", "ERR"]

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if (target.isContentEditable) return true
  return Boolean(target.closest("[contenteditable='true']"))
}

function formatClock(timestamp: number): string {
  const d = new Date(timestamp)
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  const ss = String(d.getSeconds()).padStart(2, "0")
  const ms = String(d.getMilliseconds()).padStart(3, "0")
  return `${hh}:${mm}:${ss}.${ms}`
}

function statusColor(status?: number): string {
  if (status === undefined) return "text-muted-foreground"
  if (status === 0 || status >= 500) return "text-destructive"
  if (status >= 400) return "text-warning"
  if (status >= 200 && status < 300) return "text-success"
  return "text-muted-foreground"
}

export function SysConsole() {
  const pathname = usePathname()
  const snapshot = React.useSyncExternalStore(
    sysLog.subscribe,
    sysLog.getSnapshot,
    () => SERVER_SNAPSHOT
  )

  const [open, setOpen] = React.useState(false)
  const [filter, setFilter] = React.useState<SysLogLevel | "ALL">("ALL")
  const [expanded, setExpanded] = React.useState(false)
  const [autoScroll, setAutoScroll] = React.useState(true)
  const [copied, setCopied] = React.useState(false)
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null)
  const [size, setSize] = React.useState<{ width: number; height: number } | null>(null)

  const listRef = React.useRef<HTMLDivElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const dragRef = React.useRef<{
    startX: number
    startY: number
    origX: number
    origY: number
  } | null>(null)
  const resizeRef = React.useRef<{
    startX: number
    startY: number
    origW: number
    origH: number
    left: number
    top: number
  } | null>(null)
  const lastPathRef = React.useRef<string | null>(null)

  // Track route transitions
  React.useEffect(() => {
    if (!pathname) return
    if (lastPathRef.current === pathname) return
    const prev = lastPathRef.current
    lastPathRef.current = pathname
    sysLog.add({
      level: "ROUTE",
      title: prev ? `${prev} → ${pathname}` : `mounted ${pathname}`,
    })
  }, [pathname])

  // Track uncaught runtime errors & unhandled promise rejections
  React.useEffect(() => {
    const onError = (e: ErrorEvent) => {
      sysLog.add({
        level: "ERR",
        title: "window.error",
        detail: e.message || "Uncaught error",
      })
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason instanceof Error ? e.reason.message : String(e.reason ?? "Unhandled rejection")
      sysLog.add({
        level: "ERR",
        title: "unhandledrejection",
        detail: reason,
      })
    }
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])

  // Global Shift+D keybind (disabled while BootstrapOverlay is active or typing in an input)
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (snapshot.bootstrapActive) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (!e.shiftKey || (e.key !== "D" && e.key !== "d")) return
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      setOpen((prev) => !prev)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [snapshot.bootstrapActive])

  // Auto-scroll to latest entry
  React.useEffect(() => {
    if (!open || !autoScroll || !listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [open, autoScroll, snapshot.entries.length, filter])

  // Drag & resize handlers for always-on-top window behavior
  React.useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const panel = panelRef.current
      if (!panel) return

      const drag = dragRef.current
      if (drag) {
        const dx = e.clientX - drag.startX
        const dy = e.clientY - drag.startY
        const maxX = Math.max(8, window.innerWidth - panel.offsetWidth - 8)
        const maxY = Math.max(8, window.innerHeight - panel.offsetHeight - 8)
        setPos({
          x: Math.min(maxX, Math.max(8, drag.origX + dx)),
          y: Math.min(maxY, Math.max(8, drag.origY + dy)),
        })
        return
      }

      const resize = resizeRef.current
      if (resize) {
        const dx = e.clientX - resize.startX
        const dy = e.clientY - resize.startY
        const maxW = Math.max(300, window.innerWidth - resize.left - 8)
        const maxH = Math.max(180, window.innerHeight - resize.top - 8)
        setSize({
          width: Math.min(maxW, Math.max(300, resize.origW + dx)),
          height: Math.min(maxH, Math.max(180, resize.origH + dy)),
        })
      }
    }
    const onPointerUp = () => {
      dragRef.current = null
      resizeRef.current = null
    }
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }
  }, [])

  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
    }
  }

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    // Pin top-left so resizing from bottom-right behaves like a native window
    setPos({ x: rect.left, y: rect.top })
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: rect.width,
      origH: rect.height,
      left: rect.left,
      top: rect.top,
    }
  }

  const filtered = React.useMemo(() => {
    if (filter === "ALL") return snapshot.entries
    return snapshot.entries.filter((entry) => entry.level === filter)
  }, [snapshot.entries, filter])

  const counts = React.useMemo(() => {
    const map: Record<SysLogLevel, number> = {
      API: 0,
      QUERY: 0,
      LOAD: 0,
      AUTH: 0,
      ROUTE: 0,
      BOOT: 0,
      ERR: 0,
    }
    for (const entry of snapshot.entries) {
      map[entry.level] += 1
    }
    return map
  }, [snapshot.entries])

  const handleCopy = async () => {
    const text = filtered
      .map((e) => {
        const statusPart = e.status !== undefined ? ` [${e.status}]` : ""
        const durPart = e.durationMs !== undefined ? ` (${e.durationMs}ms)` : ""
        const detailPart = e.detail ? ` — ${e.detail}` : ""
        return `${formatClock(e.timestamp)} [${e.level}] ${e.title}${statusPart}${durPart}${detailPart}`
      })
      .join("\n")
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard may be blocked in non-HTTPS contexts
    }
  }

  if (!open || snapshot.bootstrapActive) return null

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="System background console"
      style={{
        ...(pos
          ? { left: `${pos.x}px`, top: `${pos.y}px` }
          : { left: "12px", bottom: "12px" }),
        ...(size
          ? { width: `${size.width}px`, height: `${size.height}px` }
          : {}),
      }}
      className={cn(
        "fixed z-[10000] flex flex-col overflow-hidden rounded-sm border border-border bg-card/95 font-mono text-[10px] text-foreground shadow-2xl backdrop-blur-md",
        !size &&
          (expanded
            ? "h-[min(28rem,calc(100vh-1.5rem))] w-[min(38rem,calc(100vw-1.5rem))]"
            : "h-[min(16.5rem,calc(100vh-1.5rem))] w-[min(27.5rem,calc(100vw-1.5rem))]")
      )}
    >
      {/* Draggable Title Bar */}
      <div
        onPointerDown={handleDragStart}
        className="flex cursor-move select-none items-center justify-between gap-2 border-b border-border bg-muted/50 px-2.5 py-1.5"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              "inline-block size-1.5 shrink-0",
              snapshot.inFlight > 0 ? "animate-pulse bg-warning" : "bg-success"
            )}
          />
          <span className="truncate text-[10px] font-bold tracking-wider text-foreground">
            SYS // CONSOLE
          </span>
          {snapshot.inFlight > 0 && (
            <span className="shrink-0 border border-warning/40 bg-warning/15 px-1 py-0 text-[9px] font-bold text-warning">
              ACTIVE: {snapshot.inFlight}
            </span>
          )}
          <span className="hidden truncate text-[9px] text-muted-foreground sm:inline">
            {pathname}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <span className="mr-1 rounded-xs border border-border bg-background px-1 py-0 text-[9px] text-muted-foreground">
            SHIFT+D
          </span>
          <button
            type="button"
            onClick={() => setAutoScroll((v) => !v)}
            title={autoScroll ? "Pause auto-scroll" : "Resume auto-scroll"}
            className="flex size-5 items-center justify-center rounded-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {autoScroll ? <Pause className="size-2.5" /> : <Play className="size-2.5" />}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            title="Copy filtered logs"
            className="flex size-5 items-center justify-center rounded-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {copied ? <Check className="size-2.5 text-success" /> : <Copy className="size-2.5" />}
          </button>
          <button
            type="button"
            onClick={() => sysLog.clear()}
            title="Clear logs"
            className="flex size-5 items-center justify-center rounded-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Trash2 className="size-2.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSize(null)
              setExpanded((v) => !v)
            }}
            title={expanded ? "Compact size" : "Expand size"}
            className="flex size-5 items-center justify-center rounded-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {expanded ? <Minimize2 className="size-2.5" /> : <Maximize2 className="size-2.5" />}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            title="Close console (Shift+D)"
            className="flex size-5 items-center justify-center rounded-xs text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
          >
            <X className="size-3" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border/70 bg-background/60 px-2 py-1">
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={cn(
            "border px-1 py-0 text-[9px] font-bold tracking-wider transition-colors",
            filter === "ALL"
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          ALL ({snapshot.entries.length})
        </button>
        {ALL_LEVELS.map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => setFilter(lvl)}
            className={cn(
              "border px-1 py-0 text-[9px] font-bold tracking-wider transition-colors",
              filter === lvl
                ? LEVEL_STYLES[lvl]
                : "border-border/70 bg-card/60 text-muted-foreground hover:text-foreground"
            )}
          >
            {lvl} {counts[lvl] > 0 ? `(${counts[lvl]})` : ""}
          </button>
        ))}
      </div>

      {/* Log Stream */}
      <div
        ref={listRef}
        className="flex-1 space-y-0.5 overflow-y-auto bg-background/80 p-2 text-[10px]"
      >
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
            No {filter === "ALL" ? "" : `${filter} `}events recorded yet.
          </div>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-1.5 border-b border-border/40 pb-0.5 last:border-b-0"
            >
              <span className="shrink-0 text-[9px] text-muted-foreground tabular-nums">
                {formatClock(entry.timestamp)}
              </span>
              <span
                className={cn(
                  "w-11 shrink-0 border px-1 py-0 text-center text-[8px] font-bold uppercase tracking-wider",
                  LEVEL_STYLES[entry.level]
                )}
              >
                {entry.level}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="break-all font-medium text-foreground">
                    {entry.title}
                  </span>
                  {entry.status !== undefined && (
                    <span className={cn("shrink-0 text-[9px] font-bold tabular-nums", statusColor(entry.status))}>
                      [{entry.status === 0 ? "NET_ERR" : entry.status}]
                    </span>
                  )}
                  {entry.durationMs !== undefined && (
                    <span className="shrink-0 text-[9px] text-muted-foreground tabular-nums">
                      {entry.durationMs}ms
                    </span>
                  )}
                </div>
                {entry.detail && (
                  <p className="mt-0.5 break-words text-[9px] text-muted-foreground">
                    {entry.detail}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom-right resize grip */}
      <div
        onPointerDown={handleResizeStart}
        title="Drag to resize"
        className="absolute right-0 bottom-0 flex size-3.5 cursor-nwse-resize items-end justify-end p-0.5 text-muted-foreground/60 hover:text-foreground"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
          <path d="M7 1L1 7M7 4L4 7" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </div>
    </div>
  )
}
