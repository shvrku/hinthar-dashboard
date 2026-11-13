export type SysLogLevel = "API" | "QUERY" | "LOAD" | "AUTH" | "ROUTE" | "BOOT" | "ERR"

export interface SysLogEntry {
  id: number
  timestamp: number
  elapsedMs: number
  level: SysLogLevel
  title: string
  detail?: string
  status?: number
  durationMs?: number
}

export interface SysLogSnapshot {
  entries: SysLogEntry[]
  inFlight: number
  bootstrapActive: boolean
}

const MAX_ENTRIES = 250
const BOOT_EPOCH = typeof performance !== "undefined" ? performance.now() : 0

let nextId = 1
let entries: SysLogEntry[] = []
let inFlight = 0
let bootstrapActive = false
let snapshot: SysLogSnapshot = { entries, inFlight, bootstrapActive }
const listeners = new Set<() => void>()

function emit() {
  snapshot = { entries, inFlight, bootstrapActive }
  for (const listener of listeners) {
    listener()
  }
}

export const sysLog = {
  add(input: Omit<SysLogEntry, "id" | "timestamp" | "elapsedMs">) {
    const now = Date.now()
    const elapsedMs =
      typeof performance !== "undefined" ? Math.max(0, Math.round(performance.now() - BOOT_EPOCH)) : 0
    const next: SysLogEntry = {
      id: nextId++,
      timestamp: now,
      elapsedMs,
      ...input,
    }
    entries = entries.length >= MAX_ENTRIES ? [...entries.slice(-(MAX_ENTRIES - 1)), next] : [...entries, next]
    emit()
  },

  startRequest() {
    inFlight += 1
    emit()
  },

  endRequest() {
    inFlight = Math.max(0, inFlight - 1)
    emit()
  },

  setBootstrapActive(active: boolean) {
    if (bootstrapActive === active) return
    bootstrapActive = active
    emit()
  },

  clear() {
    entries = []
    emit()
  },

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  getSnapshot(): SysLogSnapshot {
    return snapshot
  },
}
