"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { Loader2, Search, Trash2 } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { ClerkSyncReport, User } from "@/lib/types"
import { ASSIGNABLE_ROLES, type Role } from "@/lib/roles"
import { useCurrentUser } from "@/components/current-user-provider"
import { StandardPageHeader, buildReloadAction } from "@/components/standard-page-header"
import { ClerkSyncDialog } from "@/components/users/clerk-sync-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { AnimatedTableBody } from "@/components/animation/animated-table-body"
import { TableRevealProvider } from "@/components/animation/table-reveal-context"
import { useServerPagination } from "@/components/use-server-pagination"
import { StandardTablePagination } from "@/components/standard-table-pagination"
import { TableSkeletonRows } from "@/components/page-skeletons"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type StatusFilter = "all" | "active" | "deactivated"

function parseStatusFilter(raw: string | null): StatusFilter {
  if (raw === "active" || raw === "true") return "active"
  if (raw === "deactivated" || raw === "false") return "deactivated"
  return "all"
}

function SpoilerId({ value }: { value: string | null | undefined }) {
  const [copied, setCopied] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const copiedRef = React.useRef(false)
  const hoveringRef = React.useRef(false)
  const leftWhileCopiedRef = React.useRef(false)
  const closingCopiedRef = React.useRef(false)
  const showIdAfterCloseRef = React.useRef(false)
  const lingerTimerRef = React.useRef<number | null>(null)
  const reopenTimerRef = React.useRef<number | null>(null)

  const clearTimers = React.useCallback(() => {
    if (lingerTimerRef.current != null) {
      window.clearTimeout(lingerTimerRef.current)
      lingerTimerRef.current = null
    }
    if (reopenTimerRef.current != null) {
      window.clearTimeout(reopenTimerRef.current)
      reopenTimerRef.current = null
    }
  }, [])

  const closeCopied = React.useCallback((thenShowId: boolean) => {
    closingCopiedRef.current = true
    showIdAfterCloseRef.current = thenShowId
    if (!thenShowId) copiedRef.current = false
    clearTimers()
    setOpen(false)
  }, [clearTimers])

  const showIdInsteadOfCopied = React.useCallback(() => {
    if (!copiedRef.current || closingCopiedRef.current) return
    leftWhileCopiedRef.current = false
    closeCopied(true)
  }, [closeCopied])

  React.useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  if (!value) return <span className="text-muted-foreground">—</span>

  const preview = value.length > 10 ? `${value.slice(0, 8)}…` : value

  return (
    <Tooltip
      open={open}
      onOpenChange={(next, details) => {
        if (details.reason === "trigger-press") {
          setOpen(true)
          return
        }
        if (next && closingCopiedRef.current) return
        if (!next && copiedRef.current && !closingCopiedRef.current) {
          setOpen(true)
          return
        }
        setOpen(next)
      }}
      onOpenChangeComplete={(isOpen) => {
        if (isOpen) return
        closingCopiedRef.current = false
        const showId = showIdAfterCloseRef.current
        showIdAfterCloseRef.current = false
        copiedRef.current = false
        setCopied(false)
        if (!showId || !hoveringRef.current) return
        reopenTimerRef.current = window.setTimeout(() => {
          reopenTimerRef.current = null
          if (hoveringRef.current) setOpen(true)
        }, 40)
      }}
    >
      <TooltipTrigger
        className="inline-flex max-w-[7.5rem] cursor-pointer rounded-md px-1.5 py-0.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        onPointerEnter={() => {
          hoveringRef.current = true
          if (copiedRef.current && leftWhileCopiedRef.current) {
            showIdInsteadOfCopied()
          }
        }}
        onPointerLeave={() => {
          hoveringRef.current = false
          if (!copiedRef.current || closingCopiedRef.current) return
          leftWhileCopiedRef.current = true
          if (lingerTimerRef.current != null) return
          lingerTimerRef.current = window.setTimeout(() => {
            lingerTimerRef.current = null
            closeCopied(false)
          }, 1200)
        }}
        onClick={(event) => {
          event.stopPropagation()
          clearTimers()
          copiedRef.current = true
          leftWhileCopiedRef.current = false
          closingCopiedRef.current = false
          showIdAfterCloseRef.current = false
          setCopied(true)
          setOpen(true)
          void navigator.clipboard.writeText(value).catch(() => {
            copiedRef.current = false
            setCopied(false)
            clearTimers()
          })
        }}
      >
        <span className="block max-w-full truncate font-mono text-xs text-muted-foreground hover:text-foreground">
          {preview}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs break-all font-mono text-xs">
        {copied ? "Copied" : value}
      </TooltipContent>
    </Tooltip>
  )
}

