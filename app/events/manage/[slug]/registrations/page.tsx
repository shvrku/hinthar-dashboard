"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { ArrowLeft } from "lucide-react"

import { EventRegistrationRoster } from "@/components/events/event-registration-roster"
import { RequireRole } from "@/components/require-role"
import { EditorPageSkeleton } from "@/components/skeleton/communications-skeleton"
import { ApiError, createApi } from "@/lib/api"
import type { EventRegistration, EventRegistrationStatus, SchoolEvent } from "@/lib/types"
import { Button } from "@/components/ui/button"
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-20 flex items-center border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5"
          render={<Link href={`/events/manage/${event.slug}`} />}
        >
          <ArrowLeft className="size-4" />
          Manage event
        </Button>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{event.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {event.registration_count} confirmed
            {registrations.length > event.registration_count
              ? ` · ${registrations.length} total`
              : ""}
          </p>
        </div>

        <EventRegistrationRoster
          registrations={registrations}
          loading={loadingRegs}
          pendingIds={pendingIds}
          onStatusChange={setStatus}
        />
      </div>
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
