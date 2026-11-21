"use client"

import * as React from "react"
import { SignUp, useAuth, useClerk } from "@clerk/nextjs"
import { ArrowRight, Loader2, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getTokenWithTimeout } from "@/lib/api"

export default function SignUpPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { signOut } = useClerk()
  const [continuing, setContinuing] = React.useState(false)

  const handleContinue = async () => {
    setContinuing(true)
    try {
      await getTokenWithTimeout(() => getToken())
    } finally {
      window.location.assign("/academics/")
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center gap-2.5 rounded-sm border border-zinc-800 bg-zinc-950 p-6 font-mono text-xs text-zinc-400">
        <Loader2 className="size-4 animate-spin text-zinc-200" />
        <span>Loading sign-up...</span>
      </div>
    )
  }

  if (isSignedIn) {
    return (
      <div className="space-y-4 rounded-sm border border-zinc-800 bg-zinc-950 p-6 text-center">
        <div className="space-y-1.5">
          <h1 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-100">
            Already Signed In
          </h1>
          <p className="text-xs text-zinc-400">
            Your session is active. Continue to your workspace or sign out to create a different account.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <Button
            type="button"
            disabled={continuing}
            onClick={() => void handleContinue()}
            className="w-full rounded-sm font-mono text-xs uppercase"
          >
            {continuing ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : null}
            <span>Continue to Dashboard</span>
            <ArrowRight className="ml-1.5 size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={continuing}
            onClick={() => void signOut({ redirectUrl: "/sign-up/" })}
            className="w-full rounded-sm font-mono text-xs uppercase"
          >
            <LogOut className="mr-1.5 size-3.5" />
            Sign out
          </Button>
        </div>
      </div>
    )
  }

  return <SignUp fallbackRedirectUrl="/academics" />
}
