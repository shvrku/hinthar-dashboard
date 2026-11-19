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
  Megaphone,
  CalendarDays,
  Settings2,
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
  Banknote,
  Layers,
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
import { cn } from "@/lib/utils"

const staffWorkspaces = [
  {
    title: "Overview",
    url: "/overview",
    icon: LayoutDashboard,
    isActive: (pathname: string) =>
      pathname === "/overview" || pathname.startsWith("/overview/"),
  },
  {
    title: "Check-In",
    url: "/check-in",
    icon: QrCode,
    isActive: (pathname: string) =>
      pathname === "/check-in" || pathname.startsWith("/check-in/"),
  },
  {
    title: "Attendance",
    url: "/attendance",
    icon: ClipboardCheck,
    isActive: (pathname: string) =>
      pathname === "/attendance" || pathname.startsWith("/attendance/"),
  },
  {
    title: "Schedule",
    url: "/schedule",
    icon: Calendar,
    isActive: (pathname: string) =>
      pathname === "/schedule" ||
      pathname.startsWith("/schedule/") ||
      pathname === "/timetable" ||
      pathname.startsWith("/timetable/") ||
      pathname === "/sessions" ||
      pathname.startsWith("/sessions/"),
  },
  {
    title: "Academics",
    url: "/academics",
    icon: GraduationCap,
    isActive: (pathname: string) =>
      pathname === "/academics" || pathname.startsWith("/academics/"),
  },
  {
    title: "Cohorts & Classes",
    url: "/classes",
    icon: Layers,
    isActive: (pathname: string) =>
      pathname === "/classes" ||
      pathname.startsWith("/classes/") ||
      pathname === "/subjects" ||
      pathname.startsWith("/subjects/"),
  },
  {
    title: "Payroll",
    url: "/payroll",
    icon: Banknote,
    isActive: (pathname: string) =>
      pathname === "/payroll" || pathname.startsWith("/payroll/"),
  },
  {
    title: "Directory",
    url: "/students",
    icon: Users,
    isActive: (pathname: string) =>
      pathname === "/students" ||
      pathname.startsWith("/students/") ||
      pathname === "/teachers" ||
      pathname.startsWith("/teachers/"),
  },
  {
    title: "Communications",
    url: "/communications",
    icon: Megaphone,
    isActive: (pathname: string) =>
      pathname === "/communications" ||
      pathname.startsWith("/communications/") ||
      pathname === "/announcements" ||
      pathname.startsWith("/announcements/") ||
      pathname === "/events" ||
      pathname.startsWith("/events/"),
  },
]

const schoolItems = [
  { title: "Announcements", url: "/announcements", icon: Megaphone },
  { title: "Events", url: "/events", icon: CalendarDays },
]

const userSubItems = [
  { title: "Management", url: "/users/management", icon: UserCog },
  { title: "Match students", url: "/users/matching/students", icon: Link2 },
  { title: "Match teachers", url: "/users/matching/teachers", icon: Link2 },
  { title: "Match parents", url: "/users/matching/parents", icon: Link2 },
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
      pathname === "/users/management/" ||
      pathname.startsWith("/users/deactivated")
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
  if (url === "/users/matching/parents") {
    return (
      pathname.startsWith("/users/matching/parents") ||
      pathname.startsWith("/users/matching-parents")
    )
  }
  return pathname === url || pathname === `${url}/` || pathname.startsWith(`${url}/`)
}

