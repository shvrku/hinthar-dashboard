"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"

import { EventRegistrationRoster } from "@/components/events/event-registration-roster"
import { RequireRole } from "@/components/require-role"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { EventRegistrationsSkeleton } from "@/components/skeleton/communications-skeleton"
import { StandardPageHeader } from "@/components/standard-page-header"
import { ApiError, createApi } from "@/lib/api"
import type { EventRegistration, EventRegistrationStatus, SchoolEvent } from "@/lib/types"
import { toast } from "@/components/ui/toast"

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

  const setStatus = async (
    registrationId: number,
    status: EventRegistrationStatus
  ) => {
    if (!slug) return
    setPendingIds((prev) => ({ ...prev, [registrationId]: true }))
    try {
      const token = await getToken()
      if (!token) return
      await createApi(token).reviewEventRegistration(slug, registrationId, { status })
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
    return (
      <StaggerContainer className="flex flex-col gap-6">
        <StaggerItem>
          <EventRegistrationsSkeleton />
        </StaggerItem>
      </StaggerContainer>
    )
  }

  if (error || !event) {
    return (
      <StaggerContainer className="flex flex-col gap-6">
        <StaggerItem>
          <div className="mx-auto max-w-lg py-16 text-center">
            <p className="text-sm text-destructive">{error || "Event not found."}</p>
          </div>
        </StaggerItem>
      </StaggerContainer>
    )
  }

  return (
    <StaggerContainer className="flex flex-col gap-6">
      <StaggerItem>
        <StandardPageHeader
          title={event.title}
          description={`${event.registration_count} confirmed${
            registrations.length > event.registration_count
              ? ` · ${registrations.length} total`
              : ""
          }`}
          back={{ href: `/events/manage/${event.slug}`, label: "Manage event" }}
        />
      </StaggerItem>

      <StaggerItem className="mx-auto w-full max-w-2xl">
        <EventRegistrationRoster
          registrations={registrations}
          loading={loadingRegs}
          pendingIds={pendingIds}
          onStatusChange={setStatus}
        />
      </StaggerItem>
    </StaggerContainer>
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
