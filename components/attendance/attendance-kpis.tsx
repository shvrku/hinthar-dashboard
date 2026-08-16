"use client"

import { CheckCircle2, Percent, Users, XCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { AttendanceKpiStats } from "@/components/attendance/attendance-shared"

export function AttendanceKpis({ stats }: { stats: AttendanceKpiStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <Card className="p-4 bg-card border-border/80 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Students</span>
          <Users className="size-4 text-primary" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-foreground">{stats.totalStudents}</span>
          <span className="text-[11px] text-muted-foreground">{stats.totalSessions} Sessions</span>
        </div>
      </Card>

      <Card className="p-4 bg-card border-border/80 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-attendance-present uppercase tracking-wider">Present</span>
          <CheckCircle2 className="size-4 text-attendance-present" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-attendance-present">{stats.presentCount}</span>
          <span className="text-[11px] text-muted-foreground">{stats.lateCount} Late</span>
        </div>
      </Card>

      <Card className="p-4 bg-card border-border/80 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-attendance-absent uppercase tracking-wider">Absent</span>
          <XCircle className="size-4 text-attendance-absent" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-attendance-absent">{stats.absentCount}</span>
          <span className="text-[11px] text-muted-foreground">{stats.excusedCount} Excused</span>
        </div>
      </Card>

      <Card className="p-4 bg-card border-border/80 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attendance Rate</span>
          <Percent className="size-4 text-primary" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-foreground">{stats.attendanceRate}%</span>
          <span className="text-[11px] text-muted-foreground">Average</span>
        </div>
      </Card>
    </div>
  )
}
