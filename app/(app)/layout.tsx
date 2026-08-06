import { auth } from "@clerk/nextjs/server"
import { AppAccessGate } from "@/components/app-access-gate"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

/**
 * Authenticated app shell. Resource-level Clerk gate replaces
 * middleware createRouteMatcher + auth.protect().
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await auth.protect()

  return (
    <SidebarProvider defaultOpen={true} className="h-full w-full overflow-hidden">
      <AppSidebar />
      <SidebarInset className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <SiteHeader />
        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
          <AppAccessGate>{children}</AppAccessGate>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
