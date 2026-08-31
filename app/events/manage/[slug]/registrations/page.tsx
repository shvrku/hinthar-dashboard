"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { CalendarDays } from "lucide-react"

import { EventRegistrationRoster } from "@/components/events/event-registration-roster"
import { RequireRole } from "@/components/require-role"
import { StandardPageHeader } from "@/components/standard-page-header"
import { EditorPageSkeleton } from "@/components/skeleton/communications-skeleton"
import { ApiError, createApi } from "@/lib/api"
import type { EventRegistration, SchoolEvent } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toast"
import { EVENT_REGISTRATION_STATUS_LABELS } from "@/lib/communications-labels"

function RegistrationsContent({ params }: { params: Promise<{ slug: string }> }) {
  const { getToken, isLoaded } = useAuth()
  const [slug, setSlug] = React.useState<string | null>(null)
  const [event, setEvent] = React.useState<SchoolEvent | null>(null)
  const [registrations, setRegistrations] = React.useState<EventRegistration[]>([])
  const [loadingEvent, setLoadingEvent] = React.useState(true)
  const [loadingRegs, setLoadingRegs] = React.useState(true)
  const [pendingIds, setPendingIds] = React.useState<Record<number, boolean>>({})
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    void params.then((p) => setSlug(p.slug))
  }, [params])

  const loadRegistrations = React.useCallback(async () => {
    if (!slug) return
    setLoadingRegs(true)
    try {
      const token = await getToken()
      if (!token) return
      setRegistrations(await createApi(token).listEventRegistrations(slug))
    } finally {
      setLoadingRegs(false)
    }
  }, [getToken, slug])

  React.useEffect(() => {
    if (!isLoaded || !slug) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoadingEvent(true)
        setError(null)
        try {
          const token = await getToken()
          if (!token) throw new Error("No auth token available")
          const [eventData, regData] = await Promise.all([
            createApi(token).getEvent(slug),
            createApi(token).listEventRegistrations(slug),
          ])
          if (!cancelled) {
            setEvent(eventData)
            setRegistrations(regData)
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof ApiError ? err.userMessage : "Failed to load event")
          }
        } finally {
          if (!cancelled) {
            setLoadingEvent(false)
            setLoadingRegs(false)
          }
        }
      })()
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [getToken, isLoaded, slug])

  const review = async (
    registrationId: number,
    action: "approve" | "reject" | "promote"
  ) => {
    if (!slug) return
    setPendingIds((prev) => ({ ...prev, [registrationId]: true }))
    try {
      const token = await getToken()
      if (!token) return
      await createApi(token).reviewEventRegistration(slug, registrationId, { action })
      toast.add({ title: "Registration updated.", type: "success" })
      await loadRegistrations()
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Could not update registration",
        type: "error",
      })
    } finally {
      setPendingIds((prev) => {
        const next = { ...prev }
        delete next[registrationId]
        return next
      })
    }
  }

  if (!isLoaded || loadingEvent) {
    return <EditorPageSkeleton label="Loading registration roster…" />
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-sm text-destructive">{error || "Event not found."}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <StandardPageHeader
        title={event.title}
        description="Review and manage event sign-ups."
        back={{ href: "/events/manage", label: "Manage events" }}
        primaryAction={{
          label: "Edit event",
          onClick: () => {
            window.location.href = `/events/manage/${event.slug}/edit`
          },
        }}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-muted/20 px-4 py-3 text-sm">
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="size-4" />
          {new Date(event.starts_at).toLocaleString()}
        </span>
        <Badge variant="outline">{event.registration_count} confirmed</Badge>
        <Link href={`/events/${event.slug}`} className="text-primary underline-offset-4 hover:underline">
          View public page
        </Link>
      </div>

      <EventRegistrationRoster
        registrations={registrations}
        loading={loadingRegs}
        pendingIds={pendingIds}
        onReview={review}
      />

      {loadingRegs ? null : (
        <p className="text-center text-xs text-muted-foreground">
          Status labels: {Object.values(EVENT_REGISTRATION_STATUS_LABELS).join(" · ")}
        </p>
      )}
    </div>
  )
}

export default function EventRegistrationsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  return (
    <RequireRole mode="staff">
      <RegistrationsContent params={params} />
    </RequireRole>
  )
}
