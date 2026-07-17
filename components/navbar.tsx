"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserButton } from "@clerk/nextjs"

const managementItems: { title: string; href: string; description: string }[] = [
  {
    title: "Classes",
    href: "/classes",
    description: "Manage school classes, sections, and academic groups.",
  },
  {
    title: "Students",
    href: "/students",
    description: "View and manage student profiles and enrollments.",
  },
  {
    title: "Teachers",
    href: "/teachers",
    description: "Manage teacher profiles, assignments, and schedules.",
  },
  {
    title: "Sessions",
    href: "/sessions",
    description: "Schedule and manage class sessions and timetables.",
  },
]

const checkInItems: { title: string; href: string; description: string }[] = [
  {
    title: "Overview",
    href: "/check-in/overview",
    description: "View all students and their check-in status by cohort.",
  },
  {
    title: "Management",
    href: "/check-in/management",
    description: "View and manage student QR check-in codes.",
  },
  {
    title: "Terminal",
    href: "/check-in/terminal",
    description: "Scan QR codes to record student attendance.",
  },
]

const mobileNavItems: { title: string; children: { title: string; href: string }[] }[] = [
  {
    title: "Management",
    children: managementItems.map(({ title, href }) => ({ title, href })),
  },
  {
    title: "Check In",
    children: checkInItems.map(({ title, href }) => ({ title, href })),
  },
]

function ListItem({
  title,
  children,
  href,
}: {
  title: string
  children: React.ReactNode
  href: string
}) {
  return (
    <li>
      <NavigationMenuLink
        render={<Link href={href} />}
        className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted hover:text-accent-foreground focus:bg-muted focus:text-accent-foreground"
      >
        <div>
          <div className="mb-1 text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </div>
      </NavigationMenuLink>
    </li>
  )
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link href="/dashboard" className="mr-8 flex items-center gap-0.5">
          <span className="text-lg font-bold tracking-tight">Hinthar</span>
          <span className="text-lg font-medium tracking-tight text-muted-foreground">
            Dashboard
          </span>
        </Link>

        {/* Desktop navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Management</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-2 p-3 md:w-[450px] md:grid-cols-2 lg:w-[500px]">
                  {managementItems.map((item) => (
                    <ListItem
                      key={item.title}
                      title={item.title}
                      href={item.href}
                    >
                      {item.description}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Check In</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[300px] gap-2 p-3">
                  {checkInItems.map((item) => (
                    <ListItem
                      key={item.title}
                      title={item.title}
                      href={item.href}
                    >
                      {item.description}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex items-center gap-2">
          <UserButton />
          <ThemeToggle />
          {/* Hamburger button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex size-9 items-center justify-center rounded-md md:hidden transition-colors hover:bg-muted"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer panel */}
          <nav className="absolute left-0 right-0 top-14 z-50 border-b bg-background md:hidden">
            <div className="container mx-auto px-4 py-4">
              <ul className="space-y-3">
                {mobileNavItems.map((section) => (
                  <li key={section.title}>
                    <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.title}
                    </div>
                    <ul className="space-y-0.5">
                      {section.children.map((item) => (
                        <li key={item.title}>
                          <Link
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className="block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                          >
                            {item.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </>
      )}
    </header>
  )
}
