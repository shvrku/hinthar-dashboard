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

/**
 * Global access gate after Clerk sign-in:
 * - pending → /pending
 * - terminal → /check-in/terminal only
 * - student/teacher → /pending (no portal yet)
 * - staff/admin → full app
 */
export function AppAccessGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const { role, loading } = useCurrentUser()
  const pathname = normalizePath(usePathname())
  const router = useRouter()

  React.useEffect(() => {
    if (!authLoaded || loading || !isSignedIn || !role) return

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

    if (role === "student" || role === "teacher") {
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

  if (role === "pending" || role === "student" || role === "teacher") {
    if (pathname !== "/pending") return null
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
