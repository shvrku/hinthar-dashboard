"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  GraduationCap,
  Users,
  UserCheck,
  BookOpen,
  Clock,
  Calendar,
  ClipboardCheck,
  QrCode,
  Search,
  LayoutDashboard,
  Monitor,
  Palette,
  Link2,
  type LucideIcon,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { useCurrentUser } from "@/components/current-user-provider"
import { isAdmin, isStaffOrAbove } from "@/lib/roles"

type NavigationItem = {
  title: string
  href: string
  group: string
  icon: LucideIcon
  /** When true, only admins see this row in search (not in the sidebar). */
  adminOnly?: boolean
  /** When true, only student-role accounts see this row. */
  studentOnly?: boolean
  /** When true, only teacher-role accounts see this row. */
  teacherOnly?: boolean
  keywords?: string[]
}

const navigationItems: NavigationItem[] = [
  { title: "Dashboard", href: "/overview", group: "Overview", icon: LayoutDashboard },
  { title: "Classes Roster", href: "/classes", group: "Management", icon: GraduationCap },
  { title: "Student Directory", href: "/students", group: "Management", icon: Users },
  { title: "Teacher Faculty", href: "/teachers", group: "Management", icon: UserCheck },
  { title: "Subjects Catalog", href: "/subjects", group: "Management", icon: BookOpen },
  { title: "Sessions Schedule", href: "/sessions", group: "Operations", icon: Clock },
  { title: "Find Sessions", href: "/sessions/find", group: "Operations", icon: Search },
  { title: "Class Timetables", href: "/timetable", group: "Operations", icon: Calendar },
  { title: "Attendance Logs", href: "/attendance", group: "Operations", icon: ClipboardCheck },
  { title: "Check-In Overview", href: "/check-in/overview", group: "Operations", icon: LayoutDashboard },
  { title: "Check-In Management", href: "/check-in/management", group: "Operations", icon: QrCode },
  { title: "Check-In Terminal", href: "/check-in/terminal", group: "Operations", icon: Monitor },
  {
    title: "User Management",
    href: "/users/management",
    group: "Administration",
    icon: Users,
    adminOnly: true,
    keywords: ["users", "roles", "accounts", "permissions", "admin"],
  },
  {
    title: "Match students",
    href: "/users/matching/students",
    group: "Administration",
    icon: Link2,
    adminOnly: true,
    keywords: ["link", "account", "matching", "portal"],
  },
  {
    title: "Match teachers",
    href: "/users/matching/teachers",
    group: "Administration",
    icon: Link2,
    adminOnly: true,
    keywords: ["link", "teacher", "account", "matching", "portal"],
  },
  {
    title: "Design System",
    href: "/design-system",
    group: "Administration",
    icon: Palette,
    adminOnly: true,
    keywords: ["tokens", "theme", "standards", "components", "motion", "ui"],
  },
  {
    title: "My QR and attendance",
    href: "/",
    group: "Student",
    icon: QrCode,
    studentOnly: true,
    keywords: ["qr", "stats", "attendance", "check-in", "hub"],
  },
  {
    title: "My Teacher Hub",
    href: "/",
    group: "Teacher",
    icon: UserCheck,
    teacherOnly: true,
    keywords: ["teacher", "profile", "hub", "attendance", "sessions"],
  },
]

interface CommandSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandSearchDialog({ open, onOpenChange }: CommandSearchDialogProps) {
  const router = useRouter()
  const { role } = useCurrentUser()

  const visibleItems = React.useMemo(() => {
    if (role === "student") {
      return navigationItems.filter((item) => item.studentOnly)
    }
    if (role === "teacher") {
      return navigationItems.filter((item) => item.teacherOnly)
    }
    if (!isStaffOrAbove(role)) {
      return []
    }
    const admin = isAdmin(role)
    return navigationItems.filter(
      (item) => !item.studentOnly && !item.teacherOnly && (!item.adminOnly || admin)
    )
  }, [role])

  const groupedItems = React.useMemo(() => {
    const groups = new Map<string, NavigationItem[]>()
    for (const item of visibleItems) {
      const list = groups.get(item.group) ?? []
      list.push(item)
      groups.set(item.group, list)
    }
    return Array.from(groups.entries())
  }, [visibleItems])

  const runCommand = React.useCallback(
    (href: string) => {
      onOpenChange(false)
      router.push(href)
    },
    [onOpenChange, router]
  )

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search Hinthar"
      description="Search modules, management, check-in, and admin tools."
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No matching Hinthar module found.</CommandEmpty>
        {groupedItems.map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.title} ${item.group} ${item.href} ${item.keywords?.join(" ") ?? ""}`}
                keywords={item.keywords}
                onSelect={() => runCommand(item.href)}
              >
                <item.icon />
                <span>{item.title}</span>
                <CommandShortcut className="tracking-normal">
                  <Badge variant="secondary" className="text-[10px] font-medium">
                    {item.group}
                  </Badge>
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
