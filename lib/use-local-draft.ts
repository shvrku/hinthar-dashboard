"use client"

import * as React from "react"

export function useDebouncedDraft<T>(key: string, initial: T, delayMs = 500) {
  const [draft, setDraftState] = React.useState<T>(initial)
  const [ready, setReady] = React.useState(false)
  const timerRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) return
      try {
        const raw = localStorage.getItem(key)
        if (raw) {
          setDraftState(JSON.parse(raw) as T)
        }
      } catch {
        // ignore corrupt drafts
      }
      setReady(true)
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [key])

  React.useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  const persist = React.useCallback(
    (next: T) => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // ignore quota errors
        }
      }, delayMs)
    },
    [delayMs, key]
  )

  const setDraft = React.useCallback(
    (next: T | ((prev: T) => T)) => {
      setDraftState((prev) => {
        const resolved = typeof next === "function" ? (next as (prev: T) => T)(prev) : next
        persist(resolved)
        return resolved
      })
    },
    [persist]
  )

  const clearDraft = React.useCallback(() => {
    setDraftState(initial)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }, [initial, key])

  return { draft, setDraft, clearDraft, ready }
}

/** @deprecated use useDebouncedDraft */
export function useLocalDraft<T>(key: string, initial: T) {
  const { draft, setDraft, clearDraft, ready } = useDebouncedDraft(key, initial, 0)
  return { draft, saveDraft: setDraft, clearDraft, ready }
}
