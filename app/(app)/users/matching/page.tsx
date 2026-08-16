"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Link2, Loader2, Search, Unlink } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { Student, User } from "@/lib/types"
import { RequireRole } from "@/components/require-role"
import { StandardPageHeader, buildReloadAction } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { AnimatedTableBody } from "@/components/animation/animated-table-body"
import { TableRevealProvider } from "@/components/animation/table-reveal-context"
import { TableSkeletonRows } from "@/components/page-skeletons"
import { SearchableSelect } from "@/components/searchable-select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const LINKABLE_ROLES = new Set(["pending", "student"])

function isLinkableUser(user: User) {
  return LINKABLE_ROLES.has(user.role) && !user.teacher_profile_id && !user.staff_profile_id
}

function MatchingContent() {
  const { getToken } = useAuth()
  const [unmatchedUsers, setUnmatchedUsers] = React.useState<User[]>([])
  const [unmatchedStudents, setUnmatchedStudents] = React.useState<Student[]>([])
  const [linkedUsers, setLinkedUsers] = React.useState<User[]>([])
  const [linkedByUserId, setLinkedByUserId] = React.useState<Map<number, Student>>(new Map())
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)
  const [accountQuery, setAccountQuery] = React.useState("")
  const [linkedQuery, setLinkedQuery] = React.useState("")
  const [selectedStudentByUser, setSelectedStudentByUser] = React.useState<Record<number, string>>({})
  const [linkingUserId, setLinkingUserId] = React.useState<number | null>(null)
  const [unlinkingStudentId, setUnlinkingStudentId] = React.useState<number | null>(null)
  const [unlinkTarget, setUnlinkTarget] = React.useState<{ user: User; student: Student } | null>(null)

  const flashSuccess = React.useCallback((msg: string) => {
    setSuccess(msg)
    window.setTimeout(() => setSuccess(null), 3500)
  }, [])

  const load = React.useCallback(async () => {
    const token = await getToken()
    if (!token) return
    const api = createApi(token)
    const [usersUnlinked, studentsUnlinked, usersLinked, studentsLinked] = await Promise.all([
      api.listUsers({ linked: "false", linkable: "true" }),
      api.listStudents({ linked: "false" }),
      api.listUsers({ linked: "true" }),
      api.listStudents({ linked: "true" }),
    ])
    setUnmatchedUsers(usersUnlinked.filter(isLinkableUser))
    setUnmatchedStudents(studentsUnlinked)
    setLinkedUsers(usersLinked)
    const map = new Map<number, Student>()
    for (const student of studentsLinked) {
      if (student.user_id != null) map.set(student.user_id, student)
    }
    setLinkedByUserId(map)
  }, [getToken])

  const reload = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await load()
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : "Failed to load matching data")
    } finally {
      setLoading(false)
    }
  }, [load])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    void reload()
  }, [reload])

  const studentOptions = React.useMemo(
    () =>
      unmatchedStudents.map((student) => ({
        value: String(student.id),
        label: student.name,
        subLabel: [student.unique_code, ...(student.class_labels ?? [])].filter(Boolean).join(" · "),
      })),
    [unmatchedStudents]
  )

  const filteredUnmatchedUsers = React.useMemo(() => {
    const q = accountQuery.trim().toLowerCase()
    if (!q) return unmatchedUsers
    return unmatchedUsers.filter((user) => {
      const haystack = `${user.email} ${user.username} ${user.clerk_id}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [unmatchedUsers, accountQuery])

  const filteredLinkedUsers = React.useMemo(() => {
    const q = linkedQuery.trim().toLowerCase()
    if (!q) return linkedUsers
    return linkedUsers.filter((user) => {
      const student = linkedByUserId.get(user.id)
      const haystack = `${user.email} ${user.username} ${student?.name ?? ""} ${student?.unique_code ?? ""}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [linkedUsers, linkedByUserId, linkedQuery])

  const handleLink = async (user: User) => {
    const studentId = Number(selectedStudentByUser[user.id])
    if (!Number.isFinite(studentId)) return
    setLinkingUserId(user.id)
    setError(null)
    try {
      const token = await getToken()
      if (!token) return
      const student = unmatchedStudents.find((s) => s.id === studentId)
      await createApi(token).linkStudentUser(studentId, user.id)
      setSelectedStudentByUser((prev) => {
        const next = { ...prev }
        delete next[user.id]
        return next
      })
      flashSuccess(`Linked ${user.email || user.username} to ${student?.name ?? "student"}.`)
      await load()
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : "Failed to link account")
    } finally {
      setLinkingUserId(null)
    }
  }

  const handleUnlink = async () => {
    if (!unlinkTarget) return
    setUnlinkingStudentId(unlinkTarget.student.id)
    setError(null)
    try {
      const token = await getToken()
      if (!token) return
      await createApi(token).unlinkStudentUser(unlinkTarget.student.id)
      flashSuccess(
        `Unlinked ${unlinkTarget.user.email || unlinkTarget.user.username}. Account is pending again.`
      )
      setUnlinkTarget(null)
      await load()
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : "Failed to unlink account")
    } finally {
      setUnlinkingStudentId(null)
    }
  }

  return (
    <StaggerContainer className="space-y-8">
      <StaggerItem>
        <StandardPageHeader
          title="Match students"
          description="Link Clerk accounts to student records. Linking sets the account role to student; unlinking returns a student-role account to pending."
          back={{ href: "/users/", label: "Users" }}
          secondaryAction={buildReloadAction({
            hasLoaded: lastLoaded !== null,
            loading,
            onClick: () => void reload(),
          })}
        />
      </StaggerItem>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? (
        <p className="text-sm text-foreground rounded-lg border border-border bg-muted/50 px-4 py-3">{success}</p>
      ) : null}

      <StaggerItem className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Unmatched accounts</h2>
            <p className="text-sm text-muted-foreground">
              Pending and student logins that are not attached to a roster row.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search accounts…"
              value={accountQuery}
              onChange={(e) => setAccountQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TableRevealProvider>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Student record</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <AnimatedTableBody
                loading={loading}
                hasData={filteredUnmatchedUsers.length > 0}
                rowCount={Math.min(8, filteredUnmatchedUsers.length || 8)}
                skeletonRowCount={6}
                colSpan={4}
                skeleton={
                  <TableSkeletonRows
                    rows={6}
                    columns={4}
                    cellClassNames={["h-4 w-40", "h-5 w-16", "h-8 w-48", "h-8 w-16"]}
                  />
                }
                idle={lastLoaded === null}
                idleTitle="No accounts loaded yet"
                idleDescription="Use Load Data in the toolbar to fetch unmatched accounts."
                emptyTitle="No unmatched accounts"
                emptyDescription="Every pending or student login already has a roster match, or none have signed up yet."
              >
                {filteredUnmatchedUsers.map((user) => {
                  const selected = selectedStudentByUser[user.id] ?? ""
                  const busy = linkingUserId === user.id
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.email || "—"}</div>
                        <div className="text-xs text-muted-foreground">{user.username}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === "pending" ? "outline" : "secondary"} className="capitalize">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[16rem]">
                        <SearchableSelect
                          options={studentOptions}
                          value={selected}
                          onValueChange={(value) =>
                            setSelectedStudentByUser((prev) => ({ ...prev, [user.id]: value }))
                          }
                          placeholder="Select student…"
                          searchPlaceholder="Search students…"
                          disabled={busy || studentOptions.length === 0}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          className="gap-1.5"
                          disabled={busy || !selected}
                          onClick={() => void handleLink(user)}
                        >
                          {busy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                          Link
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </AnimatedTableBody>
            </Table>
          </div>
        </TableRevealProvider>
        {!loading && unmatchedStudents.length === 0 && unmatchedUsers.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            No unlinked student records remain. Create a student in the directory first.
          </p>
        ) : null}
      </StaggerItem>

      <StaggerItem className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Linked pairs</h2>
            <p className="text-sm text-muted-foreground">
              Unlinking clears the roster match and sets a student-role account back to pending.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search linked pairs…"
              value={linkedQuery}
              onChange={(e) => setLinkedQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TableRevealProvider>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <AnimatedTableBody
                loading={loading}
                hasData={filteredLinkedUsers.length > 0}
                rowCount={Math.min(8, filteredLinkedUsers.length || 8)}
                skeletonRowCount={4}
                colSpan={3}
                skeleton={
                  <TableSkeletonRows
                    rows={4}
                    columns={3}
                    cellClassNames={["h-4 w-40", "h-4 w-36", "h-8 w-20"]}
                  />
                }
                idle={lastLoaded === null}
                idleTitle="No links loaded yet"
                idleDescription="Use Load Data in the toolbar to fetch linked pairs."
                emptyTitle="No linked pairs"
                emptyDescription="Match an unmatched account to a student record above."
              >
                {filteredLinkedUsers.map((user) => {
                  const student = linkedByUserId.get(user.id)
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.email || "—"}</div>
                        <div className="text-xs text-muted-foreground">{user.username}</div>
                      </TableCell>
                      <TableCell>
                        {student ? (
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-xs font-mono text-muted-foreground">{student.unique_code}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Student #{user.student_profile_id}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          disabled={!student || unlinkingStudentId === student.id}
                          onClick={() => student && setUnlinkTarget({ user, student })}
                        >
                          <Unlink className="size-4" />
                          Unlink
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </AnimatedTableBody>
            </Table>
          </div>
        </TableRevealProvider>
      </StaggerItem>

      <Dialog open={unlinkTarget !== null} onOpenChange={(open) => !open && setUnlinkTarget(null)}>
        <DialogContent onClose={() => setUnlinkTarget(null)}>
          <DialogHeader>
            <DialogTitle>Unlink this account?</DialogTitle>
            <DialogDescription>
              {unlinkTarget
                ? `${unlinkTarget.user.email || unlinkTarget.user.username} will be detached from ${unlinkTarget.student.name}. If the role is student, it becomes pending.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkTarget(null)} disabled={unlinkingStudentId !== null}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleUnlink()}
              disabled={unlinkingStudentId !== null}
            >
              {unlinkingStudentId !== null ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Unlink
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaggerContainer>
  )
}

export default function MatchingPage() {
  return (
    <RequireRole mode="admin">
      <MatchingContent />
    </RequireRole>
  )
}
