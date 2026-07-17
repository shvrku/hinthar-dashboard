"use client"

import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 text-8xl font-bold leading-none tracking-tighter sm:text-9xl">
        <span className="text-foreground">4</span>
        <span className="text-muted-foreground">0</span>
        <span className="text-foreground">4</span>
      </div>
      <h1 className="mb-2 text-xl font-semibold">Page not found</h1>
      <p className="mb-8 max-w-md text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-flex h-9 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
      >
        Go home
      </Link>
    </div>
  )
}
