"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { Megaphone, Pencil, Pin, Plus, Search, Star } from "lucide-react"

import { MarkdownContent } from "@/components/markdown-content"
import { AnnouncementsListSkeleton } from "@/components/skeleton/communications-skeleton"
import { TagBadges, TagChips } from "@/components/tag-chips"
import { StandardPageHeader } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { isStaffOrAbove } from "@/lib/roles"
import { useCurrentUser } from "@/components/current-user-provider"
import { createApi } from "@/lib/api"
import type { Announcement, CommTag } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function pickFeatured(items: Announcement[]) {
  if (items.length === 0) return null
  return [...items].sort((a, b) => {
    const aTime = a.published_at ? new Date(a.published_at).getTime() : 0
    const bTime = b.published_at ? new Date(b.published_at).getTime() : 0
    return bTime - aTime
  })[0]
}

function FeaturedAnnouncementHero({
  item,
  staff,
}: {
  item: Announcement
  staff: boolean
}) {
  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="gap-1">
              <Star className="size-3" />
              Latest
            </Badge>
            <TagBadges tags={item.tags} />
          </div>
          <CardTitle className="text-2xl sm:text-3xl">{item.title}</CardTitle>
          <CardDescription className="text-sm">
            {item.published_at
              ? new Date(item.published_at).toLocaleString()
              : "Recently published"}
            {item.author_name ? ` · ${item.author_name}` : ""}
          </CardDescription>
        </div>
        {staff ? (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5"
            render={<Link href={`/announcements/${item.slug}/edit`} />}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <MarkdownContent source={item.body} className="text-base leading-relaxed" />
      </CardContent>
    </Card>
  )
}

function AnnouncementListRow({
  item,
  staff,
}: {
  item: Announcement
  staff: boolean
}) {
  return (
    <Card className="transition-colors hover:bg-muted/20">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {item.is_pinned ? (
              <Badge variant="secondary" className="gap-1">
                <Pin className="size-3" /> Pinned
              </Badge>
            ) : null}
            <TagBadges tags={item.tags} />
          </div>
          <CardTitle className="text-lg">{item.title}</CardTitle>
          <CardDescription>
            {item.published_at
              ? new Date(item.published_at).toLocaleString()
              : "Recently published"}
            {item.author_name ? ` · ${item.author_name}` : ""}
          </CardDescription>
        </div>
        {staff ? (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5"
            render={<Link href={`/announcements/${item.slug}/edit`} />}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <MarkdownContent source={item.body} className="text-sm line-clamp-4 [&_p]:my-1" />
      </CardContent>
    </Card>
  )
}

export default function AnnouncementsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { role } = useCurrentUser()
  const staff = isStaffOrAbove(role)
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([])
  const [tags, setTags] = React.useState<CommTag[]>([])
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null)
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
      const api = createApi(token)
      const [data, tagData] = await Promise.all([
        api.listAnnouncements({
          page_size: 200,
          tag: selectedTag ?? undefined,
          q: debouncedQuery || undefined,
        }),
        api.listTags({ scope: "announcement" }),
      ])
      setAnnouncements(data.results)
      setTags(tagData)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load announcements")
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, getToken, isSignedIn, selectedTag])

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [isLoaded, isSignedIn, load])

  if (!isLoaded) {
    return <AnnouncementsListSkeleton />
  }

  const featured = pickFeatured(announcements)
  const pinned = announcements.filter((item) => item.is_pinned && item.id !== featured?.id)
  const archive = announcements.filter(
    (item) => item.id !== featured?.id && !item.is_pinned
  )

  return (
    <StaggerContainer className="flex flex-col gap-6">
      <StaggerItem>
        <StandardPageHeader
          title="Announcements"
          description="School updates for students, parents, teachers, and staff."
        >
          {staff ? (
            <Button render={<Link href="/announcements/new" />} className="gap-2">
              <Plus className="size-4" />
              Add announcement
            </Button>
          ) : null}
        </StandardPageHeader>
      </StaggerItem>

      <StaggerItem>
        <Card className="border-border/80 bg-card p-4 shadow-2xs">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-0 flex-1 md:max-w-sm">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search announcements"
                className="h-10 rounded-xl pl-9"
              />
            </div>
            <TagChips tags={tags} selectedSlug={selectedTag} onSelect={setSelectedTag} />
          </div>
        </Card>
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
      ) : announcements.length === 0 ? (
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
                <Button render={<Link href="/announcements/new" />} className="gap-2">
                  <Plus className="size-4" />
                  Add announcement
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </StaggerItem>
      ) : (
        <>
          {featured ? (
            <StaggerItem>
              <FeaturedAnnouncementHero item={featured} staff={staff} />
            </StaggerItem>
          ) : null}

          {pinned.length > 0 ? (
            <StaggerItem>
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Pin className="size-4" />
                  Pinned
                </h2>
                {pinned.map((item) => (
                  <AnnouncementListRow key={item.id} item={item} staff={staff} />
                ))}
              </div>
            </StaggerItem>
          ) : null}

          {archive.length > 0 ? (
            <StaggerItem>
              <div className="space-y-3">
                {(pinned.length > 0 || featured) && (
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    All announcements
                  </h2>
                )}
                {archive.map((item) => (
                  <AnnouncementListRow key={item.id} item={item} staff={staff} />
                ))}
              </div>
            </StaggerItem>
          ) : null}
        </>
      )}
    </StaggerContainer>
  )
}
