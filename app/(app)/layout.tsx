import { auth } from "@clerk/nextjs/server"
import { AppAccessGate } from "@/components/app-access-gate"
import { AppMain } from "@/components/app-main"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { BootstrapOverlay } from "@/components/bootstrap-overlay"
import { NavigationProgress } from "@/components/navigation-progress"

/**
 * Authenticated app shell. Resource-level Clerk gate replaces
 * middleware createRouteMatcher + auth.protect().
 *
 * unauthenticatedUrl keeps redirects on our /sign-in/ (with app OG meta)
 * instead of Clerk Account Portal (*.accounts.dev).
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await auth.protect({ unauthenticatedUrl: "/sign-in/" })

  return (
    <>
      {/* Viewport-fixed — above everything */}
      <BootstrapOverlay />
      <NavigationProgress />

      <SidebarProvider defaultOpen={true} className="h-full w-full overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <SiteHeader />
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <AppMain>
              <AppAccessGate>{children}</AppAccessGate>
            </AppMain>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}