export function UserAccountsPanel() {
  const { getToken } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const statusFilter = parseStatusFilter(searchParams.get("status") ?? searchParams.get("is_active"))
  const { user: me, refresh: refreshMe } = useCurrentUser()
  const [users, setUsers] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [savingId, setSavingId] = React.useState<number | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<string>("all")
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)
  const [syncOpen, setSyncOpen] = React.useState(false)
  const [djangoUnlinkedIds, setDjangoUnlinkedIds] = React.useState<Set<number>>(new Set())
  const [pendingAction, setPendingAction] = React.useState<
    { type: "delete" | "deactivate" | "activate"; user: User } | null
  >(null)
  const [actionBusy, setActionBusy] = React.useState(false)
  const serverPg = useServerPagination(50)

  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  const fetchPage = React.useCallback(async () => {
    const token = await getToken()
    if (!token) return
    const data = await createApi(token).listUsersPage({
      page: serverPg.page,
      page_size: serverPg.pageSize,
      q: debouncedQuery || undefined,
      role: roleFilter === "all" ? undefined : roleFilter,
      is_active:
        statusFilter === "all" ? undefined : statusFilter === "deactivated" ? "false" : "true",
    })
    setUsers(data.results)
    serverPg.setTotalItems(data.count)
  }, [getToken, serverPg.page, serverPg.pageSize, serverPg.setTotalItems, debouncedQuery, roleFilter, statusFilter])

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await fetchPage()
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : "Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [fetchPage])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const filterKeyRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (lastLoaded === null) return
    const filterKey = `${debouncedQuery}|${roleFilter}|${statusFilter}`
    const filterChanged = filterKeyRef.current !== null && filterKey !== filterKeyRef.current
    filterKeyRef.current = filterKey
    if (filterChanged && serverPg.page !== 1) {
      serverPg.setPage(1)
      return
    }
    let cancelled = false
    setLoading(true)
    void fetchPage()
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.userMessage : "Failed to load users")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPg.page, serverPg.pageSize, debouncedQuery, roleFilter, statusFilter])

  const updateRole = async (user: User, role: Role) => {
    if (role === user.role) return
    setSavingId(user.id)
    setError(null)
    try {
      const token = await getToken()
      if (!token) return
      const updated = await createApi(token).updateUser(user.id, { role })
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      if (me?.id === updated.id) {
        await refreshMe()
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : "Failed to update role")
    } finally {
      setSavingId(null)
    }
  }

  const runPendingAction = async () => {
    if (!pendingAction) return
    setActionBusy(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) return
      const api = createApi(token)
      if (pendingAction.type === "delete") {
        await api.deleteUser(pendingAction.user.id)
        setDjangoUnlinkedIds((prev) => {
          const next = new Set(prev)
          next.delete(pendingAction.user.id)
          return next
        })
      } else {
        await api.updateUser(pendingAction.user.id, {
          is_active: pendingAction.type === "activate",
        })
      }
      await fetchPage()
      setPendingAction(null)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.userMessage
          : pendingAction.type === "delete"
            ? "Failed to delete user"
            : "Failed to update account"
      )
    } finally {
      setActionBusy(false)
    }
  }

  const handleClerkReport = React.useCallback((report: ClerkSyncReport) => {
    setDjangoUnlinkedIds(new Set(report.django_unlinked.map((user) => user.id)))
  }, [])

  const setStatusFilter = React.useCallback(
    (next: StatusFilter) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("is_active")
      if (next === "all") params.delete("status")
      else params.set("status", next)
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname)
    },
    [pathname, router, searchParams]
  )

  const emptyCopy =
    statusFilter === "deactivated"
      ? {
          title: "No deactivated accounts",
          description: "Deactivated accounts will appear here.",
        }
      : statusFilter === "active"
        ? {
            title: "No active accounts",
            description: "Try a different role filter or search.",
          }
        : {
            title: "No users found",
            description: "Try a different status, role filter, or search.",
          }

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <StandardPageHeader
          title="User management"
          description="Django accounts. New sign-ups: as pending. Deactivate to lock dashboard access; Delete unless tied to internal account."
          primaryAction={{
            label: "Clerk Sync",
            variant: "outline",
            onClick: () => setSyncOpen(true),
          }}
          secondaryAction={buildReloadAction({
            hasLoaded: lastLoaded !== null,
            loading,
            onClick: () => void load(),
          })}
        />
      </StaggerItem>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <StaggerItem>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val ?? "all")}>
            <SelectTrigger className="w-36 text-xs">
              <SelectValue>
                {roleFilter === "all" ? "All Roles" : roleFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ASSIGNABLE_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(parseStatusFilter(val))}
          >
            <SelectTrigger className="w-40 text-xs">
              <SelectValue>
                {statusFilter === "all"
                  ? "All accounts"
                  : statusFilter === "deactivated"
                    ? "Deactivated"
                    : "Active"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="deactivated">Deactivated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </StaggerItem>

      <StaggerItem>
        <TableRevealProvider>
        {serverPg.totalItems > 0 && (
          <StandardTablePagination
            currentPage={serverPg.page}
            totalPages={serverPg.totalPages}
            totalItems={serverPg.totalItems}
            startIndex={serverPg.startIndex}
            endIndex={serverPg.endIndex}
            pageSize={serverPg.pageSize}
            onPageChange={serverPg.setPage}
            onPageSizeChange={serverPg.setPageSize}
            loading={loading}
            placement="top"
            className="mb-4"
          />
        )}
        <div className="rounded-lg border">
          <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email / Username</TableHead>
                <TableHead className="w-[7.5rem]">Clerk ID</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Teacher ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <AnimatedTableBody
              loading={loading}
              hasData={users.length > 0}
              rowCount={Math.min(serverPg.pageSize, 8)}
              skeletonRowCount={Math.min(serverPg.pageSize, 8)}
              colSpan={7}
              skeleton={
                <TableSkeletonRows
                  rows={Math.min(serverPg.pageSize, 8)}
                  columns={7}
                  cellClassNames={["h-4 w-40", "h-4 w-28", "h-4 w-16", "h-4 w-16", "h-8 w-32", "h-5 w-16 rounded-full", "h-8 w-24"]}
                />
              }
              idle={lastLoaded === null}
              idleTitle="No users loaded yet"
              idleDescription="Use Load Data in the toolbar to fetch accounts."
              emptyTitle={emptyCopy.title}
              emptyDescription={emptyCopy.description}
            >
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.email || "—"}</div>
                    <div className="text-xs text-muted-foreground">{user.username}</div>
                  </TableCell>
                  <TableCell className="w-[7.5rem] max-w-[7.5rem]">
                    <SpoilerId value={user.clerk_id} />
                  </TableCell>
                  <TableCell>
                    {user.student_profile_id != null ? (
                      <Link
                        href={`/students/${user.student_profile_id}/`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {user.student_profile_id}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.teacher_profile_id != null ? (
                      <Link
                        href={`/teachers/${user.teacher_profile_id}/`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {user.teacher_profile_id}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={user.role}
                        disabled={savingId === user.id}
                        onValueChange={(value) => {
                          if (value) void updateRole(user, value as Role)
                        }}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {user.role === "pending" ? (
                        <Badge variant="outline">Needs approval</Badge>
                      ) : null}
                      {djangoUnlinkedIds.has(user.id) ? (
                        <Badge variant="destructive">Django unlinked</Badge>
                      ) : null}
                      {savingId === user.id ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.is_active ? (
                      <Badge>Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {user.is_active ? (
                        <Tooltip>
                          <TooltipTrigger render={<span className="inline-flex" />}>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={user.can_deactivate === false || savingId === user.id}
                              onClick={() => setPendingAction({ type: "deactivate", user })}
                            >
                              Deactivate
                            </Button>
                          </TooltipTrigger>
                          {user.can_deactivate === false && user.deactivate_blocked_reason ? (
                            <TooltipContent>{user.deactivate_blocked_reason}</TooltipContent>
                          ) : null}
                        </Tooltip>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={savingId === user.id}
                          onClick={() => setPendingAction({ type: "activate", user })}
                        >
                          Activate
                        </Button>
                      )}
                      <Tooltip>
                        <TooltipTrigger render={<span className="inline-flex" />}>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            disabled={user.can_delete === false || savingId === user.id}
                            onClick={() => setPendingAction({ type: "delete", user })}
                            aria-label={`Delete ${user.email || user.username}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        {user.can_delete === false && user.delete_blocked_reason ? (
                          <TooltipContent>{user.delete_blocked_reason}</TooltipContent>
                        ) : null}
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </AnimatedTableBody>
          </Table>
          </TooltipProvider>
        </div>
        {serverPg.totalItems > 0 && (
          <StandardTablePagination
            currentPage={serverPg.page}
            totalPages={serverPg.totalPages}
            totalItems={serverPg.totalItems}
            startIndex={serverPg.startIndex}
            endIndex={serverPg.endIndex}
            pageSize={serverPg.pageSize}
            onPageChange={serverPg.setPage}
            onPageSizeChange={serverPg.setPageSize}
            loading={loading}
            placement="bottom"
            className="mt-4"
          />
        )}
        </TableRevealProvider>
      </StaggerItem>
      <ClerkSyncDialog
        open={syncOpen}
        onOpenChange={setSyncOpen}
        getToken={getToken}
        onReport={handleClerkReport}
        onUsersChanged={async () => {
          await fetchPage()
        }}
      />
      <ConfirmDialog
        open={pendingAction !== null}
        title={
          pendingAction?.type === "delete"
            ? "Delete account"
            : pendingAction?.type === "deactivate"
              ? "Deactivate account"
              : "Activate account"
        }
        description={
          pendingAction?.type === "delete"
            ? `Delete ${pendingAction.user.email || pendingAction.user.username}? The Clerk user is not removed. Audit logs keep the actor email. This cannot be undone.`
              : pendingAction?.type === "deactivate"
              ? `Deactivate ${pendingAction.user.email || pendingAction.user.username}? They can still sign in and see a lock screen until you activate them again.`
              : pendingAction
                ? `Activate ${pendingAction.user.email || pendingAction.user.username}?`
                : ""
        }
        confirmLabel={
          pendingAction?.type === "delete"
            ? "Delete"
            : pendingAction?.type === "deactivate"
              ? "Deactivate"
              : "Activate"
        }
        variant={pendingAction?.type === "activate" ? "default" : "destructive"}
        loading={actionBusy}
        onConfirm={() => void runPendingAction()}
        onCancel={() => {
          if (!actionBusy) setPendingAction(null)
        }}
      />
    </StaggerContainer>
  )
}
