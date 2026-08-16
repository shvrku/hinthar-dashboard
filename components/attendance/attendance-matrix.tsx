"use client"

import { ChevronDown, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  AttendanceMatrixSession,
  AttendanceMatrixStudent,
  SessionAttendanceStatus,
} from "@/lib/types"
import {
  ATTENDANCE_STATUS_ITEMS,
  formatSessionMeta,
  getAttendanceSelectStyles,
  type AttendanceStatusRecord,
} from "@/components/attendance/attendance-shared"

export function AttendanceMatrixView({
  students,
  sessions,
  loading,
  pendingCells,
  editingCellKey,
  emptyMessage,
  getAttendanceRecord,
  onEditingCellKeyChange,
  onStatusChange,
}: {
  students: AttendanceMatrixStudent[]
  sessions: AttendanceMatrixSession[]
  loading: boolean
  pendingCells: Record<string, boolean>
  editingCellKey: string | null
  emptyMessage: string
  getAttendanceRecord: (studentId: number, sessionId: number) => AttendanceStatusRecord | undefined
  onEditingCellKeyChange: (key: string | null) => void
  onStatusChange: (studentId: number, sessionId: number, status: SessionAttendanceStatus) => void
}) {
  return (
    <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
      <div className="overflow-x-auto hinthar-scrollbar">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="sticky left-0 z-20 w-56 font-bold text-foreground text-xs uppercase tracking-wider bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                Student Name
              </TableHead>
              {sessions.map((session) => {
                const { subject, teacher, dateStr, timeStr } = formatSessionMeta(session)

                return (
                  <TableHead key={session.id} className="min-w-40 text-center text-xs">
                    <div className="flex flex-col items-center gap-0.5 py-1">
                      <span
                        className="max-w-[9.5rem] truncate font-semibold text-foreground leading-tight"
                        title={subject}
                      >
                        {subject}
                      </span>
                      <span
                        className="max-w-[9.5rem] truncate text-[10px] text-muted-foreground"
                        title={teacher}
                      >
                        {teacher}
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground">{dateStr}</span>
                      <span className="text-[10px] text-muted-foreground/80">{timeStr}</span>
                    </div>
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="sticky left-0 z-10 w-56 bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                  </TableCell>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="mx-auto h-8 w-24 animate-pulse rounded-lg bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={sessions.length + 1} className="h-36 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="sticky left-0 z-10 w-56 font-semibold text-foreground text-xs bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div className="flex flex-col">
                      <span>{student.name}</span>
                      <span className="text-[10px] font-normal text-muted-foreground">{student.unique_code ?? "No ID"}</span>
                    </div>
                  </TableCell>

                  {sessions.map((session) => {
                    const record = getAttendanceRecord(student.id, session.id)
                    const key = `${student.id}-${session.id}`
                    const isPending = pendingCells[key]
                    const isEditing = editingCellKey === key

                    return (
                      <TableCell key={session.id} className="text-center p-2">
                        {isPending ? (
                          <div className="flex h-9 items-center justify-center">
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : isEditing ? (
                          <Select
                            value={record?.status ?? undefined}
                            defaultOpen={true}
                            onOpenChange={(open) => {
                              if (!open) onEditingCellKeyChange(null)
                            }}
                            onValueChange={(val) => {
                              onEditingCellKeyChange(null)
                              if (val) {
                                onStatusChange(student.id, session.id, val as SessionAttendanceStatus)
                              }
                            }}
                          >
                            <SelectTrigger
                              className={`mx-auto flex h-9 w-28 items-center justify-between rounded-lg border px-2 py-1 text-xs font-semibold shadow-xs transition-all outline-hidden focus:ring-2 focus:ring-offset-2 ${getAttendanceSelectStyles(record?.status ?? undefined)}`}
                              size="sm"
                            >
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent align="center" className="min-w-28">
                              <SelectItem value="present" className="text-attendance-present font-semibold">Present</SelectItem>
                              <SelectItem value="late" className="text-attendance-late font-semibold">Late</SelectItem>
                              <SelectItem value="absent" className="text-attendance-absent font-semibold">Absent</SelectItem>
                              <SelectItem value="excused" className="text-attendance-excused font-semibold">Excused</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onEditingCellKeyChange(key)}
                            className={`mx-auto flex h-9 w-28 items-center justify-between rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-2xs transition-all cursor-pointer hover:scale-105 active:scale-95 ${getAttendanceSelectStyles(record?.status ?? undefined)}`}
                          >
                            <span>
                              {record?.status
                                ? (ATTENDANCE_STATUS_ITEMS.find((st) => st.value === record.status)?.label ?? record.status)
                                : "—"}
                            </span>
                            <ChevronDown className="size-3 opacity-60" />
                          </button>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
