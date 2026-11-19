"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Link2, Loader2, Search, Unlink } from "lucide-react"
import { ApiError, createApi } from "@/lib/api"
import { formatStudentIdentifier } from "@/lib/format-student-code"
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

const LINKABLE_PARENT_ROLES = new Set(["pending", "parent"])

function isLinkableParentUser(user: User) {
  return (
    LINKABLE_PARENT_ROLES.has(user.role) &&
    !user.student_profile_id &&
    !user.teacher_profile_id &&
    !user.staff_profile_id
  )
}

interface LinkedParentPair {
  student: Student
  parent: User | null
  parentId: number
}

function MatchingParentsContent() {
  const { getToken } = useAuth()
  const [parentAccounts, setParentAccounts] = React.useState<User[]>([])
  const [availableStudents, setAvailableStudents] = React.useState<Student[]>([])
  const [linkedPairs, setLinkedPairs] = React.useState<LinkedParentPair[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)
  const [accountQuery, setAccountQuery] = React.useState("")
  const [linkedQuery, setLinkedQuery] = React.useState("")
  const [selectedStudentByUser, setSelectedStudentByUser] = React.useState<Record<number, string>>({})
  const [linkingUserId, setLinkingUserId] = React.useState<number | null>(null)
  const [unlinkingStudentId, setUnlinkingStudentId] = React.useState<number | null>(null)
  const [unlinkTarget, setUnlinkTarget] = React.useState<LinkedParentPair | null>(null)

  const flashSuccess = React.useCallback((msg: string) => {
    setSuccess(msg)
    window.setTimeout(() => setSuccess(null), 3500)
  }, [])

  const load = React.useCallback(async () => {
    const token = await getToken()
    if (!token) return
    const api = createApi(token)
    const [linkableUsers, studentsUnlinked, usersLinkedParents, studentsWithParents] =
      await Promise.all([
        api.listUsers({
          linkable: "true",
          linkable_target: "parent",
        }),
        api.listStudents({ parent_linked: "false" }),
        api.listUsers({ linked: "true", linked_target: "parent" }),
        api.listStudents({ parent_linked: "true" }),
      ])

    const eligibleAccounts = linkableUsers.filter(isLinkableParentUser)
    const usersById = new Map<number, User>()
    for (const u of [...eligibleAccounts, ...usersLinkedParents]) {
      usersById.set(u.id, u)
    }

    const pairs: LinkedParentPair[] = studentsWithParents
      .filter((s): s is Student & { parent_id: number } => s.parent_id != null)
      .map((student) => ({
        student,
        parentId: student.parent_id,
        parent: usersById.get(student.parent_id) ?? null,
      }))

    setParentAccounts(eligibleAccounts)
    setAvailableStudents(studentsUnlinked)
    setLinkedPairs(pairs)
  }, [getToken])

  const reload = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await load()
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : "Failed to load parent matching data")
    } finally {
      setLoading(false)
    }
  }, [load])

  React.useEffect(() => {
    void reload()
  }, [reload])

  const childCountByParentId = React.useMemo(() => {
    const counts = new Map<number, number>()
    for (const pair of linkedPairs) {
      counts.set(pair.parentId, (counts.get(pair.parentId) ?? 0) + 1)
    }
    return counts
  }, [linkedPairs])

  const studentOptions = React.useMemo(
    () =>
      availableStudents.map((student) => {
        const code = formatStudentIdentifier(student.unique_code, student.id)
        return {
          value: String(student.id),
          label: `${code} · ${student.name}`,
          subLabel: (student.class_labels ?? []).join(" · ") || undefined,
        }
      }),
    [availableStudents]
  )

  const filteredAccounts = React.useMemo(() => {
    const q = accountQuery.trim().toLowerCase()
    if (!q) return parentAccounts
    return parentAccounts.filter((user) => {
      const haystack = `${user.email} ${user.username} ${user.clerk_id} ${user.role}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [parentAccounts, accountQuery])

  const filteredPairs = React.useMemo(() => {
    const q = linkedQuery.trim().toLowerCase()
    if (!q) return linkedPairs
    return linkedPairs.filter(({ student, parent, parentId }) => {
      const code = formatStudentIdentifier(student.unique_code, student.id)
      const haystack = [
        parent?.email ?? "",
        parent?.username ?? "",
        `user #${parentId}`,
        student.name,
        code,
        ...(student.class_labels ?? []),
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [linkedPairs, linkedQuery])

  const handleLink = async (user: User) => {
    const studentId = Number(selectedStudentByUser[user.id])
    if (!Number.isFinite(studentId)) return
    setLinkingUserId(user.id)
    setError(null)
    try {
      const token = await getToken()
      if (!token) return
      const student = availableStudents.find((s) => s.id === studentId)
      const studentCode = student
        ? formatStudentIdentifier(student.unique_code, student.id)
        : `#${studentId}`
      await createApi(token).linkStudentParent(studentId, user.id)
      setSelectedStudentByUser((prev) => {
        const next = { ...prev }
        delete next[user.id]
        return next
      })
      flashSuccess(
        `Linked parent ${user.email || user.username} to ${studentCode} · ${student?.name ?? "student"}.`
      )
      await load()
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : "Failed to link student to parent account")
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
      await createApi(token).unlinkStudentParent(unlinkTarget.student.id)
      const parentLabel =
        unlinkTarget.parent?.email || unlinkTarget.parent?.username || `Account #${unlinkTarget.parentId}`
      flashSuccess(`Unlinked ${unlinkTarget.student.name} from ${parentLabel}.`)
      setUnlinkTarget(null)
      await load()
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : "Failed to unlink student from parent")
    } finally {
      setUnlinkingStudentId(null)
    }
  }

  return (
    <StaggerContainer className="min-w-0 max-w-full space-y-8">
      <StaggerItem>
        <div className="space-y-2">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            ADMIN // USERS // MATCHING // PARENTS
          </div>
          <StandardPageHeader
            title="Match parents"
            description="Link parent or pending Clerk accounts to student records (SPD26-...). Supports linking multiple children to one parent account; unlinking all children returns a parent account to pending."
            back={{ href: "/users/management/", label: "Users" }}
            secondaryAction={buildReloadAction({
              hasLoaded: lastLoaded !== null,
              loading,
              onClick: () => void reload(),
            })}
          />
        </div>
      </StaggerItem>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? (
        <p className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground">
          {success}
        </p>
      ) : null}

      {/* Top Section: Parent Accounts & Student Linker */}
      <StaggerItem className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Parent Accounts &amp; Student Linker</h2>
            <p className="text-sm text-muted-foreground">
              Parent and pending accounts eligible to link one or more students.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search parent accounts…"
              value={accountQuery}
              onChange={(e) => setAccountQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TableRevealProvider>
          <div className="overflow-hidden rounded-lg border">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Parent account</TableHead>
                  <TableHead>Role &amp; Children</TableHead>
                  <TableHead>Student record</TableHead>
                  <TableHead className="w-[150px]" />
                </TableRow>
              </TableHeader>
              <AnimatedTableBody
                loading={loading}
                hasData={filteredAccounts.length > 0}
                rowCount={Math.min(8, filteredAccounts.length || 8)}
                skeletonRowCount={6}
                colSpan={4}
                skeleton={
                  <TableSkeletonRows
                    rows={6}
                    columns={4}
                    cellClassNames={["h-4 w-44", "h-5 w-24", "h-8 w-56", "h-8 w-28"]}
                  />
                }
                idle={lastLoaded === null}
                idleTitle="No parent accounts loaded yet"
                idleDescription="Use Load Data in the toolbar to fetch parent and pending accounts."
                emptyTitle="No eligible parent or pending accounts"
                emptyDescription="Accounts with an assigned staff, teacher, or individual student profile are excluded."
              >
                {filteredAccounts.map((user) => {
                  const selected = selectedStudentByUser[user.id] ?? ""
                  const busy = linkingUserId === user.id
                  const childrenCount = childCountByParentId.get(user.id) ?? 0
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.email || "—"}</div>
                        <div className="font-mono text-xs text-muted-foreground">{user.username}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant={user.role === "pending" ? "outline" : "secondary"}
                            className="font-mono text-[11px] uppercase"
                          >
                            {user.role}
                          </Badge>
                          {childrenCount > 0 ? (
                            <Badge variant="outline" className="font-mono text-[11px] tabular-nums">
                              {childrenCount} {childrenCount === 1 ? "child" : "children"}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[18rem]">
                        <SearchableSelect
                          options={studentOptions}
                          value={selected}
                          onValueChange={(value) =>
                            setSelectedStudentByUser((prev) => ({ ...prev, [user.id]: value }))
                          }
                          placeholder="Select student (SPD26-...)…"
                          searchPlaceholder="Search by SPD26-... code or name…"
                          disabled={busy || studentOptions.length === 0}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          className="gap-1.5 whitespace-nowrap"
                          disabled={busy || !selected}
                          onClick={() => void handleLink(user)}
                        >
                          {busy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Link2 className="size-4" />
                          )}
                          Link Student
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </AnimatedTableBody>
            </Table>
          </div>
        </TableRevealProvider>
        {!loading && availableStudents.length === 0 && parentAccounts.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            All student records are currently linked to parent accounts.
          </p>
        ) : null}
      </StaggerItem>

      {/* Bottom Section: Linked Parent–Student Pairs */}
      <StaggerItem className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Linked Parent–Student Pairs</h2>
            <p className="text-sm text-muted-foreground">
              Active guardian links. Unlinking removes access from the Parent Portal; if no children remain, a parent-role account returns to pending.
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
          <div className="overflow-hidden rounded-lg border">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Parent account</TableHead>
                  <TableHead>Linked student</TableHead>
                  <TableHead>Cohorts</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <AnimatedTableBody
                loading={loading}
                hasData={filteredPairs.length > 0}
                rowCount={Math.min(8, filteredPairs.length || 8)}
                skeletonRowCount={4}
                colSpan={4}
                skeleton={
                  <TableSkeletonRows
                    rows={4}
                    columns={4}
                    cellClassNames={["h-4 w-44", "h-4 w-40", "h-4 w-28", "h-8 w-20"]}
                  />
                }
                idle={lastLoaded === null}
                idleTitle="No parent links loaded yet"
                idleDescription="Use Load Data in the toolbar to fetch linked parent–student pairs."
                emptyTitle="No linked parent–student pairs"
                emptyDescription="Select a student in the linker above to attach a parent account."
              >
                {filteredPairs.map((pair) => {
                  const code = formatStudentIdentifier(pair.student.unique_code, pair.student.id)
                  const busy = unlinkingStudentId === pair.student.id
                  return (
                    <TableRow key={pair.student.id}>
                      <TableCell>
                        {pair.parent ? (
                          <>
                            <div className="font-medium">{pair.parent.email || "—"}</div>
                            <div className="font-mono text-xs text-muted-foreground">
                              {pair.parent.username}
                            </div>
                          </>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">
                            Account #{pair.parentId}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{pair.student.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{code}</div>
                      </TableCell>
                      <TableCell>
                        {(pair.student.class_labels ?? []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {pair.student.class_labels!.map((lbl) => (
                              <Badge
                                key={lbl}
                                variant="outline"
                                className="font-mono text-[10px]"
                              >
                                {lbl}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 whitespace-nowrap"
                          disabled={busy}
                          onClick={() => setUnlinkTarget(pair)}
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
            <DialogTitle>Unlink student from parent?</DialogTitle>
            <DialogDescription>
              {unlinkTarget
                ? `${unlinkTarget.student.name} (${formatStudentIdentifier(
                    unlinkTarget.student.unique_code,
                    unlinkTarget.student.id
                  )}) will be removed from ${
                    unlinkTarget.parent?.email ||
                    unlinkTarget.parent?.username ||
                    `Account #${unlinkTarget.parentId}`
                  }'s Parent Portal. If no other children remain linked, the parent account will revert to pending.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnlinkTarget(null)}
              disabled={unlinkingStudentId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={unlinkingStudentId !== null}
              onClick={() => void handleUnlink()}
            >
              {unlinkingStudentId !== null ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : null}
              Unlink
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaggerContainer>
  )
}

export default function MatchingParentsPage() {
  return (
    <RequireRole mode="admin">
      <MatchingParentsContent />
    </RequireRole>
  )
}
