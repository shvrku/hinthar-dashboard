"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

import { EventComposeScreen } from "@/components/events/event-compose-screen"
import { RequireRole } from "@/components/require-role"
import { EventComposeSkeleton } from "@/components/skeleton/communications-skeleton"
import { ApiError, createApi } from "@/lib/api"
import { draftToApiPayload, createEmptyEventDraft, type EventDraft } from "@/lib/event-draft"
import { notifySaveError, notifySaveSuccess } from "@/lib/editor-save"

function NewEventContent() {
  const router = useRouter()
  const { getToken, isLoaded } = useAuth()
  const [saving, setSaving] = React.useState(false)

  const publish = async (draft: EventDraft) => {
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const event = await createApi(token).createEvent({
        ...draftToApiPayload(draft),
        status: "published",
      })
      notifySaveSuccess("Event published.", () => router.push(`/events/manage/${event.slug}`))
    } catch (err) {
      notifySaveError(err, "Failed to publish event")
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded) {
    return <EventComposeSkeleton label="Preparing editor…" />
  }

  return (
    <EventComposeScreen
      editorKey="event-new"
      initial={createEmptyEventDraft()}
      saving={saving}
      submitLabel="Publish"
      backHref="/events/manage"
      backLabel="Events"
      onSubmit={publish}
    />
  )
}

export default function NewEventPage() {
  return (
    <RequireRole mode="staff">
      <NewEventContent />
    </RequireRole>
  )
}
