"use client"

import * as React from "react"

const STORAGE_KEY = "reduced-motion"

type MotionPreferenceContextValue = {
  reducedMotion: boolean
  toggleReducedMotion: () => void
}

const MotionPreferenceContext =
  React.createContext<MotionPreferenceContextValue | null>(null)

function applyReducedMotion(reduced: boolean) {
  document.documentElement.setAttribute(
    "data-reduced-motion",
    reduced ? "true" : "false"
  )
}

export function MotionPreferenceProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [reducedMotion, setReducedMotion] = React.useState(false)

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const preferred =
      stored === "true"
        ? true
        : stored === "false"
          ? false
          : window.matchMedia("(prefers-reduced-motion: reduce)").matches

    Promise.resolve().then(() => {
      setReducedMotion(preferred)
    })
    applyReducedMotion(preferred)
  }, [])

  const toggleReducedMotion = React.useCallback(() => {
    setReducedMotion((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? "true" : "false")
      applyReducedMotion(next)
      return next
    })
  }, [])

  return (
    <MotionPreferenceContext.Provider
      value={{ reducedMotion, toggleReducedMotion }}
    >
      {children}
    </MotionPreferenceContext.Provider>
  )
}

export function useMotionPreference() {
  const ctx = React.useContext(MotionPreferenceContext)
  if (!ctx) {
    throw new Error(
      "useMotionPreference must be used within MotionPreferenceProvider"
    )
  }
  return ctx
}
