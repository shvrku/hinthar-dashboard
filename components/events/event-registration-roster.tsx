"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EVENT_REGISTRATION_STATUS_LABELS } from "@/lib/communications-labels"
import type { EventRegistration, EventRegistrationStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const statusTint: Record<EventRegistrationStatus, string> = {
  confirmed: "bg-emerald-500/8 border-emerald-500/25",
  waitlisted: "bg-amber-500/8 border-amber-500/25",
  pending: "bg-sky-500/8 border-sky-500/25",
  cancelled: "bg-muted/40 border-border",
}

export function EventRegistrationRoster({
  registrations,
  loading,
  pendingIds,
  onReview,
}: {
  registrations: EventRegistration[]
  loading: boolean
  pendingIds: Record<number, boolean>
  onReview: (
    registrationId: number,
    action: "approve" | "reject" | "promote"
  ) => void
}) {
  const [search, setSearch] = React.useState("")

  const query = search.trim().toLowerCase()
  const filtered = registrations.filter((reg) => {
    const label = (reg.user_display || `User #${reg.user}`).toLowerCase()
    return label.includes(query)
  })

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter registrants…"
        className="h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
      />

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
          <p>Loading registrations…</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No registrations found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((reg) => {
            const busy = pendingIds[reg.id]
            return (
              <div
                key={reg.id}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border p-4",
                  statusTint[reg.status]
                )}
              >
                <div>
                  <div className="font-semibold text-sm">
                    {reg.user_display || `User #${reg.user}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {EVENT_REGISTRATION_STATUS_LABELS[reg.status]}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {busy ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      {reg.status === "pending" ? (
                        <>
                          <Button size="sm" onClick={() => onReview(reg.id, "approve")}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => onReview(reg.id, "reject")}>
                            Reject
                          </Button>
                        </>
                      ) : null}
                      {reg.status === "waitlisted" ? (
                        <>
                          <Button size="sm" onClick={() => onReview(reg.id, "promote")}>
                            Promote
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => onReview(reg.id, "reject")}>
                            Remove
                          </Button>
                        </>
                      ) : null}
                      {reg.status === "confirmed" ? (
                        <Button size="sm" variant="outline" onClick={() => onReview(reg.id, "reject")}>
                          Cancel registration
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
