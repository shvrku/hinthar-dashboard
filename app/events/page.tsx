"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { CalendarDays, Loader2, MapPin, Search } from "lucide-react"

import { useRouter } from "next/navigation"
import { buildQueryString, createApi, publicRequest } from "@/lib/api"
import type { CommTag, Paginated, SchoolEvent } from "@/lib/types"
import {
  EVENT_AUDIENCE_LABELS,
  EVENT_REGISTRATION_STATUS_LABELS,
} from "@/lib/communications-labels"
import { formatBackendTime } from "@/lib/utils"
import { StandardPageHeader } from "@/components/standard-page-header"
import { TagBadges, TagChips } from "@/components/tag-chips"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import { isStaffOrAbove } from "@/lib/roles"
import { useCurrentUser } from "@/components/current-user-provider"

function formatEventWhen(startsAt: string, endsAt: string | null): string {
  const start = new Date(startsAt)
  const date = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const time = formatBackendTime(startsAt)
  if (!endsAt) return `${date} · ${time}`
  return `${date} · ${time} – ${formatBackendTime(endsAt)}`
}

function EventCard({ event }: { event: SchoolEvent }) {
  return (
    <Link href={`/events/${event.slug}`} className="block">
      <Card className="h-full transition-colors hover:bg-muted/30">
      {event.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.cover_image_url}
          alt=""
          className="h-40 w-full rounded-t-xl object-cover"
        />
      ) : null}
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={event.audience === "external" ? "default" : "secondary"}>
            {EVENT_AUDIENCE_LABELS[event.audience]}
          </Badge>
          {event.my_registration ? (
            <Badge variant="outline">
              {EVENT_REGISTRATION_STATUS_LABELS[event.my_registration.status]}
            </Badge>
          ) : null}
        </div>
        <CardTitle>{event.title}</CardTitle>
        <CardDescription>{event.summary || "School event"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4 shrink-0" />
          <span>{formatEventWhen(event.starts_at, event.ends_at)}</span>
        </div>
        {event.location ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" />
            <span>{event.location}</span>
          </div>
        ) : null}
        <TagBadges tags={event.tags} />
      </CardContent>
      </Card>
    </Link>
  )
}

export default function EventsPage() {
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { role } = useCurrentUser()
  const [events, setEvents] = React.useState<SchoolEvent[]>([])
  const [tags, setTags] = React.useState<CommTag[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const [tab, setTab] = React.useState("open")

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300)
    return () => window.clearTimeout(id)
  }, [searchQuery])

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page_size: 200,
        tag: selectedTag ?? undefined,
        q: debouncedQuery || undefined,
        when: tab === "past" ? "past" : tab === "open" ? "upcoming" : undefined,
      }
      let data: Paginated<SchoolEvent>
      if (isSignedIn) {
        const token = await getToken()
        if (!token) throw new Error("No auth token available")
        data = await createApi(token).listEvents(params)
        const tagData = await createApi(token).listTags({ scope: "event" })
        setTags(tagData)
      } else {
        data = await publicRequest<Paginated<SchoolEvent>>(
          `/events${buildQueryString(params)}`
        )
      }
      setEvents(data.results)
    } catch (err) {
      toast.add({
        title: err instanceof Error ? err.message : "Failed to load events",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, getToken, isSignedIn, selectedTag, tab])

  React.useEffect(() => {
    if (!isLoaded) return
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [isLoaded, load])

  const myRegistered = events.filter((event) => event.my_registration)

  return (
    <div className="flex flex-col gap-6">
      <StandardPageHeader
        title="Events"
        description={
          isSignedIn
            ? "Browse public and internal school events in one place."
            : "Browse public school events. Sign in to register or see internal events."
        }
        primaryAction={
          isStaffOrAbove(role)
            ? { label: "Manage events", onClick: () => router.push("/events/manage") }
            : undefined
        }
      />

      <Card className="border-border/80 bg-card p-4 shadow-2xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1 md:max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events"
              className="pl-9"
            />
          </div>
          {isSignedIn ? <TagChips tags={tags} selectedSlug={selectedTag} onSelect={setSelectedTag} /> : null}
        </div>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          {isSignedIn ? <TabsTrigger value="mine">My registrations</TabsTrigger> : null}
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
        <TabsContent value="open" className="mt-4">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-8 animate-spin" />
              <p>Loading open events…</p>
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events found.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
        {isSignedIn ? (
          <TabsContent value="mine" className="mt-4">
            {myRegistered.length === 0 ? (
              <p className="text-sm text-muted-foreground">You have not registered for any open events yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {myRegistered.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>
        ) : null}
        <TabsContent value="past" className="mt-4">
          {!loading && events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No past events found.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {!isSignedIn ? (
        <Card>
          <CardContent className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Sign in to register for events and view internal school events.
            </p>
            <Button render={<Link href="/sign-in/" />}>Sign in</Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
