"use client"

import { useClerk } from "@clerk/nextjs"
import { useCurrentUser } from "@/components/current-user-provider"
import { Button } from "@/components/ui/button"
import { StandardPageHeader } from "@/components/standard-page-header"

export default function AccountLockedPage() {
  const { user, loading } = useCurrentUser()
  const { signOut } = useClerk()

  if (loading) {
    return null
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-6">
      <StandardPageHeader
        title="Account deactivated"
        description="This login is locked. You can still sign out. Ask an administrator to activate the account if you need access again."
      />
      <div className="rounded-lg border bg-card p-4 text-sm space-y-2">
        <p>
          <span className="text-muted-foreground">Signed in as </span>
          <span className="font-medium">{user?.email || user?.username || "—"}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Status </span>
          <span className="font-medium">Deactivated</span>
          {" — "}
          Django account is inactive
        </p>
      </div>
      <Button variant="outline" onClick={() => signOut({ redirectUrl: "/sign-in" })}>
        Sign out
      </Button>
    </div>
  )
}
