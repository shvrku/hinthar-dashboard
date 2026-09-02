"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { Megaphone, Plus, Search } from "lucide-react"

import {
  AnnouncementPinnedTag,
  AnnouncementTagChip,
} from "@/components/announcements/announcement-tags"
import { AnnouncementsListSkeleton } from "@/components/skeleton/communications-skeleton"
import { StandardPageHeader } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { useCurrentUser } from "@/components/current-user-provider"
import { createApi } from "@/lib/api"
import { descriptionPreview } from "@/lib/event-draft"
import { isStaffOrAbove } from "@/lib/roles"
import type { Announcement } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function formatListDate(iso: string | null) {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function AnnouncementPressRow({ item }: { item: Announcement }) {
  const excerpt = descriptionPreview(item.body)
  // Cap preview shorter than the shared helper so list rows stay tight.
  const preview =
    excerpt.length > 140 ? `${excerpt.slice(0, 140).trimEnd()}…` : excerpt
  const showTags = item.is_pinned || item.tags.length > 0

  return (
    <Link
      href={`/announcements/${item.slug}`}
      className="group block space-y-2 py-8 transition-colors"
    >
      <time
        dateTime={item.published_at ?? undefined}
        className="block text-sm text-muted-foreground"
      >
        {formatListDate(item.published_at)}
      </time>

      <h2 className="text-2xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-foreground/80 sm:text-[1.75rem]">
        {item.title}
      </h2>

      {preview ? (
        <p className="line-clamp-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {preview}
        </p>
      ) : null}

      {showTags ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {item.is_pinned ? <AnnouncementPinnedTag /> : null}
          {item.tags.map((tag) => (
            <AnnouncementTagChip key={tag.slug} name={tag.name} slug={tag.slug} />
          ))}
        </div>
      ) : null}
    </Link>
  )
}

export default function AnnouncementsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { role } = useCurrentUser()
  const staff = isStaffOrAbove(role)
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300)
    return () => window.clearTimeout(id)
  }, [searchQuery])

  const load = React.useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setLoadError(null)
    try {
      const token = await getToken()
      if (!token) return
      const data = await createApi(token).listAnnouncements({
        page_size: 200,
        q: debouncedQuery || undefined,
      })
      setAnnouncements(data.results)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load announcements")
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, getToken, isSignedIn])

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [isLoaded, isSignedIn, load])

  const sorted = React.useMemo(() => {
    return [...announcements].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      const aTime = a.published_at ? new Date(a.published_at).getTime() : 0
      const bTime = b.published_at ? new Date(b.published_at).getTime() : 0
      return bTime - aTime
    })
  }, [announcements])

  if (!isLoaded) {
    return (
      <StaggerContainer className="flex flex-col gap-6">
        <StaggerItem>
          <StandardPageHeader
            className="mb-0"
            title="Announcements"
            description="School updates for students, parents, teachers, and staff."
          />
        </StaggerItem>
        <StaggerItem>
          <AnnouncementsListSkeleton />
        </StaggerItem>
      </StaggerContainer>
    )
  }

  return (
    <StaggerContainer className="flex flex-col gap-6">
      <StaggerItem>
        <StandardPageHeader
          className="mb-0"
          title="Announcements"
          description="School updates for students, parents, teachers, and staff."
        >
          <div className="relative w-full sm:w-64">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search announcements"
              className="h-9 rounded-full pl-9"
            />
          </div>
          {staff ? (
            <Button
              size="icon"
              className="size-9 shrink-0 rounded-full"
              aria-label="Add announcement"
              render={<Link href="/announcements/new" />}
            >
              <Plus className="size-4" />
            </Button>
          ) : null}
        </StandardPageHeader>
      </StaggerItem>

      {loading ? (
        <StaggerItem>
          <AnnouncementsListSkeleton />
        </StaggerItem>
      ) : loadError ? (
        <StaggerItem>
          <Card>
            <CardContent className="py-10 text-center text-sm text-destructive">
              {loadError}
            </CardContent>
          </Card>
        </StaggerItem>
      ) : sorted.length === 0 ? (
        <StaggerItem>
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Megaphone className="size-8 text-muted-foreground/50" />
              <p className="font-medium">No announcements yet</p>
              <p className="text-sm text-muted-foreground">
                {staff
                  ? "Create the first announcement for your school community."
                  : "Check back later for school updates."}
              </p>
              {staff ? (
                <Button
                  size="icon"
                  className="size-9 rounded-full"
                  aria-label="Add announcement"
                  render={<Link href="/announcements/new" />}
                >
                  <Plus className="size-4" />
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </StaggerItem>
      ) : (
        <div className="mx-auto w-full max-w-3xl divide-y divide-border/70">
          {sorted.map((item) => (
            <StaggerItem key={item.id}>
              <AnnouncementPressRow item={item} />
            </StaggerItem>
          ))}
        </div>
      )}
    </StaggerContainer>
  )
}
