"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

import { EventComposeScreen } from "@/components/events/event-compose-screen"
import { RequireRole } from "@/components/require-role"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { EventComposeSkeleton } from "@/components/skeleton/communications-skeleton"
import { ApiError, createApi } from "@/lib/api"
import { draftToApiPayload, eventToDraft, type EventDraft } from "@/lib/event-draft"
import { notifySaveError, notifySaveSuccess } from "@/lib/editor-save"

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
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const token = await getToken()
        if (!token) throw new Error("No auth token available")
        const event = await createApi(token).getEvent(slug)
        if (!cancelled) setInitial(eventToDraft(event))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.userMessage : "Failed to load event")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getToken, isLoaded, slug])

  const save = async (draft: EventDraft) => {
    if (!slug) return
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      await createApi(token).updateEvent(slug, draftToApiPayload(draft))
      notifySaveSuccess("Event updated.", () => router.push(`/events/manage/${slug}`))
    } catch (err) {
      notifySaveError(err, "Failed to save event")
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <StaggerContainer className="flex flex-col gap-6">
        <StaggerItem>
          <EventComposeSkeleton label="Loading event…" />
        </StaggerItem>
      </StaggerContainer>
    )
  }

  if (error || !initial) {
    return (
      <StaggerContainer className="flex flex-col gap-6">
        <StaggerItem>
          <div className="mx-auto max-w-lg py-16 text-center">
            <p className="text-sm text-destructive">{error || "Event not found."}</p>
          </div>
        </StaggerItem>
      </StaggerContainer>
    )
  }

  return (
    <EventComposeScreen
      editorKey={`event-edit-${slug}`}
      initial={initial}
      saving={saving}
      submitLabel="Save changes"
      backHref={`/events/manage/${slug}`}
      backLabel="Manage"
      onSubmit={save}
    />
  )
}

export default function EditEventPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <RequireRole mode="staff">
      <EditEventContent params={params} />
    </RequireRole>
  )
}
