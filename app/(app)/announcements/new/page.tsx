"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

import { AnnouncementEditorForm } from "@/components/announcements/announcement-editor-form"
import { StandardPageHeader } from "@/components/standard-page-header"
import { EditorPageSkeleton } from "@/components/skeleton/communications-skeleton"
import { ApiError, createApi } from "@/lib/api"
import { notifySaveError, notifySaveSuccess } from "@/lib/editor-save"

export default function NewAnnouncementPage() {
  const router = useRouter()
  const { getToken, isLoaded } = useAuth()
  const [saving, setSaving] = React.useState(false)

  const publish = async (draft: {
    title: string
    body: string
    is_featured: boolean
    is_pinned: boolean
    tag_names: string
  }) => {
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      await createApi(token).createAnnouncement({
        title: draft.title.trim(),
        body: draft.body,
        status: "published",
        is_featured: false,
        is_pinned: draft.is_pinned,
        tag_names: draft.tag_names
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      })
      notifySaveSuccess("Announcement published.", () => router.push("/announcements"))
    } catch (err) {
      notifySaveError(err, "Failed to publish")
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded) {
    return <EditorPageSkeleton label="Preparing editor…" />
  }

  return (
    <div className="flex flex-col gap-6">
      <StandardPageHeader
        title="New announcement"
        description="Write school updates with live markdown preview."
        back={{ href: "/announcements", label: "Announcements" }}
      />
      <AnnouncementEditorForm
        editorKey="announcement-new"
        saving={saving}
        submitLabel="Publish"
        onSubmit={publish}
        onCancel={() => router.push("/announcements")}
      />
    </div>
  )
}
