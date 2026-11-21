"use client"

import * as React from "react"
import { RequireRole } from "@/components/require-role"
import { ParentPortalWorkspace } from "@/components/academics/parent-portal-workspace"

export default function ParentResultsPortalPage() {
  return (
    <RequireRole mode="parent_portal">
      <ParentPortalWorkspace />
    </RequireRole>
  )
}
