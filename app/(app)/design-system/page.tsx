"use client"

import { RequireRole } from "@/components/require-role"
import { DesignSystemContent } from "@/components/design-system/design-system-content"

export default function DesignSystemPage() {
  return (
    <RequireRole mode="admin">
      <DesignSystemContent />
    </RequireRole>
  )
}
