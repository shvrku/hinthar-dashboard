"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import {
  Menu,
  X,
  GraduationCap,
  Users,
  UserCheck,
  BookOpen,
  Calendar,
  Clock,
  ClipboardCheck,
  QrCode,
  Monitor,
  LayoutDashboard,
  ChevronRight,
  Sparkles,
} from "lucide-react"
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
import { useFocusMode } from "@/components/focus-context"

const managementItems = [
  {
    title: "Classes",
    href: "/classes",
    description: "Manage school classes, sections, and academic groups.",
    icon: GraduationCap,
  },
  {
    title: "Students",
    href: "/students",
    description: "View and manage student profiles and enrollments.",
    icon: Users,
  },
  {
    title: "Teachers",
    href: "/teachers",
    description: "Manage teacher profiles, assignments, and schedules.",
    icon: UserCheck,
  },
  {
    title: "Subjects",
    href: "/subjects",
    description: "Manage curriculum subjects and course offerings.",
    icon: BookOpen,
  },
  {
    title: "Sessions",
    href: "/sessions",
    description: "Schedule and manage class sessions and timetables.",
    icon: Clock,
  },
  {
    title: "Timetable",
    href: "/timetable",
    description: "View and manage class timetables.",
    icon: Calendar,
  },
  {
    title: "Attendance",
    href: "/attendance",
    description: "Track and manage student session attendance.",
    icon: ClipboardCheck,
  },
]

const checkInItems = [
  {
    title: "Overview",
    href: "/check-in/overview",
    description: "View all students and their check-in status by cohort.",
    icon: LayoutDashboard,
  },
  {
    title: "Management",
    href: "/check-in/management",
    description: "View and manage student QR check-in codes.",
    icon: QrCode,
  },
  {
    title: "Terminal",
    href: "/check-in/terminal",
    description: "Scan QR codes to record student attendance.",
    icon: Monitor,
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
        className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-all duration-200 hover:bg-muted hover:text-accent-foreground focus:bg-muted hover:translate-x-0.5"
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
  const { isFocused } = useFocusMode()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent background scrolling when full-screen mobile menu is active
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  // Close mobile menu automatically on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <>
      <AnimatePresence initial={false}>
        {!isFocused && (
          <motion.header
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-md overflow-hidden"
          >
            <div className="container mx-auto flex h-14 items-center px-4">
              {/* Split brand logo & dashboard links */}
              <div className="mr-8 flex items-center gap-1.5">
                <Link
                  href="/"
                  className="flex items-center gap-1.5 group/logo hover:opacity-95 transition-opacity"
                  title="Go to Home"
                >
                  <motion.div
                    whileHover={{ scale: 1.08, rotate: 3 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-sm"
                  >
                    H
                  </motion.div>
                  <span className="text-lg font-bold tracking-tight text-foreground group-hover/logo:text-primary transition-colors">
                    Hinthar
                  </span>
                </Link>
                <span className="text-muted-foreground/40 font-light select-none">/</span>
                <Link
                  href="/dashboard"
                  className={`text-lg font-medium tracking-tight transition-colors hover:text-foreground ${
                    pathname === "/dashboard" ? "text-foreground font-semibold" : "text-muted-foreground"
                  }`}
                  title="Go to Dashboard Stats"
                >
                  Dashboard
                </Link>
              </div>

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

                {/* Hamburger toggle button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-border/80 bg-background md:hidden transition-colors hover:bg-muted focus-visible:outline-none"
                  aria-label={mobileOpen ? "Close menu" : "Open menu"}
                >
                  {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                </motion.button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Full-Screen Mobile Navigation Overlay mounted to document.body via Portal */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="fixed inset-0 z-[100] flex flex-col bg-background text-foreground md:hidden overflow-hidden"
              >
                {/* Overlay Header */}
                <div className="flex h-14 items-center justify-between px-4 border-b shrink-0 bg-background/95 backdrop-blur-md">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href="/"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-1.5"
                    >
                      <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                        H
                      </div>
                      <span className="text-lg font-bold tracking-tight">Hinthar</span>
                    </Link>
                    <span className="text-muted-foreground/40 font-light select-none">/</span>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Dashboard
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setMobileOpen(false)}
                      className="flex size-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent"
                      aria-label="Close menu"
                    >
                      <X className="size-5" />
                    </motion.button>
                  </div>
                </div>

                {/* Menu Body */}
                <div className="flex-1 px-5 py-6 space-y-8 overflow-y-auto">
                  {/* Management Section */}
                  <motion.section
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.25 }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="size-4 text-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Management System
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {managementItems.map((item, idx) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                          <motion.div
                            key={item.title}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.06 + idx * 0.03, duration: 0.2 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Link
                              href={item.href}
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                isActive
                                  ? "bg-primary/10 border-primary/40 text-primary font-medium"
                                  : "bg-card border-border hover:bg-muted/80 text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-3.5">
                                <div
                                  className={`flex size-9 items-center justify-center rounded-lg ${
                                    isActive
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  <Icon className="size-4" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold leading-tight">{item.title}</div>
                                  <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                    {item.description}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                            </Link>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.section>

                  {/* Check In Section */}
                  <motion.section
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.25 }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <QrCode className="size-4 text-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Attendance & Check In
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {checkInItems.map((item, idx) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                          <motion.div
                            key={item.title}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.22 + idx * 0.04, duration: 0.2 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Link
                              href={item.href}
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                isActive
                                  ? "bg-primary/10 border-primary/40 text-primary font-medium"
                                  : "bg-card border-border hover:bg-muted/80 text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-3.5">
                                <div
                                  className={`flex size-9 items-center justify-center rounded-lg ${
                                    isActive
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  <Icon className="size-4" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold leading-tight">{item.title}</div>
                                  <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                    {item.description}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                            </Link>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.section>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}
