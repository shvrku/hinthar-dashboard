"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useClerk } from "@clerk/nextjs"
import { useCurrentUser } from "@/components/current-user-provider"
import { AuthProfileErrorState } from "@/components/app-access-gate"
import {
  canCheckIn,
  isAdmin,
  isStaffOrAbove,
  type Role,
} from "@/lib/roles"
import { Button } from "@/components/ui/button"
import { AuthPortalLoadingState } from "@/components/page-skeletons"

type GateMode = "staff" | "admin" | "checkin" | "any" | "student" | "parent" | "parent_portal"

function allowed(role: Role | null, mode: GateMode): boolean {
  if (!role) return false
  if (mode === "any") return true
  if (mode === "admin") return isAdmin(role)
  if (mode === "staff") return isStaffOrAbove(role)
  if (mode === "checkin") return canCheckIn(role)
  if (mode === "student") return role === "student"
  if (mode === "parent") return role === "parent"
  if (mode === "parent_portal") {
    return role === "parent" || role === "student" || isStaffOrAbove(role)
  }
  return false
}

export function RequireRole({
  mode = "staff",
  skeleton,
  children,
}: {
  mode?: GateMode
  skeleton?: React.ReactNode
  children: React.ReactNode
}) {
  const { role, user, loading, error, refresh } = useCurrentUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const lastRedirectRef = React.useRef<string | null>(null)
  const pathnameRaw = usePathname()
  const pathname =
    pathnameRaw.length > 1 && pathnameRaw.endsWith("/")
      ? pathnameRaw.slice(0, -1)
      : pathnameRaw
  const waitingForLink =
    role === "pending" ||
    (role === "student" && user?.student_profile_id == null) ||
    (role === "teacher" && user?.teacher_profile_id == null)
  const accountLocked = user?.is_active === false

  React.useEffect(() => {
    if (loading || !role) return

    let target: string | null = null

    if (accountLocked && pathname !== "/account-locked") {
      target = "/account-locked/"
    } else if (waitingForLink && pathname !== "/pending") {
      target = "/pending/"
    } else if (role === "student" && mode !== "student" && mode !== "parent_portal" && mode !== "any") {
      target = user?.student_profile_id != null ? `/students/${user.student_profile_id}/` : "/pending/"
    } else if (role === "teacher" && mode !== "any") {
      target = user?.teacher_profile_id != null ? `/teachers/${user.teacher_profile_id}/` : "/pending/"
    } else if (role === "parent" && mode !== "parent" && mode !== "parent_portal" && mode !== "any") {
      if (pathname !== "/academics" && !pathname.startsWith("/academics/")) {
        target = "/academics/"
      }
    } else if (role === "terminal" && mode !== "checkin" && mode !== "any") {
      if (!pathname.startsWith("/check-in/terminal")) {
        target = "/check-in/terminal/"
      }
    }

    if (target) {
      if (lastRedirectRef.current !== target) {
        lastRedirectRef.current = target
        router.replace(target)
      }
    } else {
      lastRedirectRef.current = null
    }
  }, [
    loading,
    role,
    waitingForLink,
    accountLocked,
    pathname,
    router,
    mode,
    user?.student_profile_id,
    user?.teacher_profile_id,
  ])

  const defaultLabel =
    mode === "parent" || mode === "parent_portal" || role === "parent"
      ? "Loading Hinthar Portal..."
      : "Loading Hinthar Portal..."

  if (error) {
    return (
      <AuthProfileErrorState
        error={error}
        onRetry={() => void refresh()}
        onSignOut={() => void signOut({ redirectUrl: "/sign-in/" })}
      />
    )
  }

  if (loading) {
    return skeleton ?? <AuthPortalLoadingState label={defaultLabel} />
  }

  if (!role) {
    return (
      <AuthProfileErrorState
        error="Unable to load your account profile from /api/v1/me/."
        onRetry={() => void refresh()}
        onSignOut={() => void signOut({ redirectUrl: "/sign-in/" })}
      />
    )
  }

  if (accountLocked || waitingForLink) {
    return <AuthPortalLoadingState label="Loading account status..." compact />
  }

  if (!allowed(role, mode)) {
    if (role === "parent") {
      return skeleton ?? <AuthPortalLoadingState label="Loading Parent Portal..." />
    }
    if (role === "student" || role === "teacher" || role === "terminal") {
      return skeleton ?? <AuthPortalLoadingState label="Loading workspace..." />
    }
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          Your account does not have permission to view this page.
        </p>
        <Button variant="outline" render={<Link href="/" />}>
          Go back
        </Button>
      </div>
    )
  }

  return <>{children}</>
}
