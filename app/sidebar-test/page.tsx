"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function SidebarTestPage() {
  return (
    <SidebarProvider defaultOpen={true} className="h-svh max-h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="h-[calc(100svh-1rem)] max-h-[calc(100svh-1rem)] flex flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Build Your Application</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 min-h-0 overflow-hidden">
          <div className="grid auto-rows-fr gap-4 md:grid-cols-3 shrink-0 h-36">
            <div className="rounded-xl bg-muted/50" />
            <div className="rounded-xl bg-muted/50" />
            <div className="rounded-xl bg-muted/50" />
          </div>
          <div className="flex-1 min-h-0 rounded-xl bg-muted/50" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
