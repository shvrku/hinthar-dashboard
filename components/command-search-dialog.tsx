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
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const navigationItems = [
  { title: "Dashboard", href: "/", group: "Overview", icon: LayoutDashboard },
  { title: "Classes Roster", href: "/classes", group: "Management", icon: GraduationCap },
  { title: "Student Directory", href: "/students", group: "Management", icon: Users },
  { title: "Teacher Faculty", href: "/teachers", group: "Management", icon: UserCheck },
  { title: "Subjects Catalog", href: "/subjects", group: "Management", icon: BookOpen },
  { title: "Sessions Schedule", href: "/sessions", group: "Operations", icon: Clock },
  { title: "Class Timetables", href: "/timetable", group: "Operations", icon: Calendar },
  { title: "Attendance Logs", href: "/attendance", group: "Operations", icon: ClipboardCheck },
  { title: "Check-In Overview", href: "/check-in/overview", group: "Operations", icon: LayoutDashboard },
  { title: "Check-In Management", href: "/check-in/management", group: "Operations", icon: QrCode },
  { title: "Check-In Terminal", href: "/check-in/terminal", group: "Operations", icon: Monitor },
]

interface CommandSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandSearchDialog({ open, onOpenChange }: CommandSearchDialogProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")

  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return navigationItems
    const q = query.toLowerCase().trim()
    return navigationItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.href.toLowerCase().includes(q)
    )
  }, [query])

  const handleSelect = (href: string) => {
    onOpenChange(false)
    setQuery("")
    router.push(href)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="p-0 sm:max-w-lg overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border/50">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" />
            <span>Search Hinthar</span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-3">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search modules, management, check-in..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10 text-sm"
              autoFocus
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
            {filteredItems.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No matching Hinthar module found.
              </p>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => handleSelect(item.href)}
                  className="w-full flex items-center justify-between rounded-lg p-2.5 text-left text-xs hover:bg-muted/70 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-md border bg-background text-foreground group-hover:border-foreground/30">
                      <item.icon className="size-3.5" />
                    </div>
                    <span className="font-medium text-foreground">{item.title}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {item.group}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
