"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Loader2, Search } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { User } from "@/lib/types"
import { ASSIGNABLE_ROLES, type Role } from "@/lib/roles"
import { RequireRole } from "@/components/require-role"
import { useCurrentUser } from "@/components/current-user-provider"
import { StandardPageHeader, buildReloadAction } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { useServerPagination } from "@/components/use-server-pagination"
import { StandardTablePagination } from "@/components/standard-table-pagination"
import { TableSkeletonRows } from "@/components/page-skeletons"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
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

function UsersAdminContent() {
  const { getToken } = useAuth()
  const { user: me, refresh: refreshMe } = useCurrentUser()
  const [users, setUsers] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [savingId, setSavingId] = React.useState<number | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<string>("all")
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)
  const serverPg = useServerPagination(50)

  // Debounce search input ~300ms before it drives a server refetch.
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
    })
    setUsers(data.results)
    serverPg.setTotalItems(data.count)
  }, [getToken, serverPg.page, serverPg.pageSize, serverPg.setTotalItems, debouncedQuery, roleFilter])

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
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Once data has been loaded at least once, keep the server page in sync:
  // reset to page 1 when search/filter changes, and refetch whenever
  // page/pageSize/search/filter change.
  const filterKeyRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (lastLoaded === null) return
    const filterKey = `${debouncedQuery}|${roleFilter}`
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
  }, [serverPg.page, serverPg.pageSize, debouncedQuery, roleFilter])

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

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <StandardPageHeader
          title="Users"
          description="Assign Django roles for Clerk-authenticated accounts. New sign-ups start as pending."
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
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email / Username</TableHead>
                <TableHead>Clerk ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeletonRows
                  rows={5}
                  columns={4}
                  cellClassNames={["h-4 w-40", "h-4 w-28", "h-8 w-32", "h-5 w-16 rounded-full"]}
                />
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    {lastLoaded === null
                      ? 'Click "Load Data" to fetch users.'
                      : "No users found."}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.email || "—"}</div>
                      <div className="text-xs text-muted-foreground">{user.username}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {user.clerk_id}
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </StaggerItem>

      {serverPg.totalItems > 0 && (
        <StaggerItem>
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
          />
        </StaggerItem>
      )}
    </StaggerContainer>
  )
}

export default function UsersPage() {
  return (
    <RequireRole mode="admin">
      <UsersAdminContent />
    </RequireRole>
  )
}
