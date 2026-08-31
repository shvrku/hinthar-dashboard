"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

import { EventEditorForm } from "@/components/events/event-editor-form"
import { RequireRole } from "@/components/require-role"
import { StandardPageHeader } from "@/components/standard-page-header"
import { EditorPageSkeleton } from "@/components/skeleton/communications-skeleton"
import { ApiError, createApi } from "@/lib/api"
import { toast } from "@/components/ui/toast"

function NewEventContent() {
  const router = useRouter()
  const { getToken, isLoaded } = useAuth()
  const [saving, setSaving] = React.useState(false)

  const publish = async (draft: {
    title: string
    summary: string
    body: string
    audience: "internal" | "external"
    registration_mode: "instant_waitlist" | "approval_required"
    starts_at: string
    ends_at: string
    location: string
    capacity: string
    cover_image_url: string
    tag_names: string
  }) => {
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      await createApi(token).createEvent({
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        body: draft.body,
        audience: draft.audience,
        registration_mode: draft.registration_mode,
        status: "published",
        starts_at: new Date(draft.starts_at).toISOString(),
        ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null,
        location: draft.location,
        capacity: draft.capacity ? Number(draft.capacity) : null,
        cover_image_url: draft.cover_image_url,
        tag_names: draft.tag_names
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      })
      toast.add({ title: "Event published.", type: "success" })
      router.push("/events/manage")
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Failed to publish event",
        type: "error",
      })
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
        title="New event"
        description="Create a school event with live markdown preview."
        back={{ href: "/events/manage", label: "Manage events" }}
      />
      <EventEditorForm
        draftKey="hinthar:draft:event:new"
        saving={saving}
        submitLabel="Publish"
        onSubmit={publish}
        onCancel={() => router.push("/events/manage")}
      />
    </div>
  )
}

export default function NewEventPage() {
  return (
    <RequireRole mode="staff">
      <NewEventContent />
    </RequireRole>
  )
}
