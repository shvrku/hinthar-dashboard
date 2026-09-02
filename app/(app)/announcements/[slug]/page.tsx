"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { ArrowLeft, Pencil } from "lucide-react"

import { MarkdownContent } from "@/components/markdown-content"
import { AnnouncementDetailSkeleton } from "@/components/skeleton/communications-skeleton"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { useCurrentUser } from "@/components/current-user-provider"
import { ApiError, createApi } from "@/lib/api"
import { isStaffOrAbove } from "@/lib/roles"
import type { Announcement } from "@/lib/types"
import { Button } from "@/components/ui/button"

function formatDetailDate(iso: string | null) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { getToken, isLoaded } = useAuth()
  const { role } = useCurrentUser()
  const staff = isStaffOrAbove(role)
  const [slug, setSlug] = React.useState<string | null>(null)
  const [item, setItem] = React.useState<Announcement | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    void params.then((p) => setSlug(p.slug))
  }, [params])

  React.useEffect(() => {
    if (!isLoaded || !slug) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true)
        setError(null)
        try {
          const token = await getToken()
          if (!token) throw new Error("No auth token available")
          const data = await createApi(token).getAnnouncement(slug)
          if (!cancelled) setItem(data)
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof ApiError ? err.userMessage : "Failed to load announcement")
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [getToken, isLoaded, slug])

  if (!isLoaded || loading) {
    return (
      <StaggerContainer className="flex flex-col gap-6">
        <StaggerItem>
          <AnnouncementDetailSkeleton />
        </StaggerItem>
      </StaggerContainer>
    )
  }

  if (error || !item) {
    return (
      <StaggerContainer className="flex flex-col gap-6">
        <StaggerItem>
          <div className="mx-auto max-w-lg py-16 text-center">
            <p className="text-sm text-destructive">{error || "Announcement not found."}</p>
            <Button className="mt-4" variant="outline" render={<Link href="/announcements" />}>
              Back to announcements
            </Button>
          </div>
        </StaggerItem>
      </StaggerContainer>
    )
  }

  const publishedLabel = formatDetailDate(item.published_at)
  const meta = [publishedLabel, item.author_name ? `By ${item.author_name}` : null]
    .filter(Boolean)
    .join(" · ")

  return (
    <StaggerContainer className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-8">
      <StaggerItem>
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 w-fit gap-1.5"
            render={<Link href="/announcements" />}
          >
            <ArrowLeft className="size-4" />
            Announcements
          </Button>
          {staff ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              render={<Link href={`/announcements/${item.slug}/edit`} />}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          ) : null}
        </div>
      </StaggerItem>

      <StaggerItem>
        <header className="min-w-0 space-y-3">
          <h1 className="text-3xl font-bold tracking-tight break-words sm:text-4xl">{item.title}</h1>
          {meta ? <p className="text-sm text-muted-foreground">{meta}</p> : null}
        </header>
      </StaggerItem>

      <StaggerItem>
        <MarkdownContent
          source={item.body}
          className="min-w-0 text-base leading-relaxed sm:text-[17px]"
        />
      </StaggerItem>
    </StaggerContainer>
  )
}
