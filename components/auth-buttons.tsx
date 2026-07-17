"use client"

import { useAuth } from "@clerk/nextjs"
import Link from "next/link"

export function AuthButtons() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-10 w-24 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (isSignedIn) {
    return (
      <Link
        href="/dashboard"
        className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
      >
        Go to Dashboard
      </Link>
    )
  }

  return (
    <>
      <Link
        href="/sign-up"
        className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
      >
        Get Started
      </Link>
      <Link
        href="/sign-in"
        className="inline-flex h-10 items-center justify-center rounded-lg border border-input bg-background px-6 text-sm font-medium transition-colors hover:bg-muted"
      >
        Sign In
      </Link>
    </>
  )
}
