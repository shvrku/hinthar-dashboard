"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { CalendarDays, MapPin, Search } from "lucide-react"

import { useCurrentUser } from "@/components/current-user-provider"
import { StandardPageHeader } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { EventsHomeSkeleton } from "@/components/skeleton/communications-skeleton"
import { TagChips } from "@/components/tag-chips"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import { buildQueryString, createApi, publicRequest } from "@/lib/api"
import {
  EVENT_AUDIENCE_LABELS,
  EVENT_REGISTRATION_STATUS_LABELS,
} from "@/lib/communications-labels"
import { isStaffOrAbove } from "@/lib/roles"
import type { CommTag, Paginated, SchoolEvent } from "@/lib/types"
import {
  formatBackendTime,
  parseBackendDateTime,
  toLocalDateString,
} from "@/lib/utils"

function dateGroupKey(iso: string): string {
  return toLocalDateString(parseBackendDateTime(iso))
}

function formatDateGroupLabel(isoDate: string): { primary: string; weekday: string } {
  const today = toLocalDateString()
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = toLocalDateString(tomorrowDate)

  const date = new Date(`${isoDate}T12:00:00`)
  const weekday = date.toLocaleDateString(undefined, { weekday: "long" })

  if (isoDate === today) return { primary: "Today", weekday }
  if (isoDate === tomorrow) return { primary: "Tomorrow", weekday }

  return {
    primary: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    weekday,
  }
}

function groupEventsByDate(events: SchoolEvent[]) {
  const groups = new Map<string, SchoolEvent[]>()
  for (const event of events) {
    const key = dateGroupKey(event.starts_at)
    const list = groups.get(key) ?? []
    list.push(event)
    groups.set(key, list)
  }
  return Array.from(groups.entries()).map(([date, items]) => ({ date, items }))
}

function EventListRow({
  event,
  showManage,
}: {
  event: SchoolEvent
  showManage?: boolean
}) {
  const location = event.location.trim()
  const isVirtual = /^https?:\/\//i.test(location)
  const startTime = formatBackendTime(event.starts_at)
  const endTime = event.ends_at ? formatBackendTime(event.ends_at) : null
  const timeLabel = endTime ? `${startTime} – ${endTime}` : startTime

  return (
    <div className="rounded-2xl border border-border/80 bg-card px-4 py-4 shadow-xs transition-colors hover:bg-muted/15 sm:px-5 sm:py-5">
      <Link href={`/events/${event.slug}`} className="group block space-y-2 text-left">
        <p className="text-sm font-medium text-muted-foreground">{timeLabel}</p>

        <h3 className="text-lg font-semibold tracking-tight group-hover:underline sm:text-xl">
          {event.title}
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={event.audience === "external" ? "default" : "secondary"} className="font-normal">
            {EVENT_AUDIENCE_LABELS[event.audience]}
          </Badge>
          {event.my_registration ? (
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              {EVENT_REGISTRATION_STATUS_LABELS[event.my_registration.status]}
            </Badge>
          ) : null}
        </div>

        {location ? (
          <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{isVirtual ? "Online" : location}</span>
          </p>
        ) : null}
      </Link>

      {showManage ? (
        <div className="mt-3">
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/events/manage/${event.slug}`} />}
          >
            Manage
          </Button>
        </div>
      ) : null}
    </div>
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

  const visibleEvents =
    tab === "mine" ? events.filter((event) => event.my_registration) : events
  const grouped = groupEventsByDate(visibleEvents)
  const staff = isStaffOrAbove(role)

  return (
    <StaggerContainer className="flex w-full flex-col gap-6">
      <StaggerItem>
        <div className="space-y-6">
          <StandardPageHeader
            className="mb-0 pb-4"
            title="Events"
            description={
              isSignedIn
                ? "What’s happening at school — upcoming activities and gatherings."
                : "Browse public school events. Sign in to register or see internal events."
            }
          >
            <div className="relative w-full sm:w-64">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events"
                className="h-9 rounded-full pl-9"
              />
            </div>
          </StandardPageHeader>

          <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="h-auto rounded-full bg-muted/50 p-1">
                <TabsTrigger value="open" className="rounded-full px-4">
                  Upcoming
                </TabsTrigger>
                {isSignedIn ? (
                  <TabsTrigger value="mine" className="rounded-full px-4">
                    Going
                  </TabsTrigger>
                ) : null}
                <TabsTrigger value="past" className="rounded-full px-4">
                  Past
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {isSignedIn ? (
              <TagChips tags={tags} selectedSlug={selectedTag} onSelect={setSelectedTag} />
            ) : null}
          </div>
        </div>
      </StaggerItem>

      {loading ? (
        <StaggerItem className="mx-auto w-full max-w-4xl">
          <EventsHomeSkeleton />
        </StaggerItem>
      ) : grouped.length === 0 ? (
        <StaggerItem className="mx-auto w-full max-w-4xl">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/80 px-6 py-16 text-center">
            <CalendarDays className="size-8 text-muted-foreground/50" />
            <p className="font-medium">No events found</p>
            <p className="text-sm text-muted-foreground">
              {tab === "mine"
                ? "You haven’t registered for any upcoming events yet."
                : "Check back soon or try a different search."}
            </p>
            {staff ? (
              <Button className="mt-2 rounded-full" onClick={() => router.push("/events/manage")}>
                Manage events
              </Button>
            ) : null}
          </div>
        </StaggerItem>
      ) : (
        <div className="mx-auto w-full max-w-4xl">
          {grouped.map(({ date, items }, index) => {
            const label = formatDateGroupLabel(date)
            const isFirst = index === 0
            const isLast = index === grouped.length - 1
            return (
              <section
                key={date}
                className="grid grid-cols-[4.5rem_0.75rem_1fr] gap-x-3 sm:grid-cols-[5.5rem_1rem_1fr] sm:gap-x-4"
              >
                <div className="pt-1">
                  <p className="text-sm font-semibold leading-tight tracking-tight sm:text-[15px]">
                    {label.primary}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{label.weekday}</p>
                </div>

                <div className="relative flex justify-center self-stretch" aria-hidden>
                  {/* Continuous rail through dots */}
                  {!(isFirst && isLast) ? (
                    <span
                      className={[
                        "absolute left-1/2 w-px -translate-x-1/2 bg-border",
                        isFirst ? "top-[0.8125rem]" : "top-0",
                        isLast ? "bottom-[calc(100%-0.8125rem)]" : "bottom-0",
                      ].join(" ")}
                    />
                  ) : null}
                  <span className="relative z-10 mt-2 size-2.5 shrink-0 rounded-full border-2 border-muted-foreground/35 bg-background" />
                </div>

                <div className={`min-w-0 space-y-3 ${isLast ? "pb-0" : "pb-8"}`}>
                  {items.map((event) => (
                    <StaggerItem key={event.id}>
                      <EventListRow event={event} showManage={staff} />
                    </StaggerItem>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {!isSignedIn ? (
        <StaggerItem>
          <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-muted/20 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Sign in to register for events and view internal school events.
            </p>
            <Button className="rounded-full" render={<Link href="/sign-in/" />}>
              Sign in
            </Button>
          </div>
        </StaggerItem>
      ) : null}
    </StaggerContainer>
  )
}
