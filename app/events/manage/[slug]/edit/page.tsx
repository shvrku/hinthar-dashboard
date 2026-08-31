"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

import {
  EventEditorForm,
  emptyEventDraft,
  type EventDraft,
} from "@/components/events/event-editor-form"
import { RequireRole } from "@/components/require-role"
import { StandardPageHeader } from "@/components/standard-page-header"
import { EditorPageSkeleton } from "@/components/skeleton/communications-skeleton"
import { ApiError, createApi } from "@/lib/api"
import type { SchoolEvent } from "@/lib/types"
import { formatEventDateTimeLocal } from "@/lib/communications-labels"
import { toast } from "@/components/ui/toast"

function toDraft(event: SchoolEvent): EventDraft {
  return {
    title: event.title,
    summary: event.summary,
    body: event.body,
    audience: event.audience,
    registration_mode: event.registration_mode,
    starts_at: formatEventDateTimeLocal(event.starts_at),
    ends_at: formatEventDateTimeLocal(event.ends_at),
    location: event.location,
    capacity: event.capacity != null ? String(event.capacity) : "",
    cover_image_url: event.cover_image_url,
    tag_names: event.tags.map((tag) => tag.name).join(", "),
  }
}

function EditEventContent({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const { getToken, isLoaded } = useAuth()
  const [slug, setSlug] = React.useState<string | null>(null)
  const [initial, setInitial] = React.useState<EventDraft | null>(null)
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
          const event = await createApi(token).getEvent(slug)
          if (!cancelled) setInitial(toDraft(event))
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof ApiError ? err.userMessage : "Failed to load event")
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

  const save = async (draft: EventDraft) => {
    if (!slug) return
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      await createApi(token).updateEvent(slug, {
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        body: draft.body,
        audience: draft.audience,
        registration_mode: draft.registration_mode,
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
      toast.add({ title: "Event updated.", type: "success" })
      router.push("/events/manage")
    } catch (err) {
      toast.add({
        title: err instanceof ApiError ? err.userMessage : "Failed to save event",
        type: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded || loading) {
    return <EditorPageSkeleton label="Loading event…" />
  }

  if (error || !initial) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-sm text-destructive">{error || "Event not found."}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <StandardPageHeader
        title="Edit event"
        description="Update event details and content."
        back={{ href: "/events/manage", label: "Manage events" }}
      />
      <EventEditorForm
        draftKey={`hinthar:draft:event:edit:${slug}`}
        initial={initial ?? emptyEventDraft}
        saving={saving}
        submitLabel="Save changes"
        onSubmit={save}
        onCancel={() => router.push("/events/manage")}
      />
    </div>
  )
}

export default function EditEventPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <RequireRole mode="staff">
      <EditEventContent params={params} />
    </RequireRole>
  )
}
