"use client"

import * as React from "react"
import { ClerkProvider } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { useTheme } from "@/components/theme-provider"

/**
 * Clerk appearance tuned for the UserProfile modal.
 *
 * Avoid styling `rootBox` with card chrome — it wraps inline widgets too and
 * causes the clipped-corner / double-border glitches. Keep radius + overflow
 * only on the outer modal shell; flatten nested navbar/scroll panels.
 */
export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  return (
    <ClerkProvider
      appearance={{
        theme: isDark ? dark : undefined,
        variables: {
          colorPrimary: isDark ? "hsl(0 0% 98%)" : "hsl(240 5.9% 10%)",
          colorBackground: isDark ? "hsl(240 10% 3.9%)" : "hsl(0 0% 100%)",
          colorNeutral: isDark ? "hsl(240 5.9% 90%)" : "hsl(240 5.9% 10%)",
          borderRadius: "0.75rem",
        },
        elements: {
          // Outer modal shell only — single radius + clip.
          modalBackdrop: "bg-background/80 backdrop-blur-md",
          modalContent:
            "!rounded-2xl !overflow-hidden border border-border/80 bg-card shadow-2xl",
          // Inner card inherits the shell; no extra radius/border.
          cardBox: "!rounded-none !shadow-none !border-none bg-card overflow-hidden",
          card: "!rounded-none !shadow-none !border-none bg-card text-card-foreground",
          // Flatten side nav so the default stripe texture doesn't clash with corners.
          navbar: "!rounded-none border-r border-border/60 bg-muted/30",
          navbarButtons: "gap-1",
          scrollBox: "!rounded-none bg-card",
          pageScrollBox: "!rounded-none",
          navbarButton:
            "rounded-lg text-xs font-semibold hover:bg-accent text-foreground",
          headerTitle: "text-foreground font-semibold text-lg tracking-tight",
          headerSubtitle: "text-muted-foreground text-xs",
          profileSectionTitleText:
            "text-foreground font-semibold text-sm border-b border-border/40 pb-1",
          userPreviewMainIdentifier: "font-semibold text-foreground",
          userPreviewSecondaryIdentifier: "text-muted-foreground text-xs",
          profileSectionPrimaryButton:
            "text-primary hover:text-primary/80 font-medium text-xs",
          badge:
            "bg-secondary text-secondary-foreground font-mono text-[10px] rounded-md px-1.5 py-0.5",
          formButtonPrimary:
            "bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-xl text-xs",
          footer: "bg-transparent",
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
