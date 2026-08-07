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
      // App buttons stay white via Tailwind `--primary`. Clerk chrome cannot use
      // pure white as colorPrimary — active nav / icon buttons become invisible.
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

type BrandTone = {
  primary: string
  primaryForeground: string
  background: string
  card: string
  muted: string
  input: string
  foreground: string
  mutedForeground: string
  border: string
  neutral: string
  danger: string
}

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

function badgeStyles(tones: BrandTone) {
  return {
    backgroundColor: tones.muted,
    color: tones.foreground,
    border: `1px solid ${tones.border}`,
    borderRadius: "0.375rem",
    fontSize: "10px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontWeight: 500,
    padding: "2px 6px",
    boxShadow: "none",
  } as const
}

/** Active nav: muted chip + foreground text (never white-on-white in mono). */
function navbarButtonStyles(tones: BrandTone) {
  return {
    borderRadius: "0.5rem",
    fontSize: "12px",
    fontWeight: 600,
    color: `${tones.foreground} !important`,
    backgroundColor: "transparent",
    "&:hover": {
      backgroundColor: tones.muted,
      color: `${tones.foreground} !important`,
    },
    "&[data-active='true'], &[aria-current='page'], &.cl-active": {
      backgroundColor: `${tones.muted} !important`,
      color: `${tones.foreground} !important`,
    },
    "&[data-active='true'] svg, &[aria-current='page'] svg, &.cl-active svg, & svg":
      {
        color: `${tones.foreground} !important`,
      },
  } as const
}

/** Soft outline for Update profile / username / password — not a heavy chip. */
function profileUpdateButtonStyles(tones: BrandTone) {
  return {
    color: `${tones.foreground} !important`,
    backgroundColor: "transparent",
    border: `1px solid ${tones.border}66`,
    borderRadius: "0.5rem",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 500,
    boxShadow: "none",
    "&:hover": {
      backgroundColor: `${tones.muted}99`,
      borderColor: tones.border,
      color: `${tones.foreground} !important`,
    },
  } as const
}

/** Add email — plain by default, filled muted on hover. */
function profileAddEmailStyles(tones: BrandTone) {
  return {
    color: `${tones.mutedForeground} !important`,
    backgroundColor: "transparent !important",
    border: "none !important",
    boxShadow: "none !important",
    borderRadius: "0.5rem",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 500,
    "&:hover": {
      backgroundColor: `${tones.muted} !important`,
      color: `${tones.foreground} !important`,
      textDecoration: "none",
    },
  } as const
}

/** Connect account — filled muted row button (Clerk default look). */
function profileConnectButtonStyles(tones: BrandTone) {
  return {
    color: `${tones.foreground} !important`,
    backgroundColor: `${tones.muted} !important`,
    border: "none !important",
    boxShadow: "none !important",
    borderRadius: "0.5rem",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 500,
    "&:hover": {
      backgroundColor: `${tones.border} !important`,
      color: `${tones.foreground} !important`,
      textDecoration: "none",
    },
  } as const
}

/** Delete account — danger outline. */
function profileDangerButtonStyles(tones: BrandTone) {
  return {
    color: `${tones.danger} !important`,
    backgroundColor: "transparent !important",
    border: `1px solid ${tones.danger}99 !important`,
    borderRadius: "0.5rem",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 500,
    boxShadow: "none",
    "&:hover": {
      backgroundColor: `${tones.danger}18 !important`,
      borderColor: `${tones.danger} !important`,
      color: `${tones.danger} !important`,
      textDecoration: "none",
    },
  } as const
}

function resolveTones(palette: ThemePalette, mode: ThemeMode): BrandTone {
  return BRAND[palette][mode]
}

/**
 * Clerk appearance for in-app components.
 *
 * Sign-in / sign-up get elevated card chrome. UserProfile modal keeps a single
 * outer shell (no nested card borders) to avoid clipped-corner glitches.
 */
export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, palette } = useTheme()
  const isDark = theme === "dark"
  const tones = resolveTones(palette, isDark ? "dark" : "light")
  const variables = clerkVariables(tones)
  const badge = badgeStyles(tones)
  const navbarButton = navbarButtonStyles(tones)
  const profileUpdate = profileUpdateButtonStyles(tones)
  const profileAddEmail = profileAddEmailStyles(tones)
  const profileConnect = profileConnectButtonStyles(tones)
  const profileDanger = profileDangerButtonStyles(tones)

  return (
    <ClerkProvider
      appearance={{
        cssLayerName: "clerk",
        theme: isDark ? dark : undefined,
        variables,
        elements: {
          formButtonPrimary:
            "!bg-primary !text-primary-foreground hover:!bg-primary/90 font-medium rounded-xl text-xs",
          badge,
          identityPreview: "bg-muted/40 border border-border/60 rounded-lg",
          footer: "bg-transparent",
        },
        signIn: {
          variables,
          elements: authCardElements,
        },
        signUp: {
          variables,
          elements: authCardElements,
        },
        userProfile: {
          variables,
          elements: {
            rootBox: "text-foreground",
            modalBackdrop: "bg-background/80 backdrop-blur-md",
            modalContent:
              "!rounded-2xl !overflow-hidden border border-border/80 bg-card shadow-2xl",
            cardBox:
              "!rounded-none !shadow-none !border-none bg-card overflow-hidden",
            card: "!rounded-none !shadow-none !border-none bg-card text-card-foreground",
            navbar: "!rounded-none border-r border-border/60 bg-muted/40",
            navbarButtons: "gap-1",
            scrollBox: "!rounded-none bg-card",
            pageScrollBox: "!rounded-none bg-card",
            navbarButton,
            headerTitle: "text-foreground font-semibold text-lg tracking-tight",
            headerSubtitle: "text-muted-foreground text-xs",
            profileSectionTitleText:
              "text-foreground font-semibold text-sm border-b border-border/40 pb-1",
            profileSectionContent: "text-foreground",
            profileSectionItem: {
              color: tones.foreground,
            },
            userPreviewMainIdentifier: "font-semibold text-foreground",
            userPreviewSecondaryIdentifier: "text-muted-foreground text-xs",
            // Soft outline on update actions…
            profileSectionPrimaryButton__profile: profileUpdate,
            profileSectionPrimaryButton__username: profileUpdate,
            profileSectionPrimaryButton__password: profileUpdate,
            // …plain links for add/connect (match Connect account)
            profileSectionPrimaryButton__emailAddresses: profileAddEmail,
            profileSectionPrimaryButton__connectedAccounts: profileConnect,
            profileSectionPrimaryButton__phoneNumbers: profileAddEmail,
            profileSectionPrimaryButton__danger: profileDanger,
            formButtonPrimary:
              "!bg-primary !text-primary-foreground hover:!bg-primary/90 font-medium rounded-xl text-xs",
            badge,
            menuButton: {
              color: tones.foreground,
              "&:hover": { backgroundColor: tones.muted },
              borderRadius: "0.375rem",
            },
            accordionTriggerButton: {
              color: tones.foreground,
              "&:hover": { backgroundColor: `${tones.muted}80` },
            },
            breadcrumbsItem: { color: tones.mutedForeground },
            breadcrumbsItemDivider: { color: tones.mutedForeground },
          },
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
