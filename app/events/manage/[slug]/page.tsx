"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import {
  ExternalLink,
  Loader2,
  Pencil,
  Ticket,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react"

import {
  EventDateIcon,
  EventLocationIcon,
  EventMetaIconTile,
} from "@/components/events/event-meta-icons"
import { MarkdownContent } from "@/components/markdown-content"
import { RequireRole } from "@/components/require-role"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { EventManageDashboardSkeleton } from "@/components/skeleton/communications-skeleton"
import { StandardPageHeader } from "@/components/standard-page-header"
import { ApiError, createApi } from "@/lib/api"
import type { SchoolEvent } from "@/lib/types"
import {
  EVENT_AUDIENCE_LABELS,
  EVENT_STATUS_LABELS,
  isEventRegistrationOpen,
} from "@/lib/communications-labels"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { toast } from "@/components/ui/toast"
import { formatBackendTime, parseBackendDateTime } from "@/lib/utils"

function ManageEventContent({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const { getToken, isLoaded } = useAuth()
  const [slug, setSlug] = React.useState<string | null>(null)
  const [event, setEvent] = React.useState<SchoolEvent | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [deleting, setDeleting] = React.useState(false)
  const [updatingSlug, setUpdatingSlug] = React.useState(false)
  const [slugDraft, setSlugDraft] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    void params.then((p) => setSlug(p.slug))
  }, [params])

  React.useEffect(() => {
    if (!isLoaded || !slug) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const token = await getToken()
        if (!token) throw new Error("No auth token available")
        const data = await createApi(token).getEvent(slug)
        if (!cancelled) {
          setEvent(data)
          setSlugDraft(data.slug)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.userMessage : "Failed to load event")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getToken, isLoaded, slug])

  const remove = async () => {
    if (!slug) return
    setDeleting(true)
    try {
      const token = await getToken()
      if (!token) return
      await createApi(token).deleteEvent(slug)
      toast.add({ title: "Event deleted.", type: "success" })
      router.push("/events/manage")
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Failed to delete event",
        type: "error",
      })
    } finally {
      setDeleting(false)
    }
  }

  const updateSlug = async () => {
    if (!slug || !event) return
    const next = slugDraft.trim().toLowerCase()
    if (!next || next === event.slug) return
    setUpdatingSlug(true)
    try {
      const token = await getToken()
      if (!token) return
      const updated = await createApi(token).updateEvent(slug, { slug: next })
      setEvent(updated)
      setSlugDraft(updated.slug)
      toast.add({ title: "Public URL updated.", type: "success" })
      if (updated.slug !== slug) {
        router.replace(`/events/manage/${updated.slug}`)
      }
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Failed to update URL",
        type: "error",
      })
    } finally {
      setUpdatingSlug(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <StaggerContainer className="flex flex-col gap-6">
        <StaggerItem>
          <EventManageDashboardSkeleton />
        </StaggerItem>
      </StaggerContainer>
    )
  }

  if (error || !event) {
    return (
      <StaggerContainer className="flex flex-col gap-6">
        <StaggerItem>
          <p className="px-4 text-sm text-destructive">{error || "Event not found."}</p>
        </StaggerItem>
      </StaggerContainer>
    )
  }

  const description = event.body.trim() || event.summary.trim()
  const location = event.location.trim()
  const isVirtual = /^https?:\/\//i.test(location)
  const start = parseBackendDateTime(event.starts_at)
  const startTime = formatBackendTime(event.starts_at)
  const endTime = event.ends_at ? formatBackendTime(event.ends_at) : null
  const timeRange = endTime ? `${startTime} – ${endTime}` : startTime
  const dayLabel = Number.isNaN(start.getTime())
    ? "—"
    : start.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
  const slugDirty = slugDraft.trim().toLowerCase() !== event.slug
  const registrationOpen = isEventRegistrationOpen(event)

  return (
    <StaggerContainer className="flex flex-col gap-6">
      <StaggerItem>
        <StandardPageHeader
          title={event.title}
          description={!registrationOpen ? "Registration closed" : "Event details and registration"}
          back={{ href: "/events/manage", label: "Events" }}
        >
          <Button size="sm" variant="outline" className="gap-1.5" render={<Link href={`/events/${event.slug}`} />}>
            <ExternalLink className="size-3.5" />
            View page
          </Button>
        </StandardPageHeader>
      </StaggerItem>

      <StaggerItem>
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
        <Card className="overflow-hidden">
          <CardContent className="grid gap-0 p-0 md:grid-cols-[1.2fr_0.9fr]">
            <div className="flex min-w-0 flex-col gap-4 overflow-hidden border-b border-border/80 p-5 sm:p-6 md:border-r md:border-b-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{EVENT_AUDIENCE_LABELS[event.audience]}</Badge>
                <Badge variant="outline">{EVENT_STATUS_LABELS[event.status]}</Badge>
                {!registrationOpen ? (
                  <Badge variant="secondary">Registration closed</Badge>
                ) : null}
              </div>
              {description ? (
                <MarkdownContent
                  source={description}
                  lineClamp={4}
                  className="min-w-0 text-sm leading-relaxed text-muted-foreground sm:text-base"
                />
              ) : (
                <p className="text-sm text-muted-foreground">No description yet.</p>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-6">
              <div>
                <p className="mb-3 text-sm font-semibold">When & Where</p>
                <div className="flex items-center gap-3">
                  <EventDateIcon startsAt={event.starts_at} />
                  <div className="min-w-0 pt-0.5">
                    <p className="font-medium leading-tight">{dayLabel}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{timeRange}</p>
                  </div>
                </div>
              </div>

              {location ? (
                <div className="flex items-center gap-3 text-sm">
                  <EventLocationIcon />
                  <div className="min-w-0 pt-1">
                    <p className="font-medium">Location</p>
                    {isVirtual ? (
                      <a
                        href={location}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 block truncate text-muted-foreground underline-offset-4 hover:underline"
                      >
                        Join online
                      </a>
                    ) : (
                      <p className="mt-0.5 text-muted-foreground">{location}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm">
                  <EventMetaIconTile className="border-amber-500/30 bg-amber-500/10">
                    <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400" />
                  </EventMetaIconTile>
                  <div className="min-w-0 pt-1">
                    <p className="font-medium text-amber-700 dark:text-amber-400">Location missing</p>
                    <p className="mt-0.5 text-muted-foreground">
                      Add a location before the event starts.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <EventMetaIconTile>
                  <Users className="size-4 text-muted-foreground" />
                </EventMetaIconTile>
                <div className="min-w-0 pt-1">
                  <p className="font-medium">Registrations</p>
                  <p className="mt-0.5 text-muted-foreground">
                    {event.capacity != null
                      ? `${event.registration_count} / ${event.capacity} registered`
                      : `${event.registration_count} registered`}
                    {!registrationOpen ? " · closed" : ""}
                  </p>
                </div>
              </div>

              <div className="mt-auto flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="min-w-0 flex-1 gap-1.5"
                  render={<Link href={`/events/manage/${event.slug}/edit`} />}
                >
                  <Pencil className="size-3.5" />
                  Edit details
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-w-0 flex-1 gap-1.5"
                  render={<Link href={`/events/manage/${event.slug}/registrations`} />}
                >
                  <Ticket className="size-3.5" />
                  Manage register
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Public URL</p>
          <div className="flex items-center gap-2">
            <InputGroup className="h-8 max-w-sm min-w-0 flex-1">
              <InputGroupAddon align="inline-start" className="border-r border-border/80 bg-muted/40 px-2.5">
                <InputGroupText className="font-normal">/</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                className="h-8 text-sm"
                value={slugDraft}
                onChange={(e) => setSlugDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void updateSlug()
                  }
                }}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                aria-label="Event URL slug"
              />
            </InputGroup>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={updatingSlug || !slugDirty || !slugDraft.trim()}
              onClick={() => void updateSlug()}
              className="h-8 shrink-0"
            >
              {updatingSlug ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Update
            </Button>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="self-start text-destructive hover:text-destructive"
          disabled={deleting}
          onClick={() => void remove()}
        >
          {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Delete event
        </Button>
      </div>
      </StaggerItem>
    </StaggerContainer>
  )
}

export default function ManageEventPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <RequireRole mode="staff">
      <ManageEventContent params={params} />
    </RequireRole>
  )
}
