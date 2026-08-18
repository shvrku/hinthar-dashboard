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

function isOwnTeacherHubPath(pathname: string, teacherProfileId: number | null): boolean {
  if (teacherProfileId == null) return false
  const match = pathname.match(/^\/teachers\/(\d+)$/)
  return match != null && Number(match[1]) === teacherProfileId
}

function isPendingPath(pathname: string): boolean {
  return pathname === "/pending"
}

function isAccountLockedPath(pathname: string): boolean {
  return pathname === "/account-locked"
}

/**
 * Global access gate after Clerk sign-in:
 * - `/` is the post-login dispatcher (all signed-in roles)
 * - `/settings` → all signed-in roles (appearance is client-local)
 * - `/student` leftover alias (redirect page)
 * - deactivated (`is_active=false`) → `/account-locked` (plus `/` and `/settings`)
 * - pending / unmatched student or teacher → `/pending`
 * - teacher → `/`, `/settings`, own `/teachers/{id}`
 * - terminal → `/`, `/settings`, `/check-in/terminal*`
 * - student → `/`, `/settings`, own `/students/{id}`
 * - staff/admin → full app
 */
export function AppAccessGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const { role, user, loading } = useCurrentUser()
  const pathname = normalizePath(usePathname())
  const router = useRouter()
  const studentProfileId = user?.student_profile_id ?? null
  const teacherProfileId = user?.teacher_profile_id ?? null
  const unmatchedStudent = role === "student" && studentProfileId == null
  const unmatchedTeacher = role === "teacher" && teacherProfileId == null
  const waitingForLink = role === "pending" || unmatchedStudent || unmatchedTeacher
  const accountLocked = user?.is_active === false

  React.useEffect(() => {
    if (!authLoaded || loading || !isSignedIn || !role) return
    if (isSettingsPath(pathname) || pathname === "/" || isLegacyStudentPortalPath(pathname)) {
      return
    }

    if (accountLocked) {
      if (!isAccountLockedPath(pathname)) router.replace("/account-locked/")
      return
    }

    if (isAccountLockedPath(pathname)) {
      router.replace("/")
      return
    }

    if (waitingForLink) {
      if (!isPendingPath(pathname)) router.replace("/pending/")
      return
    }

    if (role === "terminal") {
      if (!pathname.startsWith("/check-in/terminal")) {
        router.replace("/check-in/terminal/")
      }
      return
    }

    if (role === "student") {
      if (!isOwnStudentHubPath(pathname, studentProfileId)) {
        router.replace("/")
      }
      return
    }

    if (role === "teacher") {
      if (!isOwnTeacherHubPath(pathname, teacherProfileId)) {
        router.replace("/")
      }
      return
    }

    if (isStaffOrAbove(role) && isPendingPath(pathname)) {
      router.replace("/overview/")
    }
  }, [
    authLoaded,
    loading,
    isSignedIn,
    role,
    studentProfileId,
    teacherProfileId,
    waitingForLink,
    accountLocked,
    pathname,
    router,
  ])

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

  if (accountLocked) {
    if (!isAccountLockedPath(pathname)) return null
    return <>{children}</>
  }

  if (isAccountLockedPath(pathname)) {
    return null
  }

  if (waitingForLink) {
    if (!isPendingPath(pathname)) return null
    return <>{children}</>
  }

  if (role === "teacher") {
    if (!isOwnTeacherHubPath(pathname, teacherProfileId)) return null
    return <>{children}</>
  }

  if (role === "student") {
    if (!isOwnStudentHubPath(pathname, studentProfileId)) return null
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
