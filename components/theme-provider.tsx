"use client"

import * as React from "react"

type Theme = "light" | "dark"

const ThemeContext = React.createContext<{
  theme: Theme
  toggleTheme: () => void
} | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>("light")

  React.useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null
    const preferred = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    Promise.resolve().then(() => {
      setTheme(preferred)
    })
    document.documentElement.classList.toggle("dark", preferred === "dark")
  }, [])

  const toggleTheme = React.useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light"
      localStorage.setItem("theme", next)
      document.documentElement.classList.toggle("dark", next === "dark")
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
