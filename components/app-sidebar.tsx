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
  UserCog,
  Link2,
  LogOut,
  LogIn,
  Repeat2,
  Undo2,
  Search,
  Settings,
  MoreVertical,
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
  useSidebar,
} from "@/components/ui/sidebar"
import { useCurrentUser } from "@/components/current-user-provider"
import { HintharMark } from "@/components/hinthar-mark"
import { canCheckIn, isAdmin, isStaffOrAbove } from "@/lib/roles"
import { Badge } from "@/components/ui/badge"
const overviewItems = [
  { title: "Dashboard", url: "/overview", icon: LayoutDashboard },
]

const managementItems = [
  { title: "Classes", url: "/classes", icon: GraduationCap },
  { title: "Teachers", url: "/teachers", icon: UserCheck },
  { title: "Students", url: "/students", icon: Users },
  { title: "Subjects", url: "/subjects", icon: BookOpen },
]

const operationsItems = [
  { title: "Sessions", url: "/sessions", icon: Clock },
  { title: "Find sessions", url: "/sessions/find", icon: Search },
  { title: "Timetables", url: "/timetable", icon: Calendar },
  { title: "Session Attendance", url: "/attendance", icon: ClipboardCheck },
]

const userSubItems = [
  { title: "Management", url: "/users/management", icon: UserCog },
  { title: "Match students", url: "/users/matching/students", icon: Link2 },
  { title: "Match teachers", url: "/users/matching/teachers", icon: Link2 },
]

function isUsersSectionPath(pathname: string) {
  return pathname === "/users" || pathname.startsWith("/users/")
}

function isUsersSubItemActive(pathname: string, url: string) {
  if (url === "/users/management") {
    return (
      pathname === "/users" ||
      pathname === "/users/" ||
      pathname === "/users/management" ||
      pathname === "/users/management/"
    )
  }
  if (url === "/users/matching/students") {
    return (
      pathname.startsWith("/users/matching/students") ||
      pathname === "/users/matching" ||
      pathname === "/users/matching/"
    )
  }
  if (url === "/users/matching/teachers") {
    return (
      pathname.startsWith("/users/matching/teachers") ||
      pathname.startsWith("/users/matching-teachers")
    )
  }
  return pathname === url || pathname === `${url}/` || pathname.startsWith(`${url}/`)
}

const checkInSubItemsStaff = [
  { title: "Overview", url: "/check-in/overview", icon: LayoutDashboard },
  { title: "Management", url: "/check-in/management", icon: QrCode },
  { title: "Corrections", url: "/check-in/corrections", icon: Undo2 },
  { title: "Terminal", url: "/check-in/terminal", icon: Monitor },
]

