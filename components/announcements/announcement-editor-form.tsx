"use client"

import * as React from "react"
import { Loader2, Pin } from "lucide-react"

import { EditorTitle, MarkdownEditor } from "@/components/markdown/markdown-editor"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useDebouncedDraft } from "@/lib/use-local-draft"

export type AnnouncementDraft = {
  title: string
  body: string
  is_pinned: boolean
  tag_names: string
}

const emptyDraft: AnnouncementDraft = {
  title: "",
  body: "",
  is_pinned: false,
  tag_names: "",
}

export function AnnouncementEditorForm({
  draftKey,
  initial,
  saving,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  draftKey: string
  initial?: AnnouncementDraft
  saving: boolean
  submitLabel: string
  onSubmit: (draft: AnnouncementDraft) => Promise<void>
  onCancel: () => void
}) {
  const seeded = initial ?? emptyDraft
  const { draft, setDraft, clearDraft, ready } = useDebouncedDraft(draftKey, seeded)

  React.useEffect(() => {
    if (initial) setDraft(initial)
  }, [initial, setDraft])

  const patch = (updates: Partial<AnnouncementDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.title.trim()) return
    await onSubmit(draft)
    if (!initial) clearDraft()
  }

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-sm text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p>Loading editor…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="relative pb-8">
      <div className="mx-auto max-w-3xl space-y-4 px-1 pt-2 sm:px-4">
        <EditorTitle
          value={draft.title}
          onChange={(title) => patch({ title })}
          placeholder="Announcement title"
          required
        />

        <MarkdownEditor
          key={`${draftKey}-${initial ? "loaded" : "new"}`}
          defaultValue={draft.body}
          onChange={(body) => patch({ body })}
          placeholder="Write your announcement — **bold**, [links](url), and ![images](url) show in the preview above."
          optionsSlot={
            <>
              <label className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs">
                <Checkbox
                  checked={draft.is_pinned}
                  onCheckedChange={(checked) => patch({ is_pinned: checked === true })}
                />
                <Pin className="size-3.5" /> Pin to top
              </label>
              <Input
                value={draft.tag_names}
                onChange={(e) => patch({ tag_names: e.target.value })}
                placeholder="Tags: Parent Info, Sports"
                className="h-8 max-w-[14rem] rounded-full px-3 text-xs"
              />
            </>
          }
          actions={
            <>
              <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="rounded-full px-4"
                disabled={saving || !draft.title.trim()}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : submitLabel}
              </Button>
            </>
          }
        />
      </div>
    </form>
  )
}
