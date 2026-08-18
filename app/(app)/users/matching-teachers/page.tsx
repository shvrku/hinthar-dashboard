"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Link2, Loader2, Search, Unlink } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { Teacher, User } from "@/lib/types"
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

const LINKABLE_ROLES = new Set(["pending", "teacher"])

function isLinkableUser(user: User) {
  return LINKABLE_ROLES.has(user.role) && !user.teacher_profile_id && !user.student_profile_id && !user.staff_profile_id
}

function MatchingTeachersContent() {
  const { getToken } = useAuth()
  const [unmatchedUsers, setUnmatchedUsers] = React.useState<User[]>([])
  const [unmatchedTeachers, setUnmatchedTeachers] = React.useState<Teacher[]>([])
  const [linkedUsers, setLinkedUsers] = React.useState<User[]>([])
  const [linkedByUserId, setLinkedByUserId] = React.useState<Map<number, Teacher>>(new Map())
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)
  const [accountQuery, setAccountQuery] = React.useState("")
  const [linkedQuery, setLinkedQuery] = React.useState("")
  const [selectedTeacherByUser, setSelectedTeacherByUser] = React.useState<Record<number, string>>({})
  const [linkingUserId, setLinkingUserId] = React.useState<number | null>(null)
  const [unlinkingTeacherId, setUnlinkingTeacherId] = React.useState<number | null>(null)
  const [unlinkTarget, setUnlinkTarget] = React.useState<{ user: User; teacher: Teacher } | null>(null)

  const flashSuccess = React.useCallback((msg: string) => {
    setSuccess(msg)
    window.setTimeout(() => setSuccess(null), 3500)
  }, [])

  const load = React.useCallback(async () => {
    const token = await getToken()
    if (!token) return
    const api = createApi(token)
    const [usersUnlinked, teachersUnlinked, usersLinked, teachersLinked] = await Promise.all([
      api.listUsers({
        linked: "false",
        linked_target: "teacher",
        linkable: "true",
        linkable_target: "teacher",
      }),
      api.listTeachers({ linked: "false" }),
      api.listUsers({ linked: "true", linked_target: "teacher" }),
      api.listTeachers({ linked: "true" }),
    ])
    setUnmatchedUsers(usersUnlinked.filter(isLinkableUser))
    setUnmatchedTeachers(teachersUnlinked)
    setLinkedUsers(usersLinked.filter((user) => user.teacher_profile_id != null))
    const map = new Map<number, Teacher>()
    for (const teacher of teachersLinked) {
      if (teacher.user_id != null) map.set(teacher.user_id, teacher)
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
      setError(err instanceof ApiError ? err.userMessage : "Failed to load teacher matching data")
    } finally {
      setLoading(false)
    }
  }, [load])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  const teacherOptions = React.useMemo(
    () =>
      unmatchedTeachers.map((teacher) => ({
        value: String(teacher.id),
        label: teacher.name,
        subLabel: [teacher.unique_code, teacher.school_code].filter(Boolean).join(" · "),
      })),
    [unmatchedTeachers]
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
      const teacher = linkedByUserId.get(user.id)
      const haystack = `${user.email} ${user.username} ${teacher?.name ?? ""} ${teacher?.unique_code ?? ""}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [linkedUsers, linkedByUserId, linkedQuery])

  const handleLink = async (user: User) => {
    const teacherId = Number(selectedTeacherByUser[user.id])
    if (!Number.isFinite(teacherId)) return
    setLinkingUserId(user.id)
    setError(null)
    try {
      const token = await getToken()
      if (!token) return
      const teacher = unmatchedTeachers.find((t) => t.id === teacherId)
      await createApi(token).linkTeacherUser(teacherId, user.id)
      setSelectedTeacherByUser((prev) => {
        const next = { ...prev }
        delete next[user.id]
        return next
      })
      flashSuccess(`Linked ${user.email || user.username} to ${teacher?.name ?? "teacher"}.`)
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
    setUnlinkingTeacherId(unlinkTarget.teacher.id)
    setError(null)
    try {
      const token = await getToken()
      if (!token) return
      await createApi(token).unlinkTeacherUser(unlinkTarget.teacher.id)
      flashSuccess(
        `Unlinked ${unlinkTarget.user.email || unlinkTarget.user.username}. Account is pending again.`
      )
      setUnlinkTarget(null)
      await load()
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : "Failed to unlink account")
    } finally {
      setUnlinkingTeacherId(null)
    }
  }

  return (
    <StaggerContainer className="space-y-8">
      <StaggerItem>
        <StandardPageHeader
          title="Match teachers"
          description="Link Clerk accounts to teacher records. Linking sets the account role to teacher; unlinking returns a teacher-role account to pending."
          back={{ href: "/users/management/", label: "Users" }}
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
              Pending and teacher logins that are not attached to a teacher row.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search accounts..."
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
                  <TableHead>Teacher record</TableHead>
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
                emptyDescription="Every pending or teacher login already has a teacher match, or none have signed up yet."
              >
                {filteredUnmatchedUsers.map((user) => {
                  const selected = selectedTeacherByUser[user.id] ?? ""
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
                          options={teacherOptions}
                          value={selected}
                          onValueChange={(value) =>
                            setSelectedTeacherByUser((prev) => ({ ...prev, [user.id]: value }))
                          }
                          placeholder="Select teacher..."
                          searchPlaceholder="Search teachers..."
                          disabled={busy || teacherOptions.length === 0}
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
        {!loading && unmatchedTeachers.length === 0 && unmatchedUsers.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            No unlinked teacher records remain. Create a teacher first.
          </p>
        ) : null}
      </StaggerItem>

      <StaggerItem className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Linked pairs</h2>
            <p className="text-sm text-muted-foreground">
              Unlinking clears the teacher match and sets a teacher-role account back to pending.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search linked pairs..."
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
                  <TableHead>Teacher</TableHead>
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
                emptyDescription="Match an unmatched account to a teacher record above."
              >
                {filteredLinkedUsers.map((user) => {
                  const teacher = linkedByUserId.get(user.id)
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.email || "—"}</div>
                        <div className="text-xs text-muted-foreground">{user.username}</div>
                      </TableCell>
                      <TableCell>
                        {teacher ? (
                          <div>
                            <div className="font-medium">{teacher.name}</div>
                            <div className="text-xs font-mono text-muted-foreground">{teacher.unique_code}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Teacher #{user.teacher_profile_id}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          disabled={!teacher || unlinkingTeacherId === teacher.id}
                          onClick={() => teacher && setUnlinkTarget({ user, teacher })}
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
                ? `${unlinkTarget.user.email || unlinkTarget.user.username} will be detached from ${unlinkTarget.teacher.name}. If the role is teacher, it becomes pending.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkTarget(null)} disabled={unlinkingTeacherId !== null}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleUnlink()}
              disabled={unlinkingTeacherId !== null}
            >
              {unlinkingTeacherId !== null ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Unlink
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaggerContainer>
  )
}

export default function MatchingTeachersPage() {
  return (
    <RequireRole mode="admin">
      <MatchingTeachersContent />
    </RequireRole>
  )
}
