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

function isSettingsPath(pathname: string): boolean {
  return pathname === "/settings"
}

/** Leftover singular portal — redirect page runs for every signed-in role. */
function isLegacyStudentPortalPath(pathname: string): boolean {
  return pathname === "/student"
}

function isOwnStudentHubPath(pathname: string, studentProfileId: number | null): boolean {
  if (studentProfileId == null) return false
  const match = pathname.match(/^\/students\/(\d+)$/)
  return match != null && Number(match[1]) === studentProfileId
}

/**
 * Global access gate after Clerk sign-in:
 * - `/` is the post-login dispatcher (all signed-in roles)
 * - `/settings` → all signed-in roles (appearance is client-local)
 * - `/student` leftover alias (redirect page)
 * - pending / teacher → `/pending`
 * - terminal → `/`, `/settings`, `/check-in/terminal*`
 * - student → `/`, `/settings`, own `/students/{id}`
 * - staff/admin → full app
 */
export function AppAccessGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const { role, user, loading } = useCurrentUser()
  const pathname = normalizePath(usePathname())
  const router = useRouter()

  React.useEffect(() => {
    if (!authLoaded || loading || !isSignedIn || !role) return
    if (isSettingsPath(pathname) || pathname === "/" || isLegacyStudentPortalPath(pathname)) {
      return
    }

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
      if (!isOwnStudentHubPath(pathname, user?.student_profile_id ?? null)) {
        router.replace("/")
      }
      return
    }

    if (role === "teacher") {
      if (pathname !== "/pending") router.replace("/pending/")
      return
    }

    if (isStaffOrAbove(role) && pathname === "/pending") {
      router.replace("/overview/")
    }
  }, [authLoaded, loading, isSignedIn, role, user?.student_profile_id, pathname, router])

  if (!authLoaded || (isSignedIn && loading)) {
    return null
  }

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

  if (isSettingsPath(pathname) || pathname === "/" || isLegacyStudentPortalPath(pathname)) {
    return <>{children}</>
  }

  if (role === "pending" || role === "teacher") {
    if (pathname !== "/pending") return null
    return <>{children}</>
  }

  if (role === "student") {
    if (!isOwnStudentHubPath(pathname, user?.student_profile_id ?? null)) return null
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
