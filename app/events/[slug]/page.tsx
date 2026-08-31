"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { CalendarDays, Loader2, MapPin } from "lucide-react"

import { ApiError, createApi, publicRequest } from "@/lib/api"
import type { SchoolEvent } from "@/lib/types"
import {
  EVENT_AUDIENCE_LABELS,
  EVENT_REGISTRATION_MODE_LABELS,
  EVENT_REGISTRATION_STATUS_LABELS,
} from "@/lib/communications-labels"
import { formatBackendTime } from "@/lib/utils"
import { MarkdownContent } from "@/components/markdown-content"
import { TagBadges } from "@/components/tag-chips"
import { StandardPageHeader } from "@/components/standard-page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/components/ui/toast"

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
      <div className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !event) {
    return <p className="text-sm text-destructive">{error || "Event not found."}</p>
  }

  const registration = event.my_registration
  const canRegister = isSignedIn && !registration

  return (
    <div className="flex flex-col gap-6">
      <StandardPageHeader
        title={event.title}
        description={event.summary}
        back={{ href: "/events", label: "Events" }}
      />

      {event.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.cover_image_url}
          alt=""
          className="max-h-80 w-full rounded-xl border object-cover"
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={event.audience === "external" ? "default" : "secondary"}>
          {EVENT_AUDIENCE_LABELS[event.audience]}
        </Badge>
        <Badge variant="outline">
          {EVENT_REGISTRATION_MODE_LABELS[event.registration_mode]}
        </Badge>
        {registration ? (
          <Badge variant="outline">{EVENT_REGISTRATION_STATUS_LABELS[registration.status]}</Badge>
        ) : null}
        <TagBadges tags={event.tags} />
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="size-4" />
          {formatBackendTime(event.starts_at)}
          {event.ends_at ? ` – ${formatBackendTime(event.ends_at)}` : ""}
        </span>
        {event.location ? (
          <span className="inline-flex items-center gap-2">
            <MapPin className="size-4" />
            {event.location}
          </span>
        ) : null}
      </div>

      <MarkdownContent source={event.body} />

      <Card>
        <CardContent className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {event.capacity != null
              ? `${event.registration_count} / ${event.capacity} confirmed`
              : `${event.registration_count} confirmed`}
          </div>
          <div className="flex gap-2">
            {canRegister ? (
              <Button onClick={register} disabled={acting}>
                {acting ? <Loader2 className="size-4 animate-spin" /> : "Register"}
              </Button>
            ) : null}
            {registration && registration.status !== "cancelled" ? (
              <Button variant="outline" onClick={cancel} disabled={acting}>
                Cancel registration
              </Button>
            ) : null}
            {!isSignedIn ? (
              <Button render={<Link href={`/sign-in/?redirect_url=${encodeURIComponent(`/events/${event.slug}`)}`} />}>
                Sign in to register
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
