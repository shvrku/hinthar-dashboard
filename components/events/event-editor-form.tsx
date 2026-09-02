"use client"

import * as React from "react"
import {
  CalendarDays,
  Globe,
  ImageIcon,
  Loader2,
  MapPin,
  Settings2,
  Tag,
  Users,
} from "lucide-react"

import { EditorOptionChip } from "@/components/markdown/editor-option-chip"
import {
  EditorSummary,
  EditorTitle,
  MarkdownEditor,
} from "@/components/markdown/markdown-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  EVENT_AUDIENCE_LABELS,
  EVENT_REGISTRATION_MODE_LABELS,
  summarizeEventSchedule,
} from "@/lib/communications-labels"

export type EventDraft = {
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
}

export const emptyEventDraft: EventDraft = {
  title: "",
  summary: "",
  body: "",
  audience: "internal",
  registration_mode: "instant_waitlist",
  starts_at: "",
  ends_at: "",
  location: "",
  capacity: "",
  cover_image_url: "",
  tag_names: "",
}

export function EventEditorForm({
  editorKey,
  initial,
  saving,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  editorKey: string
  initial?: EventDraft
  saving: boolean
  submitLabel: string
  onSubmit: (draft: EventDraft) => Promise<void>
  onCancel: () => void
}) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const [draft, setDraft] = React.useState<EventDraft>(() => initial ?? emptyEventDraft)

  React.useEffect(() => {
    if (initial) setDraft(initial)
  }, [initial])

  const patch = (updates: Partial<EventDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.title.trim() || !draft.starts_at) return
    await onSubmit(draft)
  }

  const scheduleLabel = summarizeEventSchedule(draft.starts_at, draft.ends_at)
  const bodySeed = initial?.body ?? draft.body

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <div className="mx-auto w-full max-w-3xl space-y-3 px-1 pb-28 pt-2 sm:px-4">
        {draft.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draft.cover_image_url} alt="" className="mb-2 max-h-64 w-full rounded-2xl border object-cover" />
        ) : null}

        <EditorTitle value={draft.title} onChange={(title) => patch({ title })} placeholder="Untitled event" required />
        <EditorSummary value={draft.summary} onChange={(summary) => patch({ summary })} placeholder="Add a short description…" />

        {initial === undefined || initial.body !== undefined ? (
          <MarkdownEditor
            key={editorKey}
            defaultValue={bodySeed}
            onChange={(body) => patch({ body })}
          placeholder="Describe the event…"
          optionsSlot={
            <>
              <EditorOptionChip icon={Globe} label="Access" value={EVENT_AUDIENCE_LABELS[draft.audience]} active={draft.audience === "external"}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Audience</Label>
                    <Select value={draft.audience} onValueChange={(value) => patch({ audience: value as EventDraft["audience"] })}>
                      <SelectTrigger className="h-10 w-full rounded-xl">
                        <SelectValue>{EVENT_AUDIENCE_LABELS[draft.audience]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">{EVENT_AUDIENCE_LABELS.internal}</SelectItem>
                        <SelectItem value="external">{EVENT_AUDIENCE_LABELS.external}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Registration</Label>
                    <Select value={draft.registration_mode} onValueChange={(value) => patch({ registration_mode: value as EventDraft["registration_mode"] })}>
                      <SelectTrigger className="h-10 w-full rounded-xl">
                        <SelectValue>{EVENT_REGISTRATION_MODE_LABELS[draft.registration_mode]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instant_waitlist">{EVENT_REGISTRATION_MODE_LABELS.instant_waitlist}</SelectItem>
                        <SelectItem value="approval_required">{EVENT_REGISTRATION_MODE_LABELS.approval_required}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </EditorOptionChip>

              <EditorOptionChip icon={CalendarDays} label="Schedule" value={scheduleLabel} active={Boolean(draft.starts_at)}>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="event-starts">Starts <span className="text-destructive">*</span></Label>
                    <Input id="event-starts" type="datetime-local" value={draft.starts_at} onChange={(e) => patch({ starts_at: e.target.value })} className="h-10 rounded-xl" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-ends">Ends</Label>
                    <Input id="event-ends" type="datetime-local" value={draft.ends_at} onChange={(e) => patch({ ends_at: e.target.value })} className="h-10 rounded-xl" />
                  </div>
                </div>
              </EditorOptionChip>

              <EditorOptionChip icon={MapPin} label="Location" value={draft.location || "Location"} active={Boolean(draft.location)}>
                <div className="space-y-2">
                  <Label htmlFor="event-location">Location</Label>
                  <Input id="event-location" value={draft.location} onChange={(e) => patch({ location: e.target.value })} className="h-10 rounded-xl" />
                </div>
              </EditorOptionChip>

              <EditorOptionChip icon={Users} label="Capacity" value={draft.capacity ? `${draft.capacity} spots` : "Unlimited"} active={Boolean(draft.capacity)}>
                <div className="space-y-2">
                  <Label htmlFor="event-capacity">Capacity</Label>
                  <Input id="event-capacity" type="number" min={1} value={draft.capacity} onChange={(e) => patch({ capacity: e.target.value })} className="h-10 rounded-xl" />
                </div>
              </EditorOptionChip>

              <EditorOptionChip icon={ImageIcon} label="Cover" value={draft.cover_image_url ? "Set" : "Cover"} active={Boolean(draft.cover_image_url)}>
                <div className="space-y-2">
                  <Label htmlFor="event-cover">Cover URL</Label>
                  <Input id="event-cover" value={draft.cover_image_url} onChange={(e) => patch({ cover_image_url: e.target.value })} className="h-10 rounded-xl" />
                </div>
              </EditorOptionChip>

              <EditorOptionChip icon={Tag} label="Tags" value={draft.tag_names.trim() ? "Tags" : "Tags"} active={Boolean(draft.tag_names.trim())}>
                <div className="space-y-2">
                  <Label htmlFor="event-tags">Tags</Label>
                  <Input id="event-tags" value={draft.tag_names} onChange={(e) => patch({ tag_names: e.target.value })} className="h-10 rounded-xl" />
                </div>
              </EditorOptionChip>
            </>
          }
          actions={
            <>
              <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-full px-4"
                disabled={saving || !draft.title.trim() || !draft.starts_at}
                onClick={() => formRef.current?.requestSubmit()}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : submitLabel}
              </Button>
            </>
          }
          hint={
            !draft.starts_at ? (
              <p className="text-center text-xs text-muted-foreground">
                <Settings2 className="mr-1 inline size-3" />
                Set a start date in the toolbar before publishing
              </p>
            ) : null
          }
          />
        ) : null}
      </div>
    </form>
  )
}
