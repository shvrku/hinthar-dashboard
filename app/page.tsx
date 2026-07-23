"use client"

import React from "react"
import Link from "next/link"
import {
  GraduationCap,
  Users,
  UserCheck,
  BookOpen,
  Clock,
  Calendar,
  ClipboardCheck,
  QrCode,
  ArrowRight,
} from "lucide-react"
import { StandardPageHeader } from "@/components/standard-page-header"
import { MetricCard } from "@/components/metric-card"
import { MetricContainer } from "@/components/metric-container"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const quickNavModules = [
  { title: "Classes", href: "/classes", description: "Manage academic cohorts & groups.", icon: GraduationCap },
  { title: "Students", href: "/students", description: "View student profiles & QR passes.", icon: Users },
  { title: "Teachers", href: "/teachers", description: "Manage faculty & teaching assignments.", icon: UserCheck },
  { title: "Subjects", href: "/subjects", description: "Curriculum courses & subject catalog.", icon: BookOpen },
  { title: "Sessions", href: "/sessions", description: "Class session schedules & timetable.", icon: Clock },
  { title: "Attendance", href: "/attendance", description: "Track attendance logs & cohorts.", icon: ClipboardCheck },
]

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      {/* Standardized Header */}
      <StandardPageHeader
        title="Hinthar Overview"
        description="Central operational management workspace for classes, faculty, students, and attendance."
        primaryAction={{
          label: "Open Check-In Terminal",
          onClick: () => (window.location.href = "/check-in/terminal"),
          icon: <QrCode className="size-4" />,
        }}
      />

      {/* Metric Highlight Container (Auto-layout grid, Total Count primary stat) */}
      <MetricContainer>
        <MetricCard
          title="Total Overview Count"
          value="6 Modules"
          icon={<GraduationCap className="size-4" />}
          description="Active core management sections"
        />
      </MetricContainer>

      {/* Operational Modules Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Management Modules</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickNavModules.map((item) => (
            <Card key={item.title} className="group relative overflow-hidden transition-all hover:border-foreground/30 hover:shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex size-9 items-center justify-center rounded-lg border bg-muted/50 text-foreground">
                    <item.icon className="size-4" />
                  </div>
                  <Button variant="ghost" size="icon-sm" render={<Link href={item.href} />}>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </div>
                <CardTitle className="mt-3 text-base">{item.title}</CardTitle>
                <CardDescription className="text-xs">{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link
                  href={item.href}
                  className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  Access Module <ArrowRight className="size-3" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
