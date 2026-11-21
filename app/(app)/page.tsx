"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth, useClerk } from "@clerk/nextjs"
import { AuthProfileErrorState } from "@/components/app-access-gate"
import { ParentPortalWorkspace } from "@/components/academics/parent-portal-workspace"
import { useCurrentUser } from "@/components/current-user-provider"
import { AuthPortalLoadingState } from "@/components/page-skeletons"
import { isStaffOrAbove } from "@/lib/roles"

/**
 * Post-login role dispatcher. Not a product page — `/` stays free for a future
 * public landing. Clerk sign-in always returns here.
 */
export default function RoleHomeDispatcher() {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const { user, role, loading, error, refresh } = useCurrentUser()
  const redirectedTargetRef = React.useRef<string | null>(null)
  const studentId = user?.student_profile_id ?? null
  const teacherId = user?.teacher_profile_id ?? null

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn || loading || !role) return

    let target: string | null = null
    if (user?.is_active === false) {
      target = "/account-locked/"
    } else if (role === "pending") {
      target = "/pending/"
    } else if (role === "teacher") {
      target = teacherId != null ? `/teachers/${teacherId}/` : "/pending/"
    } else if (role === "terminal") {
      target = "/check-in/terminal/"
    } else if (role === "student") {
      target = studentId != null ? `/students/${studentId}/` : "/pending/"
    } else if (role === "parent") {
      target = "/academics/"
    } else if (isStaffOrAbove(role)) {
      target = "/overview/"
    }

    if (target && redirectedTargetRef.current !== target) {
      redirectedTargetRef.current = target
      router.replace(target)
    }
  }, [isLoaded, isSignedIn, loading, role, studentId, teacherId, user?.is_active, router])

  if (error) {
    return (
      <AuthProfileErrorState
        error={error}
        onRetry={() => void refresh()}
        onSignOut={() => void signOut({ redirectUrl: "/sign-in/" })}
      />
    )
  }

  if (isLoaded && !isSignedIn) {
    return (
      <AuthProfileErrorState
        title="Session unavailable — Sign In / Retry"
        error="Your client session could not be verified. Click Retry to reload your session or Sign In to authenticate."
        onRetry={() => window.location.reload()}
        onSignOut={() => void signOut({ redirectUrl: "/sign-in/" })}
      />
    )
  }

  if (!isLoaded || loading) {
    return <AuthPortalLoadingState label="Loading Hinthar Portal..." />
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

  if (role === "parent") {
    return <ParentPortalWorkspace />
  }

  return <AuthPortalLoadingState label="Loading workspace..." />
}
