"use client"

import { useClerk } from "@clerk/nextjs"
import { useCurrentUser } from "@/components/current-user-provider"
import { Button } from "@/components/ui/button"
import { StandardPageHeader } from "@/components/standard-page-header"

export default function PendingApprovalPage() {
  const { user, loading } = useCurrentUser()
  const { signOut } = useClerk()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading account…
      </div>
    )
  }

  const role = user?.role
  const isAwaitingRole = role === "pending"
  const isFuturePortal = role === "teacher" || role === "student"

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <StandardPageHeader
        title={isFuturePortal ? "Portal not available yet" : "Awaiting approval"}
        description={
          isFuturePortal
            ? "Teacher and student portals are not enabled in this release. Ask an administrator if you need staff access."
            : "Your account was created successfully. An administrator must assign a role before you can use the dashboard."
        }
      />
      <div className="rounded-lg border bg-card p-4 text-sm space-y-2">
        <p>
          <span className="text-muted-foreground">Signed in as </span>
          <span className="font-medium">{user?.email || user?.username || "—"}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Status </span>
          <span className="font-medium capitalize">{role ?? "pending"}</span>
          {isAwaitingRole ? " — waiting for admin approval" : null}
        </p>
      </div>
      <Button variant="outline" onClick={() => signOut({ redirectUrl: "/sign-in" })}>
        Sign out
      </Button>
    </div>
  )
}
