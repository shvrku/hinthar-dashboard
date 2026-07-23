"use client"

import * as React from "react"
import { ClerkProvider } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { useTheme } from "@/components/theme-provider"

export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  return (
    <ClerkProvider
      appearance={{
        theme: isDark ? dark : undefined,
        variables: {
          colorPrimary: "hsl(0 0% 98%)",
          colorBackground: isDark ? "hsl(240 10% 3.9%)" : "hsl(0 0% 100%)",
          colorNeutral: isDark ? "hsl(240 5.9% 90%)" : "hsl(240 5.9% 10%)",
          borderRadius: "0.75rem",
        },
        elements: {
          rootBox: "rounded-2xl overflow-hidden border border-border/80 shadow-2xl bg-card",
          cardBox: "rounded-2xl overflow-hidden border-none shadow-none bg-card",
          card: "rounded-2xl border-none bg-card text-card-foreground shadow-none p-0",
          modalBackdrop: "bg-background/80 backdrop-blur-md",
          modalContent: "rounded-2xl border border-border/80 bg-card text-card-foreground shadow-2xl overflow-hidden",
          navbar: "border-r border-border/60 bg-card/60",
          navbarButton: "rounded-xl text-xs font-semibold hover:bg-accent text-foreground",
          headerTitle: "text-foreground font-semibold text-lg tracking-tight",
          headerSubtitle: "text-muted-foreground text-xs",
          profileSectionTitleText: "text-foreground font-semibold text-sm border-b border-border/40 pb-1",
          userPreviewMainIdentifier: "font-semibold text-foreground",
          userPreviewSecondaryIdentifier: "text-muted-foreground text-xs",
          profileSectionPrimaryButton: "text-primary hover:text-primary/80 font-medium text-xs",
          badge: "bg-secondary text-secondary-foreground font-mono text-[10px] rounded-md px-1.5 py-0.5",
          formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-xl text-xs",
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