const checkInSubItemsTerminal = [
  { title: "Terminal", url: "/check-in/terminal", icon: Monitor },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { user, isSignedIn, isLoaded } = useUser()
  const { openUserProfile, signOut } = useClerk()
  const { role, user: account, loading: accountLoading } = useCurrentUser()
  const { isMobile, setOpenMobile } = useSidebar()
  const [usersOpen, setUsersOpen] = React.useState(() => isUsersSectionPath(pathname))
  const usersExpanded = isUsersSectionPath(pathname) || usersOpen

  const accountLocked = !accountLoading && account?.is_active === false
  const showStaffNav = !accountLocked && !accountLoading && isStaffOrAbove(role)
  const showAdminNav = !accountLocked && !accountLoading && isAdmin(role)
  const showStudentNav = !accountLocked && !accountLoading && role === "student"
  const showParentNav = !accountLocked && !accountLoading && role === "parent"
  const showTeacherNav = !accountLocked && !accountLoading && role === "teacher"
  const showTerminalNav = !accountLocked && !accountLoading && canCheckIn(role) && !showStaffNav
  const unmatchedStudent = role === "student" && account?.student_profile_id == null
  const unmatchedTeacher = role === "teacher" && account?.teacher_profile_id == null
  const waitingForLink = role === "pending" || unmatchedStudent || unmatchedTeacher
  const teacherHomeHref = account?.teacher_profile_id
    ? `/teachers/${account.teacher_profile_id}`
    : "/pending"
  const studentHomeHref = account?.student_profile_id
    ? `/students/${account.student_profile_id}`
    : "/pending"
  const homeHref = accountLocked
    ? "/account-locked"
    : role === "parent"
      ? "/academics"
      : "/"

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
      variant="sidebar"
      className="border-r border-border"
      {...props}
    >
      {/* Brand Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent rounded-sm" render={<Link href={homeHref} onClick={handleNavClick} />}>
              <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-sm bg-sidebar-primary text-sidebar-primary-foreground">
                <HintharMark className="size-5" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-foreground">Hinthar</span>
                <span className="truncate text-xs text-muted-foreground font-medium">Systems</span>
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
              <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Workspaces</SidebarGroupLabel>
              <SidebarMenu>
                {staffWorkspaces.map((item) => {
                  const active = item.isActive(pathname)
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={active}
                        render={<Link href={item.url} onClick={handleNavClick} />}
                        className={cn(
                          "rounded-sm transition-colors",
                          active && "font-semibold bg-sidebar-accent text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>

            {showAdminNav ? (
              <SidebarGroup>
                <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Administration</SidebarGroupLabel>
                <SidebarMenu>
                  <Collapsible
                    open={usersExpanded}
                    onOpenChange={setUsersOpen}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger
                        render={
                          <SidebarMenuButton tooltip="Users" className="rounded-sm">
                            <UserCog className="size-4" />
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
                                className="rounded-sm"
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Exam Results"
                  isActive={pathname === "/academics/parent" || pathname.startsWith("/academics/parent/")}
                  render={<Link href="/academics/parent" onClick={handleNavClick} />}
                >
                  <GraduationCap />
                  <span>Exam Results</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {schoolItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}
                    render={<Link href={item.url} onClick={handleNavClick} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ) : showParentNav ? (
          <SidebarGroup>
            <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Parent Portal
            </SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Exam Results & Schedule"
                  isActive={pathname === "/academics" || pathname.startsWith("/academics/")}
                  render={<Link href="/academics" onClick={handleNavClick} />}
                  className={cn(
                    "rounded-sm transition-colors",
                    (pathname === "/academics" || pathname.startsWith("/academics/")) &&
                      "font-semibold bg-sidebar-accent text-sidebar-accent-foreground"
                  )}
                >
                  <GraduationCap className="size-4" />
                  <span>Parent Portal</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
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
              {schoolItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}
                    render={<Link href={item.url} onClick={handleNavClick} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
        ) : accountLocked || role ? (
          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarMenu>
              {!accountLocked && waitingForLink ? (
                <>
                  {schoolItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}
                        render={<Link href={item.url} onClick={handleNavClick} />}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Waiting for link"
                      isActive={pathname === "/pending"}
                      render={<Link href="/pending" onClick={handleNavClick} />}
                    >
                      <Link2 />
                      <span>Waiting for link</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              ) : null}
              <SidebarMenuItem>
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  {accountLocked ? (
                    <>Status: <Badge variant="outline" className="ml-1">Deactivated</Badge></>
                  ) : (
                    <>Role: <Badge variant="outline" className="ml-1 capitalize">{role}</Badge></>
                  )}
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
                      className="data-[state=open]:bg-sidebar-accent rounded-sm"
                      tooltip="Account"
                    >
                      <Avatar className="h-8 w-8 rounded-sm">
                        <AvatarImage src={userAvatar} alt={userName} />
                        <AvatarFallback className="rounded-sm">HT</AvatarFallback>
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
                  className="z-[100] w-64 rounded-sm"
                  side={isMobile ? "top" : "right"}
                  align="end"
                  sideOffset={8}
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="p-0 font-normal">
                      <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <Avatar className="h-8 w-8 rounded-sm">
                          <AvatarImage src={userAvatar} alt={userName} />
                          <AvatarFallback className="rounded-sm">HT</AvatarFallback>
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
