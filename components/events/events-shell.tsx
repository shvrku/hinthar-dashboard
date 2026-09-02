"use client"

import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { Loader2 } from "lucide-react"

import { AppMain } from "@/components/app-main"
import { AppSidebar } from "@/components/app-sidebar"
import { HintharMark } from "@/components/hinthar-mark"
import { NavigationProgress } from "@/components/navigation-progress"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function EventsShell({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isSignedIn) {
    return (
      <>
        <NavigationProgress />
        <SidebarProvider defaultOpen className="h-full w-full overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <SiteHeader />
            <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <AppMain>{children}</AppMain>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationProgress />
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full items-center justify-between px-4 md:px-6">
          <Link href="/events" className="flex items-center gap-2 font-semibold">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HintharMark className="size-5" />
            </div>
            <span>Hinthar Events</span>
          </Link>
          <Button render={<Link href="/sign-in/" />}>Sign in</Button>
        </div>
      </header>
      <main className="p-4 pb-10 md:p-6 md:pb-12">{children}</main>
    </div>
  )
}
