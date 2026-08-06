/**
 * Public auth pages — no dashboard chrome, no auth.protect().
 */
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-4">
      {children}
    </div>
  )
}
