/**
 * Public auth pages — no dashboard chrome, no auth.protect().
 * Subtle page tone so the Clerk card reads as a distinct surface.
 */
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-auto bg-muted/40 p-4 dark:bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.6_0.08_165_/_0.12),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.45_0.08_165_/_0.18),transparent_50%)]"
      />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  )
}
