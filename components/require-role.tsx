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
  const { role, loading, error } = useCurrentUser()
  const router = useRouter()
  const pathnameRaw = usePathname()
  const pathname =
    pathnameRaw.length > 1 && pathnameRaw.endsWith("/")
      ? pathnameRaw.slice(0, -1)
      : pathnameRaw

  React.useEffect(() => {
    if (loading) return
    if (role === "pending" && pathname !== "/pending") {
      router.replace("/pending/")
      return
    }
    if (role === "student" && mode !== "student" && mode !== "any") {
      if (pathname !== "/student") {
        router.replace("/student/")
      }
      return
    }
    if (role === "terminal" && mode !== "checkin" && mode !== "any") {
      if (!pathname.startsWith("/check-in/terminal")) {
        router.replace("/check-in/terminal/")
      }
    }
  }, [loading, role, pathname, router, mode])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading account…
      </div>
    )
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

  if (role === "pending") {
    return null
  }

  if (!allowed(role, mode)) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          Your account does not have permission to view this page.
        </p>
        <Button variant="outline" render={<Link href={role === "terminal" ? "/check-in/terminal" : role === "student" ? "/student" : "/"} />}>
          Go back
        </Button>
      </div>
    )
  }

  return <>{children}</>
}
