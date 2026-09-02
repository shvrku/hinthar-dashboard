"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { ArrowLeft, ArrowUpRight, Loader2 } from "lucide-react"

import { MarkdownContent } from "@/components/markdown-content"
import { EventDateIcon, EventLocationIcon } from "@/components/events/event-meta-icons"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { EventDetailSkeleton } from "@/components/skeleton/communications-skeleton"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { ApiError, createApi, publicRequest } from "@/lib/api"
import type { EventRegistrationStatus, SchoolEvent } from "@/lib/types"
import { isEventRegistrationOpen } from "@/lib/communications-labels"
import { formatBackendTime, parseBackendDateTime } from "@/lib/utils"

function formatEventDateLabel(startsAt: string): string {
  const start = parseBackendDateTime(startsAt)
  if (Number.isNaN(start.getTime())) return "—"
  return start.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

function formatEventTimeRange(startsAt: string, endsAt?: string | null): string {
  const startTime = formatBackendTime(startsAt)
  if (!endsAt) return startTime
  const endTime = formatBackendTime(endsAt)
  return `${startTime} – ${endTime}`
}

function formatStartingIn(startsAt: string, now = new Date()): string | null {
  const start = parseBackendDateTime(startsAt)
  if (Number.isNaN(start.getTime())) return null
  const ms = start.getTime() - now.getTime()
  if (ms <= 0) return null

  const totalMinutes = Math.floor(ms / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return "now"
}

const REGISTRATION_STATUS_COPY: Record<
  EventRegistrationStatus,
  { title: string; description: string }
> = {
  confirmed: {
    title: "Confirmed",
    description: "You're registered for this event.",
  },
  waitlisted: {
    title: "Waitlisted",
    description: "We'll let you know if a spot opens up.",
  },
  pending: {
    title: "Pending approval",
    description: "Your registration is waiting for staff review.",
  },
  cancelled: {
    title: "Cancelled",
    description: "You can register again if spots are still available.",
  },
}

export default function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [slug, setSlug] = React.useState<string | null>(null)
  const [event, setEvent] = React.useState<SchoolEvent | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [acting, setActing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    void params.then((p) => setSlug(p.slug))
  }, [params])

  const load = React.useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setError(null)
    try {
      if (isSignedIn) {
        const token = await getToken()
        if (!token) throw new Error("No auth token available")
        setEvent(await createApi(token).getEvent(slug))
      } else {
        setEvent(await publicRequest<SchoolEvent>(`/events/${slug}/`))
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError("Event not found.")
      } else {
        setError(err instanceof Error ? err.message : "Failed to load event")
      }
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn, slug])

  React.useEffect(() => {
    if (!isLoaded || !slug) return
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [isLoaded, load, slug])

  const register = async () => {
    if (!slug || !isSignedIn) {
      router.push(`/sign-in/?redirect_url=${encodeURIComponent(`/events/${slug}`)}`)
      return
    }
    setActing(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      await createApi(token).registerForEvent(slug)
      toast.add({ title: "Registration submitted.", type: "success" })
      await load()
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Registration failed",
        type: "error",
      })
    } finally {
      setActing(false)
    }
  }

  const cancel = async () => {
    if (!slug || !isSignedIn) return
    setActing(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      await createApi(token).cancelEventRegistration(slug)
      toast.add({ title: "Registration cancelled.", type: "success" })
      await load()
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Could not cancel registration",
        type: "error",
      })
    } finally {
      setActing(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <StaggerContainer className="flex flex-col gap-6">
        <StaggerItem>
          <EventDetailSkeleton />
        </StaggerItem>
      </StaggerContainer>
    )
  }

  if (error || !event) {
    return (
      <StaggerContainer className="flex flex-col gap-6">
        <StaggerItem>
          <p className="text-sm text-destructive">{error || "Event not found."}</p>
        </StaggerItem>
      </StaggerContainer>
    )
  }

  const registration = event.my_registration
  const registrationOpen = isEventRegistrationOpen(event)
  const canRegister = isSignedIn && !registration && registrationOpen
  const description = event.body.trim() || event.summary.trim()
  const location = event.location.trim()
  const isVirtualLocation = /^https?:\/\//i.test(location)
  const dateLabel = formatEventDateLabel(event.starts_at)
  const timeLabel = formatEventTimeRange(event.starts_at, event.ends_at)
  const statusCopy = registration ? REGISTRATION_STATUS_COPY[registration.status] : null
  const startingIn = formatStartingIn(event.starts_at)

  return (
    <StaggerContainer className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-8">
      <StaggerItem>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit gap-1.5"
          render={<Link href="/events" />}
        >
          <ArrowLeft className="size-4" />
          Events
        </Button>
      </StaggerItem>

      <StaggerItem>
        <div className="min-w-0 space-y-5">
          <h1 className="text-3xl font-bold tracking-tight break-words sm:text-4xl">{event.title}</h1>

          <div className="space-y-3.5 text-sm">
            <div className="flex items-center gap-3">
              <EventDateIcon startsAt={event.starts_at} />
              <div className="min-w-0">
                <p className="font-medium leading-tight text-foreground">{dateLabel}</p>
                <p className="mt-0.5 text-muted-foreground">{timeLabel}</p>
              </div>
            </div>

            {location ? (
              <div className="flex items-center gap-3">
                <EventLocationIcon />
                <div className="min-w-0">
                  {isVirtualLocation ? (
                    <>
                      <a
                        href={location}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                      >
                        Online
                        <ArrowUpRight className="size-3.5 shrink-0 opacity-70" />
                      </a>
                      <p className="mt-0.5 truncate text-muted-foreground">Join via link</p>
                    </>
                  ) : (
                    <p className="select-text break-words font-medium leading-snug text-foreground">
                      {location}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="rounded-2xl border border-border/70 bg-muted/35 px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                {registration && registration.status !== "cancelled" ? (
                  <>
                    <p className="font-semibold">{statusCopy?.title}</p>
                    <p className="text-sm text-muted-foreground">{statusCopy?.description}</p>
                  </>
                ) : !registrationOpen ? (
                  <>
                    <p className="font-semibold">Registration closed</p>
                    <p className="text-sm text-muted-foreground">
                      This event is no longer accepting registrations.
                    </p>
                  </>
                ) : !isSignedIn ? (
                  <>
                    <p className="font-semibold">Sign in to register</p>
                    <p className="text-sm text-muted-foreground">
                      Sign in to reserve your spot for this event.
                    </p>
                  </>
                ) : canRegister ? (
                  <>
                    <p className="font-semibold">Registration open</p>
                    <p className="text-sm text-muted-foreground">
                      {event.capacity != null
                        ? `${event.registration_count} of ${event.capacity} spots taken`
                        : `${event.registration_count} registered`}
                    </p>
                  </>
                ) : null}
              </div>

              {startingIn ? (
                <span className="inline-flex shrink-0 items-center rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
                  Starting in <span className="ml-1 font-medium text-foreground">{startingIn}</span>
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {canRegister ? (
                <Button onClick={register} disabled={acting} className="rounded-full px-6">
                  {acting ? <Loader2 className="size-4 animate-spin" /> : "Register"}
                </Button>
              ) : null}
              {registration && registration.status !== "cancelled" ? (
                <Button variant="outline" onClick={cancel} disabled={acting} className="rounded-full px-6">
                  {acting ? <Loader2 className="size-4 animate-spin" /> : "Cancel"}
                </Button>
              ) : null}
              {!isSignedIn && registrationOpen ? (
                <Button
                  className="rounded-full px-6"
                  render={<Link href={`/sign-in/?redirect_url=${encodeURIComponent(`/events/${event.slug}`)}`} />}
                >
                  Sign in
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </StaggerItem>

      {description ? (
        <StaggerItem>
          <section className="min-w-0 space-y-3 overflow-hidden">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              About event
            </h2>
            <MarkdownContent
              source={description}
              className="min-w-0 text-base leading-relaxed"
            />
          </section>
        </StaggerItem>
      ) : null}

      {location ? (
        <StaggerItem>
          <section className="min-w-0 space-y-3">
            <h2 className="border-b border-border/80 pb-2 text-base font-semibold">Location</h2>
            {isVirtualLocation ? (
              <a
                href={location}
                target="_blank"
                rel="noreferrer"
                className="block select-text break-all font-medium underline-offset-4 hover:underline"
              >
                {location}
              </a>
            ) : (
              <p className="select-text break-words font-medium leading-relaxed">{location}</p>
            )}
          </section>
        </StaggerItem>
      ) : null}
    </StaggerContainer>
  )
}
