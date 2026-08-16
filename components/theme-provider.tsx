"use client"

import * as React from "react"
import type { ThemeMode, ThemePalette } from "@/lib/theme-types"

export type { ThemeMode, ThemePalette }

const PALETTE_KEY = "palette"
const THEME_KEY = "theme"

const ThemeContext = React.createContext<{
  theme: ThemeMode
  palette: ThemePalette
  setTheme: (theme: ThemeMode) => void
  setPalette: (palette: ThemePalette) => void
  toggleTheme: () => void
} | null>(null)

function applyMode(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark")
}

function applyPalette(palette: ThemePalette) {
  document.documentElement.dataset.palette = palette
}

function isPalette(value: string | null): value is ThemePalette {
  return value === "emerald" || value === "mono" || value === "amoled"
}

function isTheme(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark"
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeMode>("light")
  const [palette, setPaletteState] = React.useState<ThemePalette>("emerald")

  React.useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY)
    const preferredTheme: ThemeMode = isTheme(storedTheme)
      ? storedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"

    const storedPalette = localStorage.getItem(PALETTE_KEY)
    const preferredPalette: ThemePalette = isPalette(storedPalette)
      ? storedPalette
      : "emerald"

    Promise.resolve().then(() => {
      setThemeState(preferredTheme)
      setPaletteState(preferredPalette)
    })
    applyMode(preferredTheme)
    applyPalette(preferredPalette)
  }, [])

  const setTheme = React.useCallback((next: ThemeMode) => {
    setThemeState(next)
    localStorage.setItem(THEME_KEY, next)
    applyMode(next)
  }, [])

  const setPalette = React.useCallback((next: ThemePalette) => {
    setPaletteState(next)
    localStorage.setItem(PALETTE_KEY, next)
    applyPalette(next)
  }, [])

  const toggleTheme = React.useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : "light"
      localStorage.setItem(THEME_KEY, next)
      applyMode(next)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider
      value={{ theme, palette, setTheme, setPalette, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
