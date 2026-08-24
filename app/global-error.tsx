"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en" className="h-full">
      <body className="flex h-full flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="max-w-md text-sm opacity-70">
            The application failed to start. Try reloading the page.
          </p>
          {error?.digest ? (
            <p className="font-mono text-xs opacity-50">{error.digest}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-transparent bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Reload
        </button>
      </body>
    </html>
  )
}
