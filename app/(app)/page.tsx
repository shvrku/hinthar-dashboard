"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "@/components/current-user-provider"
import { isStaffOrAbove } from "@/lib/roles"

/**
 * Post-login role dispatcher. Not a product page — `/` stays free for a future
 * public landing. Clerk sign-in always returns here.
 */
export default function RoleHomeDispatcher() {
  const router = useRouter()
  const { user, role, loading } = useCurrentUser()
  const studentId = user?.student_profile_id ?? null
  const teacherId = user?.teacher_profile_id ?? null

  React.useEffect(() => {
    if (loading || !role) return
    if (role === "pending") {
      router.replace("/pending/")
      return
    }
    if (role === "teacher") {
      if (teacherId != null) {
        router.replace(`/teachers/${teacherId}/`)
      } else {
        router.replace("/pending/")
      }
      return
    }
    if (role === "terminal") {
      router.replace("/check-in/terminal/")
      return
    }
    if (role === "student") {
      if (studentId != null) {
        router.replace(`/students/${studentId}/`)
      } else {
        router.replace("/pending/")
      }
      return
    }
    if (isStaffOrAbove(role)) {
      router.replace("/overview/")
    }
  }, [loading, role, studentId, teacherId, router])

  return null
}
