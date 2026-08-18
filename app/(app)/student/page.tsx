"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "@/components/current-user-provider"
import { isStaffOrAbove } from "@/lib/roles"

/** Legacy singular portal. Students go through `/`; staff+ land on the directory. */
export default function LegacyStudentPortalRedirect() {
  const router = useRouter()
  const { role, loading } = useCurrentUser()

  React.useEffect(() => {
    if (loading || !role) return
    if (isStaffOrAbove(role)) {
      router.replace("/students/")
      return
    }
    router.replace("/")
  }, [loading, role, router])

  return null
}
