"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, Home, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          An unexpected error occurred while rendering this page. Your data is
          safe — try again, or head back to the dashboard.
        </p>
        {error?.digest ? (
          <p className="text-xs text-muted-foreground/70">
            Error reference: <code className="font-mono">{error.digest}</code>
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={() => unstable_retry()}>
          <RotateCcw aria-hidden="true" />
          Try again
        </Button>
        <Button variant="outline" render={<Link href="/overview/">Overview</Link>}>
          <Home aria-hidden="true" />
          Back to dashboard
        </Button>
      </div>
    </div>
  )
}
