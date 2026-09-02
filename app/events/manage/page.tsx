"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { CalendarDays, ChevronRight, Plus } from "lucide-react"

import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { EventDateIcon } from "@/components/events/event-meta-icons"
import { RequireRole } from "@/components/require-role"
import { EventsManageListSkeleton } from "@/components/skeleton/communications-skeleton"
import { StandardPageHeader } from "@/components/standard-page-header"
import { ApiError, createApi } from "@/lib/api"
import type { SchoolEvent } from "@/lib/types"
import { EVENT_AUDIENCE_LABELS, EVENT_STATUS_LABELS } from "@/lib/communications-labels"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatBackendTime } from "@/lib/utils"

function ManageEventsContent() {
  const { getToken, isLoaded } = useAuth()
  const [events, setEvents] = React.useState<SchoolEvent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

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

  if (!isLoaded || loading) {
    return (
      <StaggerContainer className="flex flex-col gap-6">
        <StaggerItem>
          <StandardPageHeader
            title="Events"
            description="Create and manage school events."
          />
        </StaggerItem>
        <StaggerItem>
          <EventsManageListSkeleton />
        </StaggerItem>
      </StaggerContainer>
    )
  }

  return (
    <StaggerContainer className="flex flex-col gap-6">
      <StaggerItem>
        <StandardPageHeader
          title="Events"
          description="Create and manage school events."
        >
          <Button render={<Link href="/events/manage/new" />} className="gap-2">
            <Plus className="size-4" />
            Create event
          </Button>
        </StandardPageHeader>
      </StaggerItem>

      {loadError ? (
        <StaggerItem>
          <Card>
            <CardContent className="py-10 text-center text-sm text-destructive">{loadError}</CardContent>
          </Card>
        </StaggerItem>
      ) : events.length === 0 ? (
        <StaggerItem>
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <CalendarDays className="size-8 text-muted-foreground/50" />
              <p className="font-medium">No events yet</p>
              <p className="text-sm text-muted-foreground">Create your first event to get started.</p>
              <Button render={<Link href="/events/manage/new" />} className="gap-2">
                <Plus className="size-4" />
                Create event
              </Button>
            </CardContent>
          </Card>
        </StaggerItem>
      ) : (
        <StaggerItem>
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/manage/${event.slug}`}
                className="flex items-center gap-4 border-b border-border/80 px-4 py-4 transition-colors last:border-b-0 hover:bg-muted/20 sm:px-5"
              >
                <EventDateIcon startsAt={event.starts_at} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{event.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatBackendTime(event.starts_at)}</span>
                    <Badge variant="outline">{EVENT_AUDIENCE_LABELS[event.audience]}</Badge>
                    <Badge variant="outline">{EVENT_STATUS_LABELS[event.status]}</Badge>
                  </div>
                </div>
                <div className="hidden shrink-0 text-right text-sm text-muted-foreground sm:block">
                  {event.registration_count} registered
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </StaggerItem>
      )}
    </StaggerContainer>
  )
}

export default function ManageEventsPage() {
  return (
    <RequireRole mode="staff">
      <ManageEventsContent />
    </RequireRole>
  )
}
