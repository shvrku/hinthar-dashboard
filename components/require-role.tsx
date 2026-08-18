"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCurrentUser } from "@/components/current-user-provider"
import {
  canCheckIn,
  isAdmin,
  isStaffOrAbove,
  type Role,
} from "@/lib/roles"
import { Button } from "@/components/ui/button"

type GateMode = "staff" | "admin" | "checkin" | "any" | "student"

function allowed(role: Role | null, mode: GateMode): boolean {
  if (!role) return false
  if (mode === "any") return true
  if (mode === "admin") return isAdmin(role)
  if (mode === "staff") return isStaffOrAbove(role)
  if (mode === "checkin") return canCheckIn(role)
  if (mode === "student") return role === "student"
  return false
}

export function RequireRole({
  mode = "staff",
  children,
}: {
  mode?: GateMode
  children: React.ReactNode
}) {
  const { role, user, loading, error } = useCurrentUser()
  const router = useRouter()
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
    if (loading) return
    if (accountLocked && pathname !== "/account-locked") {
      router.replace("/account-locked/")
      return
    }
    if (waitingForLink && pathname !== "/pending") {
      router.replace("/pending/")
      return
    }
    if (role === "student" && mode !== "student" && mode !== "any") {
      if (pathname !== "/") {
        router.replace("/")
      }
      return
    }
    if (role === "terminal" && mode !== "checkin" && mode !== "any") {
      if (!pathname.startsWith("/check-in/terminal")) {
        router.replace("/check-in/terminal/")
      }
    }
  }, [loading, role, waitingForLink, accountLocked, pathname, router, mode])

  if (loading) {
    return null
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-16 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  if (accountLocked) {
    return null
  }

  if (waitingForLink) {
    return null
  }

  if (!allowed(role, mode)) {
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
