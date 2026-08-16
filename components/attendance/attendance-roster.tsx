"use client"

import {
  AlertTriangle,
  CalendarOff,
  CheckCircle2,
  Loader2,
  Search,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react"
import { SearchableSelect } from "@/components/searchable-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { attendanceHover, attendanceRowTint, attendanceSolid } from "@/lib/status-styles"
import type {
  AttendanceMatrixSession,
  AttendanceMatrixStudent,
  SessionAttendanceStatus,
} from "@/lib/types"
import {
  rosterSessionSelectItems,
  type AttendanceStatusRecord,
} from "@/components/attendance/attendance-shared"

const idleToggle = "border-border bg-background text-muted-foreground"

export function AttendanceRosterView({
  students,
  sessions,
  selectedSessionId,
  rosterSearch,
  loading,
  pendingCells,
  getAttendanceRecord,
  onSelectSessionId,
  onRosterSearchChange,
  onStatusChange,
  onBulkMark,
}: {
  students: AttendanceMatrixStudent[]
  sessions: AttendanceMatrixSession[]
  selectedSessionId: number | null
  rosterSearch: string
  loading: boolean
  pendingCells: Record<string, boolean>
  getAttendanceRecord: (studentId: number, sessionId: number) => AttendanceStatusRecord | undefined
  onSelectSessionId: (id: string | null) => void
  onRosterSearchChange: (value: string) => void
  onStatusChange: (studentId: number, sessionId: number, status: SessionAttendanceStatus) => void
  onBulkMark: (sessionId: number, status: "present" | "absent") => void
}) {
  const selectedSession = selectedSessionId
    ? sessions.find((s) => s.id === selectedSessionId) ?? null
    : null
  const query = rosterSearch.toLowerCase()
  const filteredStudents = students.filter((s) => s.name.toLowerCase().includes(query))
  const sessionItems = rosterSessionSelectItems(sessions)

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="size-5 text-primary" />
            Session Roster View
          </h2>
          <p className="text-xs text-muted-foreground">
            Target a single session and log attendance with 1-tap quick actions
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-64 sm:w-72">
            <SearchableSelect
              options={sessionItems}
              value={selectedSessionId?.toString() ?? ""}
              onValueChange={(val) => onSelectSessionId(val || null)}
              placeholder="Select Session Date…"
              searchPlaceholder="Search session date..."
            />
          </div>

          {selectedSession && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkMark(selectedSession.id, "present")}
                disabled={students.length === 0 || loading}
                className="h-9 text-xs font-semibold gap-1 text-attendance-present border-attendance-present/30 hover:bg-attendance-present/10 cursor-pointer"
              >
                <Sparkles className="size-3.5 text-attendance-present" />
                <span>Mark All Present</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkMark(selectedSession.id, "absent")}
                disabled={students.length === 0 || loading}
                className="h-9 text-xs font-semibold gap-1 text-attendance-absent border-attendance-absent/30 hover:bg-attendance-absent/10 cursor-pointer"
              >
                <XCircle className="size-3.5 text-attendance-absent" />
                <span>Mark All Absent</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {selectedSession ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter student roster..."
              value={rosterSearch}
              onChange={(e) => onRosterSearchChange(e.target.value)}
              className="pl-10 h-10 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredStudents.map((student) => {
              const record = getAttendanceRecord(student.id, selectedSession.id)
              const currentStatus = record?.status ?? "unmarked"
              const isPending = pendingCells[`${student.id}-${selectedSession.id}`]
              const rowTint =
                currentStatus === "present" ||
                currentStatus === "late" ||
                currentStatus === "absent" ||
                currentStatus === "excused"
                  ? attendanceRowTint[currentStatus]
                  : "bg-muted/30 border-border"

              return (
                <div
                  key={student.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${rowTint}`}
                >
                  <div className="grid gap-0.5">
                    <span className="font-semibold text-sm text-foreground">{student.name}</span>
                    <span className="text-[11px] text-muted-foreground">{student.unique_code ?? "No ID"}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onStatusChange(student.id, selectedSession.id, "present")}
                          className={`flex size-8 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                            currentStatus === "present"
                              ? attendanceSolid.present
                              : `${idleToggle} ${attendanceHover.present}`
                          }`}
                          title="Present"
                        >
                          <CheckCircle2 className="size-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onStatusChange(student.id, selectedSession.id, "late")}
                          className={`flex size-8 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                            currentStatus === "late"
                              ? attendanceSolid.late
                              : `${idleToggle} ${attendanceHover.late}`
                          }`}
                          title="Late"
                        >
                          <AlertTriangle className="size-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onStatusChange(student.id, selectedSession.id, "absent")}
                          className={`flex size-8 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                            currentStatus === "absent"
                              ? attendanceSolid.absent
                              : `${idleToggle} ${attendanceHover.absent}`
                          }`}
                          title="Absent"
                        >
                          <XCircle className="size-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onStatusChange(student.id, selectedSession.id, "excused")}
                          className={`flex size-8 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                            currentStatus === "excused"
                              ? attendanceSolid.excused
                              : `${idleToggle} ${attendanceHover.excused}`
                          }`}
                          title="Excused"
                        >
                          <CalendarOff className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground">
          <p>No session selected. Please select a session from the dropdown above.</p>
        </div>
      )}
    </div>
  )
}
