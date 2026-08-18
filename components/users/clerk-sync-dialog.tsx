"use client"

import * as React from "react"
import { ExternalLink, Loader2 } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type { ClerkSyncReport, ClerkUnlinkedUser, User } from "@/lib/types"
import { SearchableSelect } from "@/components/searchable-select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ClerkSyncDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  getToken: () => Promise<string | null>
  onReport: (report: ClerkSyncReport) => void
  onUsersChanged: () => Promise<void>
}

function clerkOptionLabel(item: ClerkUnlinkedUser) {
  return item.email || item.username || item.clerk_id
}

export function ClerkSyncDialog({
  open,
  onOpenChange,
  getToken,
  onReport,
  onUsersChanged,
}: ClerkSyncDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [report, setReport] = React.useState<ClerkSyncReport | null>(null)
  const [importingId, setImportingId] = React.useState<string | null>(null)
  const [importingAll, setImportingAll] = React.useState(false)
  const [linkingId, setLinkingId] = React.useState<number | null>(null)
  const [selectedByUser, setSelectedByUser] = React.useState<Record<number, string>>({})

  const loadReport = React.useCallback(async () => {
    const token = await getToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await createApi(token).getClerkSync()
      setReport(data)
      onReport(data)
      setSelectedByUser({})
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : "Failed to load Clerk Sync")
    } finally {
      setLoading(false)
    }
  }, [getToken, onReport])

  React.useEffect(() => {
    if (!open) return
    void loadReport()
  }, [open, loadReport])

  const clerkOptions = React.useMemo(
    () =>
      (report?.clerk_unlinked ?? []).map((item) => ({
        value: item.clerk_id,
        label: clerkOptionLabel(item),
        subLabel: item.clerk_id,
      })),
    [report]
  )

  const runImport = async (clerkIds?: string[]) => {
    const token = await getToken()
    if (!token) return
    setError(null)
    if (clerkIds?.length === 1) setImportingId(clerkIds[0])
    else setImportingAll(true)
    try {
      await createApi(token).importClerkUsers(clerkIds)
      await onUsersChanged()
      await loadReport()
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : "Clerk Import failed")
    } finally {
      setImportingId(null)
      setImportingAll(false)
    }
  }

  const runLink = async (user: User) => {
    const clerkId = selectedByUser[user.id]
    if (!clerkId) return
    const token = await getToken()
    if (!token) return
    setError(null)
    setLinkingId(user.id)
    try {
      await createApi(token).linkClerkUser(user.id, clerkId)
      await onUsersChanged()
      await loadReport()
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : "Clerk Link failed")
    } finally {
      setLinkingId(null)
    }
  }

  const dashboardUrl = report?.clerk_dashboard_users_url || "https://dashboard.clerk.com"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Clerk Sync</DialogTitle>
          <DialogDescription>
            Compare this Clerk instance to Django accounts. Import creates a pending
            Django row. Link remaps an existing Django row to one unused Clerk id.
          </DialogDescription>
        </DialogHeader>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {loading && !report ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading Clerk Sync…
          </div>
        ) : null}

        {report ? (
          <div className="space-y-8">
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-medium">Clerk unlinked</h2>
                  <p className="text-xs text-muted-foreground">
                    In Clerk, not in Django. Clerk Import creates a pending account.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={importingAll || report.clerk_unlinked.length === 0}
                  onClick={() => void runImport()}
                >
                  {importingAll ? <Loader2 className="animate-spin" /> : null}
                  Import all
                </Button>
              </div>
              {report.clerk_unlinked.length === 0 ? (
                <p className="text-sm text-muted-foreground">No Clerk-unlinked users.</p>
              ) : (
                <ul className="space-y-2">
                  {report.clerk_unlinked.map((item) => (
                    <li
                      key={item.clerk_id}
                      className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {item.email || item.username || "—"}
                        </div>
                        <div className="truncate font-mono text-xs text-muted-foreground">
                          {item.clerk_id}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={importingId === item.clerk_id || importingAll}
                        onClick={() => void runImport([item.clerk_id])}
                      >
                        {importingId === item.clerk_id ? (
                          <Loader2 className="animate-spin" />
                        ) : null}
                        Clerk Import
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-medium">Django unlinked</h2>
                <p className="text-xs text-muted-foreground">
                  Django row whose clerk_id is not in this Clerk instance. Clerk Link
                  keeps role and profile links.
                </p>
              </div>
              {report.django_unlinked.length === 0 ? (
                <p className="text-sm text-muted-foreground">No Django-unlinked users.</p>
              ) : (
                <ul className="space-y-3">
                  {clerkOptions.length === 0 ? (
                    <li className="space-y-2 rounded-md border p-3">
                      <p className="text-sm">
                        No unused Clerk ids to link. Create the person in Clerk
                        first, then run Clerk Sync again.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={
                          <a href={dashboardUrl} target="_blank" rel="noopener noreferrer" />
                        }
                      >
                        Create in Clerk
                        <ExternalLink data-icon="inline-end" />
                      </Button>
                    </li>
                  ) : null}
                  {report.django_unlinked.map((user) => (
                    <li key={user.id} className="space-y-2 rounded-md border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">
                            {user.email || user.username}
                          </div>
                          <div className="truncate font-mono text-xs text-muted-foreground">
                            {user.clerk_id}
                          </div>
                        </div>
                        <Badge variant="destructive">Django unlinked</Badge>
                      </div>
                      {clerkOptions.length > 0 ? (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <SearchableSelect
                            className="flex-1"
                            options={clerkOptions}
                            value={selectedByUser[user.id] ?? ""}
                            onValueChange={(value) =>
                              setSelectedByUser((prev) => ({ ...prev, [user.id]: value }))
                            }
                            placeholder="Select a Clerk user…"
                            searchPlaceholder="Search Clerk users…"
                          />
                          <Button
                            size="sm"
                            disabled={!selectedByUser[user.id] || linkingId === user.id}
                            onClick={() => void runLink(user)}
                          >
                            {linkingId === user.id ? <Loader2 className="animate-spin" /> : null}
                            Clerk Link
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
