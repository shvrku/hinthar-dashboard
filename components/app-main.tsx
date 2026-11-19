"use client"

/** Authenticated main content padding — matches across all app pages. */
export function AppMain({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 max-w-full flex-1 flex-col p-4 pb-10 md:p-6 md:pb-12">
      {children}
    </div>
  )
}
