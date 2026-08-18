"use client"

import { RequireRole } from "@/components/require-role"
import { UserAccountsPanel } from "@/components/users/user-accounts-panel"

export default function UsersPage() {
  return (
    <RequireRole mode="admin">
      <UserAccountsPanel />
    </RequireRole>
  )
}