const checkInSubItemsTerminal = [
  { title: "Terminal", url: "/check-in/terminal", icon: Monitor },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { user, isSignedIn, isLoaded } = useUser()
  const { openUserProfile, signOut } = useClerk()
  const { role, user: account, loading: accountLoading } = useCurrentUser()
  const { isMobile, setOpenMobile } = useSidebar()
  const [checkInOpen, setCheckInOpen] = React.useState(() => pathname.startsWith("/check-in"))
  const [usersOpen, setUsersOpen] = React.useState(() => isUsersSectionPath(pathname))
  const checkInExpanded = pathname.startsWith("/check-in") || checkInOpen
  const usersExpanded = isUsersSectionPath(pathname) || usersOpen

  const showStaffNav = !accountLoading && isStaffOrAbove(role)
  const showAdminNav = !accountLoading && isAdmin(role)
  const showStudentNav = !accountLoading && role === "student"
  const showTeacherNav = !accountLoading && role === "teacher"
  const showTerminalNav = !accountLoading && canCheckIn(role) && !showStaffNav
  const checkInSubItems = showStaffNav ? checkInSubItemsStaff : checkInSubItemsTerminal
  const teacherHomeHref = account?.teacher_profile_id
    ? `/teachers/${account.teacher_profile_id}`
    : "/pending"
  const studentHomeHref = account?.student_profile_id
    ? `/students/${account.student_profile_id}`
    : "/pending"
  const homeHref = "/"

  const closeMobileSidebar = React.useCallback(() => {
    if (isMobile) setOpenMobile(false)
  }, [isMobile, setOpenMobile])

  const handleOpenAccount = React.useCallback(() => {
    closeMobileSidebar()
    // Let the sheet finish closing so Clerk's modal isn't trapped under it.
    window.setTimeout(() => openUserProfile(), isMobile ? 150 : 0)
  }, [closeMobileSidebar, isMobile, openUserProfile])

  React.useEffect(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [pathname, isMobile, setOpenMobile])

  const handleNavClick = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [isMobile, setOpenMobile])

  const userName = user?.fullName || user?.username || "User Account"
  const userEmail = user?.primaryEmailAddress?.emailAddress || ""
  const userAvatar = user?.imageUrl || ""

  // Free-plan account switching: end this session and return to sign-in.
  // True simultaneous account switching requires Clerk multi-session handling.
  const handleSwitchAccount = React.useCallback(() => {
    closeMobileSidebar()
    void signOut({ redirectUrl: "/sign-in/" })
  }, [closeMobileSidebar, signOut])

  const handleSignOut = React.useCallback(() => {
    closeMobileSidebar()
    void signOut({ redirectUrl: "/sign-in/" })
  }, [closeMobileSidebar, signOut])

  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
      {...props}
    >
      {/* Brand Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent" render={<Link href={homeHref} onClick={handleNavClick} />}>
              <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <HintharMark className="size-5" />
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
        {showStaffNav ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Overview</SidebarGroupLabel>
              <SidebarMenu>
                {overviewItems.map((item) => {
                  const isActive = pathname === item.url
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton tooltip={item.title} isActive={isActive} render={<Link href={item.url} onClick={handleNavClick} />}>
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarMenu>
                {managementItems.map((item) => {
                  const isActive = pathname === item.url
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton tooltip={item.title} isActive={isActive} render={<Link href={item.url} onClick={handleNavClick} />}>
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Operations</SidebarGroupLabel>
              <SidebarMenu>
                {operationsItems.map((item) => {
                  const isActive =
                    item.url === "/sessions"
                      ? pathname === "/sessions" || pathname === "/sessions/"
                      : pathname === item.url ||
                        pathname.startsWith(`${item.url}/`)
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton tooltip={item.title} isActive={isActive} render={<Link href={item.url} onClick={handleNavClick} />}>
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}

                <Collapsible
                  open={checkInExpanded}
                  onOpenChange={setCheckInOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton tooltip="Check-In">
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
                            <SidebarMenuSubButton isActive={pathname === sub.url || pathname === `${sub.url}/` || pathname.startsWith(`${sub.url}/`)} render={<Link href={sub.url} onClick={handleNavClick} />}>
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

            {showAdminNav ? (
              <SidebarGroup>
                <SidebarGroupLabel>Administration</SidebarGroupLabel>
                <SidebarMenu>
                  <Collapsible
                    open={usersExpanded}
                    onOpenChange={setUsersOpen}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger
                        render={
                          <SidebarMenuButton tooltip="Users">
                            <UserCog />
                            <span>Users</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        }
                      />
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {userSubItems.map((sub) => (
                            <SidebarMenuSubItem key={sub.title}>
                              <SidebarMenuSubButton
                                isActive={isUsersSubItemActive(pathname, sub.url)}
                                render={<Link href={sub.url} onClick={handleNavClick} />}
                              >
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
            ) : null}
          </>
        ) : showTeacherNav ? (
          <SidebarGroup>
            <SidebarGroupLabel>Teacher</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Home"
                  isActive={
                    pathname === teacherHomeHref ||
                    pathname === `${teacherHomeHref}/` ||
                    pathname.startsWith("/teachers/")
                  }
                  render={<Link href={teacherHomeHref} onClick={handleNavClick} />}
                >
                  <QrCode />
                  <span>Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        ) : showTerminalNav ? (
          <SidebarGroup>
            <SidebarGroupLabel>Check-In</SidebarGroupLabel>
            <SidebarMenu>
              {checkInSubItemsTerminal.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={pathname === item.url}
                    render={<Link href={item.url} onClick={handleNavClick} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ) : showStudentNav ? (
          <SidebarGroup>
            <SidebarGroupLabel>Student</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Home"
                  isActive={
                    pathname === studentHomeHref ||
                    pathname === `${studentHomeHref}/` ||
                    pathname.startsWith("/students/") ||
                    pathname === "/pending" ||
                    pathname === "/pending/"
                  }
                  render={<Link href={studentHomeHref} onClick={handleNavClick} />}
                >
                  <QrCode />
                  <span>Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        ) : role ? (
          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Role: <Badge variant="outline" className="ml-1 capitalize">{role}</Badge>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      {/* User Footer — sticky on mobile sheet so account/settings stay reachable */}
      <SidebarFooter className="mt-auto ">
        <SidebarMenu>
          <SidebarMenuItem>
            {isLoaded && isSignedIn && user ? (
              <DropdownMenu modal={isMobile}>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent"
                      tooltip="Account"
                    >
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src={userAvatar} alt={userName} />
                        <AvatarFallback className="rounded-lg">HT</AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{userName}</span>
                        <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                      </div>
                      <MoreVertical className="ml-auto size-4" />
                    </SidebarMenuButton>
                  }
                />
                <DropdownMenuContent
                  className="z-[100] w-64"
                  side={isMobile ? "top" : "right"}
                  align="end"
                  sideOffset={8}
                >
                  <DropdownMenuGroup>
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
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      render={
                        <Link
                          href="/settings"
                          onClick={() => {
                            closeMobileSidebar()
                          }}
                        />
                      }
                    >
                      <Settings className="mr-2 size-4 text-primary" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleOpenAccount} className="cursor-pointer">
                      <UserCog className="mr-2 size-4 text-primary" />
                      <span>Manage Account</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={handleSwitchAccount}
                      className="cursor-pointer"
                    >
                      <Repeat2 className="mr-2 size-4 text-primary" />
                      <span>Switch account</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 size-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton
                size="lg"
                render={<Link href="/sign-in" />}
                className="bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
                tooltip="Sign In"
              >
                <LogIn className="size-4" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="font-semibold text-foreground">Sign In</span>
                  <span className="text-xs text-muted-foreground">Log into account</span>
                </div>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
