"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { CalendarDays, Pencil, Plus, Ticket, Trash2 } from "lucide-react"

import { RequireRole } from "@/components/require-role"
import { StandardPageHeader } from "@/components/standard-page-header"
import { EventsManageListSkeleton } from "@/components/skeleton/communications-skeleton"
import { ApiError, createApi } from "@/lib/api"
import type { SchoolEvent } from "@/lib/types"
import {
  EVENT_AUDIENCE_LABELS,
  EVENT_STATUS_LABELS,
} from "@/lib/communications-labels"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/components/ui/toast"

function ManageEventsContent() {
  const { getToken, isLoaded } = useAuth()
  const [events, setEvents] = React.useState<SchoolEvent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [deletingSlug, setDeletingSlug] = React.useState<string | null>(null)

  const loadEvents = React.useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const token = await getToken()
      if (!token) return
      const data = await createApi(token).listEvents({ page_size: 200 })
      setEvents(data.results)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load events")
    } finally {
      setLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    if (!isLoaded) return
    const timer = window.setTimeout(() => void loadEvents(), 0)
    return () => window.clearTimeout(timer)
  }, [isLoaded, loadEvents])

  const removeEvent = async (slug: string) => {
    setDeletingSlug(slug)
    try {
      const token = await getToken()
      if (!token) return
      await createApi(token).deleteEvent(slug)
      toast.add({ title: "Event deleted.", type: "success" })
      await loadEvents()
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Failed to delete event",
        type: "error",
      })
    } finally {
      setDeletingSlug(null)
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex flex-col gap-6">
        <StandardPageHeader
          title="Manage events"
          description="Create school events, set audience and registration mode, review sign-ups."
          back={{ href: "/events", label: "Events" }}
        />
        <EventsManageListSkeleton />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <StandardPageHeader
        title="Manage events"
        description="Create school events, set audience and registration mode, review sign-ups."
        back={{ href: "/events", label: "Events" }}
      >
        <Button render={<Link href="/events/manage/new" />} className="gap-2">
          <Plus className="size-4" />
          Add event
        </Button>
      </StandardPageHeader>

      {loadError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">{loadError}</CardContent>
        </Card>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <CalendarDays className="size-8 text-muted-foreground/50" />
            <p className="font-medium">No events yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first school event with the Notion-style editor.
            </p>
            <Button render={<Link href="/events/manage/new" />} className="gap-2">
              <Plus className="size-4" />
              Add event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y rounded-2xl border border-border/80 bg-card shadow-xs">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-2">
                <div className="font-semibold">{event.title}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{EVENT_AUDIENCE_LABELS[event.audience]}</Badge>
                  <Badge variant="outline">{EVENT_STATUS_LABELS[event.status]}</Badge>
                  <span>{new Date(event.starts_at).toLocaleString()}</span>
                  <span>{event.registration_count} confirmed</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" render={<Link href={`/events/${event.slug}`} />}>
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  render={<Link href={`/events/manage/${event.slug}/registrations`} />}
                >
                  <Ticket className="size-3.5" />
                  Registrations
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  render={<Link href={`/events/manage/${event.slug}/edit`} />}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={deletingSlug === event.slug}
                  onClick={() => void removeEvent(event.slug)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ManageEventsPage() {
  return (
    <RequireRole mode="staff">
      <ManageEventsContent />
    </RequireRole>
  )
}
