"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser, useClerk } from "@clerk/nextjs"
import {
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
  ChevronsUpDown,
  UserCog,
  LogOut,
  BadgeCheck,
  Bell,
  School,
  LifeBuoy,
  Send,
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

const overviewItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
]

const managementItems = [
  { title: "Classes", url: "/classes", icon: GraduationCap },
  { title: "Teachers", url: "/teachers", icon: UserCheck },
  { title: "Students", url: "/students", icon: Users },
  { title: "Subjects", url: "/subjects", icon: BookOpen },
]

const operationsItems = [
  { title: "Sessions", url: "/sessions", icon: Clock },
  { title: "Timetables", url: "/timetable", icon: Calendar },
  { title: "Attendance Matrix", url: "/attendance", icon: ClipboardCheck },
]

const checkInSubItems = [
  { title: "Overview", url: "/check-in/overview", icon: LayoutDashboard },
  { title: "Management", url: "/check-in/management", icon: QrCode },
  { title: "Terminal", url: "/check-in/terminal", icon: Monitor },
]

const secondaryItems = [
  { title: "Support", url: "#", icon: LifeBuoy },
  { title: "Feedback", url: "#", icon: Send },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { user } = useUser()
  const { openUserProfile, signOut } = useClerk()
  const [checkInOpen, setCheckInOpen] = React.useState(() => pathname.startsWith("/check-in"))

  React.useEffect(() => {
    if (pathname.startsWith("/check-in")) {
      setCheckInOpen(true)
    }
  }, [pathname])

  const userName = user?.fullName || user?.username || "User Account"
  const userEmail = user?.primaryEmailAddress?.emailAddress || ""
  const userAvatar = user?.imageUrl || ""

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      {/* Brand Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent" render={<Link href="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold">
                <School className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-foreground">Hinthar</span>
                <span className="truncate text-xs text-muted-foreground font-medium">Management</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent>
        {/* Overview Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarMenu>
            {overviewItems.map((item) => {
              const isActive = pathname === item.url
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton tooltip={item.title} isActive={isActive} render={<Link href={item.url} />}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Management Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarMenu>
            {managementItems.map((item) => {
              const isActive = pathname === item.url
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton tooltip={item.title} isActive={isActive} render={<Link href={item.url} />}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Operations Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarMenu>
            {operationsItems.map((item) => {
              const isActive = pathname === item.url
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton tooltip={item.title} isActive={isActive} render={<Link href={item.url} />}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}

            {/* Check-In Collapsible Dropdown Group */}
            <Collapsible
              open={checkInOpen}
              onOpenChange={setCheckInOpen}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger
                  render={
                    <SidebarMenuButton tooltip="Check-In" isActive={pathname.startsWith("/check-in")}>
                      <QrCode />
                      <span>Check-In</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  }
                />
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {checkInSubItems.map((sub) => (
                      <SidebarMenuSubItem key={sub.title}>
                        <SidebarMenuSubButton isActive={pathname === sub.url} render={<Link href={sub.url} />}>
                          <sub.icon className="size-3.5" />
                          <span>{sub.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>

        {/* Secondary Links */}
        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            {secondaryItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton render={<Link href={item.url} />} size="sm">
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={userAvatar} alt={userName} />
                      <AvatarFallback className="rounded-lg">HT</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{userName}</span>
                      <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent className="w-56" side="right" align="end" sideOffset={4}>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={userAvatar} alt={userName} />
                      <AvatarFallback className="rounded-lg">HT</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{userName}</span>
                      <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => openUserProfile()} className="cursor-pointer">
                    <UserCog className="mr-2 size-4 text-primary" />
                    <span>Manage Account</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 size-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
