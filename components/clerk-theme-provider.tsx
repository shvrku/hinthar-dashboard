"use client"

import * as React from "react"
import { ClerkProvider } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { useTheme } from "@/components/theme-provider"

/** Brand tokens as hex — Clerk's theme mixer prefers concrete values over oklch/CSS vars. */
const BRAND = {
  emerald: {
    light: {
      primary: "#147A5F",
      primaryForeground: "#ECFDF5",
      background: "#FFFFFF",
      card: "#FFFFFF",
      input: "#F4F4F5",
      foreground: "#18181B",
      mutedForeground: "#71717A",
      border: "#E4E4E7",
      neutral: "#3F3F46",
    },
    dark: {
      primary: "#2E9B7A",
      primaryForeground: "#ECFDF5",
      background: "#141416",
      card: "#27272A",
      input: "#1C1C1F",
      foreground: "#FAFAFA",
      mutedForeground: "#A1A1AA",
      border: "#3F3F46",
      neutral: "#E4E4E7",
    },
  },
  mono: {
    light: {
      primary: "#27272A",
      primaryForeground: "#FAFAFA",
      background: "#FFFFFF",
      card: "#FFFFFF",
      input: "#F4F4F5",
      foreground: "#18181B",
      mutedForeground: "#71717A",
      border: "#E4E4E7",
      neutral: "#3F3F46",
    },
    dark: {
      primary: "#FAFAFA",
      primaryForeground: "#27272A",
      background: "#141416",
      card: "#27272A",
      input: "#1C1C1F",
      foreground: "#FAFAFA",
      mutedForeground: "#A1A1AA",
      border: "#3F3F46",
      neutral: "#E4E4E7",
    },
  },
} as const

const authCardElements = {
  rootBox: "w-full mx-auto",
  cardBox:
    "!rounded-2xl !border !border-border !shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10",
  card: "!rounded-2xl !shadow-none !border-none",
  footer: "!bg-transparent",
} as const

/**
 * Clerk appearance for in-app components.
 *
 * Sign-in / sign-up get elevated card chrome. UserProfile modal keeps a single
 * outer shell (no nested card borders) to avoid clipped-corner glitches.
 */
export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, palette } = useTheme()
  const isDark = theme === "dark"
  const tones = BRAND[palette][isDark ? "dark" : "light"]

  return (
    <ClerkProvider
      appearance={{
        theme: isDark ? dark : undefined,
        variables: {
          colorPrimary: tones.primary,
          colorPrimaryForeground: tones.primaryForeground,
          colorBackground: tones.card,
          colorInput: tones.input,
          colorInputForeground: tones.foreground,
          colorForeground: tones.foreground,
          colorMutedForeground: tones.mutedForeground,
          colorNeutral: tones.neutral,
          colorBorder: tones.border,
          colorShadow: isDark ? "#000000" : "#18181B",
          borderRadius: "0.75rem",
        },
        elements: {
          formButtonPrimary:
            "bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-xl text-xs",
          badge:
            "bg-secondary text-secondary-foreground font-mono text-[10px] rounded-md px-1.5 py-0.5",
          footer: "bg-transparent",
        },
        // Auth cards: elevated surface so they separate from the page.
        signIn: {
          variables: { colorBackground: tones.card },
          elements: authCardElements,
        },
        signUp: {
          variables: { colorBackground: tones.card },
          elements: authCardElements,
        },
        // UserProfile modal: one outer shell; flatten nested card chrome.
        userProfile: {
          elements: {
            modalBackdrop: "bg-background/80 backdrop-blur-md",
            modalContent:
              "!rounded-2xl !overflow-hidden border border-border/80 bg-card shadow-2xl",
            cardBox:
              "!rounded-none !shadow-none !border-none bg-card overflow-hidden",
            card: "!rounded-none !shadow-none !border-none bg-card text-card-foreground",
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
          },
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
