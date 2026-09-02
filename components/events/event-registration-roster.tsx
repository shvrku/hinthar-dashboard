"use client"

import * as React from "react"
import { Check, ChevronDown, Loader2, Search, User } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { EVENT_REGISTRATION_STATUS_LABELS } from "@/lib/communications-labels"
import type { EventRegistration, EventRegistrationStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

type StatusFilter = "all" | EventRegistrationStatus

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All guests" },
  { key: "confirmed", label: "Confirmed" },
  { key: "waitlisted", label: "Waitlisted" },
  { key: "pending", label: "Pending" },
]

const STATUS_OPTIONS: EventRegistrationStatus[] = [
  "confirmed",
  "waitlisted",
  "pending",
  "cancelled",
]

function registrantUsername(reg: EventRegistration) {
  return reg.user_display || `User #${reg.user}`
}

function RegistrationStatusMenu({
  registration,
  busy,
  onStatusChange,
}: {
  registration: EventRegistration
  busy: boolean
  onStatusChange: (registrationId: number, status: EventRegistrationStatus) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={busy}
        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-border/80 bg-muted/30 px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <>
            {EVENT_REGISTRATION_STATUS_LABELS[registration.status]}
            <ChevronDown className="size-3 opacity-50" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {STATUS_OPTIONS.map((status) => {
          const active = registration.status === status
          return (
            <DropdownMenuItem
              key={status}
              disabled={active || busy}
              onClick={() => onStatusChange(registration.id, status)}
            >
              <span className="flex-1">{EVENT_REGISTRATION_STATUS_LABELS[status]}</span>
              {active ? <Check className="size-3.5 opacity-70" /> : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function EventRegistrationRoster({
  registrations,
  loading,
  pendingIds,
  onStatusChange,
}: {
  registrations: EventRegistration[]
  loading: boolean
  pendingIds: Record<number, boolean>
  onStatusChange: (registrationId: number, status: EventRegistrationStatus) => void
}) {
  const [search, setSearch] = React.useState("")
  const [activeTab, setActiveTab] = React.useState<StatusFilter>("all")

  const counts = React.useMemo(() => {
    const tally: Record<StatusFilter, number> = {
      all: registrations.length,
      confirmed: 0,
      waitlisted: 0,
      pending: 0,
      cancelled: 0,
    }
    for (const reg of registrations) {
      tally[reg.status] += 1
    }
    return tally
  }, [registrations])

  const query = search.trim().toLowerCase()
  const filtered = React.useMemo(() => {
    return registrations.filter((reg) => {
      if (activeTab !== "all" && reg.status !== activeTab) return false
      if (!query) return true
      const username = registrantUsername(reg).toLowerCase()
      const email = (reg.user_email || "").toLowerCase()
      return username.includes(query) || email.includes(query)
    })
  }, [activeTab, query, registrations])

  return (
    <div className="flex flex-col gap-4">
      <InputGroup className="h-11 rounded-xl bg-background shadow-xs">
        <InputGroupAddon>
          <Search className="size-4 text-muted-foreground" />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for a guest…"
          className="text-sm"
        />
      </InputGroup>

      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => {
          const count = counts[tab.key]
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted"
              )}
            >
              {tab.label}
              {count > 0 ? ` ${count}` : ""}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
          <p>Loading registrations…</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {registrations.length === 0 ? "No registrations yet." : "No guests match your search."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card">
          {filtered.map((reg, index) => {
            const busy = pendingIds[reg.id]
            const email = reg.user_email?.trim()

            return (
              <div
                key={reg.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 sm:px-5",
                  index > 0 && "border-t border-border/80"
                )}
              >
                <Avatar size="default" className="size-10">
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <User className="size-4" />
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight">
                    {registrantUsername(reg)}
                  </p>
                  {email ? (
                    <p className="truncate text-sm text-muted-foreground">{email}</p>
                  ) : null}
                </div>

                <RegistrationStatusMenu
                  registration={reg}
                  busy={busy}
                  onStatusChange={onStatusChange}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
