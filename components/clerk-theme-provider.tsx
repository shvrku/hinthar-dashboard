"use client"

import * as React from "react"
import { ClerkProvider } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { useTheme } from "@/components/theme-provider"

export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()

  return (
    <ClerkProvider
      appearance={{
        theme: theme === "dark" ? dark : undefined,
      }}
    >
      {children}
    </ClerkProvider>
  )
}
