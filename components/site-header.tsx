"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search } from "lucide-react"
import { motion } from "motion/react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { CommandSearchDialog } from "@/components/command-search-dialog"

function formatPathSegment(segment: string) {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function SiteHeader() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [isMac, setIsMac] = React.useState(false)

  React.useEffect(() => {
    setIsMac(typeof window !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform || ""))
  }, [])

  // Listen to Ctrl+K / Cmd+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-background/95 px-4 backdrop-blur-sm"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/" />}>
                  Hinthar
                </BreadcrumbLink>
              </BreadcrumbItem>
              {segments.flatMap((segment, index) => {
                const href = `/${segments.slice(0, index + 1).join("/")}`
                const isLast = index === segments.length - 1
                const title = formatPathSegment(segment)

                return [
                  <BreadcrumbSeparator key={`${href}-sep`} />,
                  <BreadcrumbItem key={href}>
                    {isLast ? (
                      <BreadcrumbPage>{title}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink render={<Link href={href} />}>
                        {title}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>,
                ]
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-2">
          {/* Functional Command Search Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="h-8 w-48 justify-between text-xs text-muted-foreground font-normal px-2.5 border-border/60 bg-muted/30 hover:bg-muted/60"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Search className="size-3.5" />
              <span>Search Hinthar...</span>
            </span>
            <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border border-border bg-background px-1 text-[10px] font-medium opacity-100">
              <span>{isMac ? "⌘" : "Ctrl"}</span>K
            </kbd>
          </Button>

          <ThemeToggle />
        </div>
      </motion.header>

      <CommandSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
