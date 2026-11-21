import { AppAccessGate } from "@/components/app-access-gate"
import { AppMain } from "@/components/app-main"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { BootstrapOverlay } from "@/components/bootstrap-overlay"
import { NavigationProgress } from "@/components/navigation-progress"

/**
 * Authenticated app shell. Server-side route protection lives in `proxy.ts`
 * so `AppLayout` does not trigger a duplicate redirect while client auth hydrates.
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      {/* Viewport-fixed — above everything */}
      <BootstrapOverlay />
      <NavigationProgress />

      <SidebarProvider defaultOpen={true} className="h-full w-full overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-h-0 min-w-0 max-w-full overflow-hidden">
          <SiteHeader />
          <main className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-y-auto overflow-x-hidden">
            <AppMain>
              <AppAccessGate>{children}</AppAccessGate>
            </AppMain>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}
