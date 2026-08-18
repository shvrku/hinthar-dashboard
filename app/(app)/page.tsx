"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { User } from "lucide-react"
import { useCurrentUser } from "@/components/current-user-provider"
import { isStaffOrAbove } from "@/lib/roles"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

/**
 * Post-login role dispatcher. Not a product page — `/` stays free for a future
 * public landing. Clerk sign-in always returns here.
 */
export default function RoleHomeDispatcher() {
  const router = useRouter()
  const { user, role, loading } = useCurrentUser()
  const studentId = user?.student_profile_id ?? null
  const teacherId = user?.teacher_profile_id ?? null
  const unmatchedStudent = role === "student" && studentId == null

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
      }
      return
    }
    if (isStaffOrAbove(role)) {
      router.replace("/overview/")
    }
  }, [loading, role, studentId, teacherId, router])

  if (unmatchedStudent) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <User />
            </EmptyMedia>
            <EmptyTitle>Account not matched yet</EmptyTitle>
            <EmptyDescription>
              Ask an administrator to match your login to your student record. You will see your
              QR code and attendance after that.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return null
}
