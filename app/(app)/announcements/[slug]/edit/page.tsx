"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

import {
  AnnouncementEditorForm,
  type AnnouncementDraft,
} from "@/components/announcements/announcement-editor-form"
import { StandardPageHeader } from "@/components/standard-page-header"
import { EditorPageSkeleton } from "@/components/skeleton/communications-skeleton"
import { ApiError, createApi } from "@/lib/api"
import { notifySaveError, notifySaveSuccess } from "@/lib/editor-save"
import type { Announcement } from "@/lib/types"

function toDraft(item: Announcement): AnnouncementDraft {
  return {
    title: item.title,
    body: item.body,
    is_pinned: item.is_pinned,
    tag_names: item.tags.map((tag) => tag.name).join(", "),
  }
}

export default function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const router = useRouter()
  const { getToken, isLoaded } = useAuth()
  const [slug, setSlug] = React.useState<string | null>(null)
  const [initial, setInitial] = React.useState<AnnouncementDraft | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
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
          const item = await createApi(token).getAnnouncement(slug)
          if (!cancelled) setInitial(toDraft(item))
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

  const save = async (draft: AnnouncementDraft) => {
    if (!slug) return
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      await createApi(token).updateAnnouncement(slug, {
        title: draft.title.trim(),
        body: draft.body,
        is_featured: false,
        is_pinned: draft.is_pinned,
        tag_names: draft.tag_names
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      })
      notifySaveSuccess("Announcement updated.", () => router.push("/announcements"))
    } catch (err) {
      notifySaveError(err, "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded || loading) {
    return <EditorPageSkeleton label="Loading announcement…" />
  }

  if (error || !initial) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-sm text-destructive">{error || "Announcement not found."}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <StandardPageHeader
        title="Edit announcement"
        description="Update content and visibility options."
        back={{ href: "/announcements", label: "Announcements" }}
      />
      <AnnouncementEditorForm
        editorKey={`announcement-edit-${slug}`}
        initial={initial}
        saving={saving}
        submitLabel="Save changes"
        onSubmit={save}
        onCancel={() => router.push("/announcements")}
      />
    </div>
  )
}
