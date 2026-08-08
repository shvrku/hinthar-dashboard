"use client"

import * as React from "react"
import { ClerkProvider } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { useTheme } from "@/components/theme-provider"
import type { ThemeMode, ThemePalette } from "@/lib/theme-types"

/** Brand tokens as hex — Clerk's theme mixer prefers concrete values over oklch/CSS vars. */
const BRAND = {
  emerald: {
    light: {
      primary: "#147A5F",
      primaryForeground: "#ECFDF5",
      background: "#FFFFFF",
      card: "#FFFFFF",
      muted: "#F4F4F5",
      input: "#F4F4F5",
      foreground: "#18181B",
      mutedForeground: "#71717A",
      border: "#E4E4E7",
      neutral: "#3F3F46",
      danger: "#DC2626",
    },
    dark: {
      primary: "#2E9B7A",
      primaryForeground: "#ECFDF5",
      background: "#141416",
      card: "#27272A",
      muted: "#3F3F46",
      input: "#1C1C1F",
      foreground: "#FAFAFA",
      mutedForeground: "#A1A1AA",
      border: "#3F3F46",
      neutral: "#E4E4E7",
      danger: "#F87171",
    },
  },
  mono: {
    light: {
      primary: "#27272A",
      primaryForeground: "#FAFAFA",
      background: "#FFFFFF",
      card: "#FFFFFF",
      muted: "#F4F4F5",
      input: "#F4F4F5",
      foreground: "#18181B",
      mutedForeground: "#71717A",
      border: "#E4E4E7",
      neutral: "#3F3F46",
      danger: "#DC2626",
    },
    dark: {
      // Avoid pure white as colorPrimary — Clerk chrome can wash out.
      primary: "#D4D4D8",
      primaryForeground: "#18181B",
      background: "#141416",
      card: "#27272A",
      muted: "#3F3F46",
      input: "#1C1C1F",
      foreground: "#FAFAFA",
      mutedForeground: "#A1A1AA",
      border: "#52525B",
      neutral: "#E4E4E7",
      danger: "#F87171",
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

type BrandTone = (typeof BRAND)[ThemePalette][ThemeMode]

function clerkVariables(tones: BrandTone) {
  return {
    colorPrimary: tones.primary,
    colorPrimaryForeground: tones.primaryForeground,
    colorBackground: tones.card,
    colorMuted: tones.muted,
    colorInput: tones.input,
    colorInputForeground: tones.foreground,
    colorForeground: tones.foreground,
    colorMutedForeground: tones.mutedForeground,
    colorNeutral: tones.neutral,
    colorBorder: tones.border,
    colorDanger: tones.danger,
    colorShadow: tones.background === "#FFFFFF" ? "#18181B" : "#000000",
    borderRadius: "0.75rem",
  }
}

/**
 * Minimal Clerk theming: brand variables only on sign-in/up.
 * UserProfile keeps Clerk’s default chrome (including badge contrast).
 */
export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, palette } = useTheme()
  const isDark = theme === "dark"
  const tones = BRAND[palette][isDark ? "dark" : "light"]
  const variables = clerkVariables(tones)

  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      appearance={{
        cssLayerName: "clerk",
        theme: isDark ? dark : undefined,
        signIn: {
          variables,
          elements: authCardElements,
        },
        signUp: {
          variables,
          elements: authCardElements,
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
