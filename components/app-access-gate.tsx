"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { useCurrentUser } from "@/components/current-user-provider"
import { canCheckIn, isStaffOrAbove } from "@/lib/roles"

/** Normalize `/pending/` → `/pending` so trailingSlash config doesn't blank the page. */
function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1)
  }
  return pathname
}

/** Client-only appearance prefs — available to every signed-in role. */
function isSettingsPath(pathname: string): boolean {
  return pathname === "/settings"
}

/** Student portal home. Must not match staff `/students`. */
function isStudentPortalPath(pathname: string): boolean {
  return pathname === "/student"
}

/**
 * Global access gate after Clerk sign-in:
 * - /settings → all signed-in roles (appearance is client-local)
 * - pending → /pending (or settings)
 * - terminal → /check-in/terminal only (or settings)
 * - student → /student (or settings)
 * - teacher → /pending (or settings; no portal yet)
 * - staff/admin → full app
 */
export function AppAccessGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const { role, loading } = useCurrentUser()
  const pathname = normalizePath(usePathname())
  const router = useRouter()

  React.useEffect(() => {
    if (!authLoaded || loading || !isSignedIn || !role) return
    if (isSettingsPath(pathname)) return

    if (role === "pending") {
      if (pathname !== "/pending") router.replace("/pending/")
      return
    }

    if (role === "terminal") {
      if (!pathname.startsWith("/check-in/terminal")) {
        router.replace("/check-in/terminal/")
      }
      return
    }

    if (role === "student") {
      if (!isStudentPortalPath(pathname)) router.replace("/student/")
      return
    }

    if (role === "teacher") {
      if (pathname !== "/pending") router.replace("/pending/")
      return
    }

    if (isStaffOrAbove(role) && pathname === "/pending") {
      router.replace("/")
    }
  }, [authLoaded, loading, isSignedIn, role, pathname, router])

  if (!authLoaded || (isSignedIn && loading)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading account…
      </div>
    )
  }

  // Public auth pages (sign-in/up) — no Django role yet
  if (!isSignedIn) {
    return <>{children}</>
  }

  if (!role) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Unable to load your account profile.
      </div>
    )
  }

  if (isSettingsPath(pathname)) {
    return <>{children}</>
  }

  if (role === "pending" || role === "teacher") {
    if (pathname !== "/pending") return null
    return <>{children}</>
  }

  if (role === "student") {
    if (!isStudentPortalPath(pathname)) return null
    return <>{children}</>
  }

  if (role === "terminal") {
    if (!pathname.startsWith("/check-in/terminal")) return null
    return <>{children}</>
  }

  if (!isStaffOrAbove(role) && !canCheckIn(role)) {
    return null
  }

  return <>{children}</>
}
