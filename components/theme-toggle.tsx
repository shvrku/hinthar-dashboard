"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { GsapPresence } from "@/components/animation/gsap-presence"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
      <GsapPresence activeKey={theme}>
        {theme === "light" ? (
          <Moon className="size-4" />
        ) : (
          <Sun className="size-4 text-warning" />
        )}
      </GsapPresence>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
