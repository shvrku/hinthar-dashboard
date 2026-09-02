"use client"

import * as React from "react"
import { Loader2, Pin, Tag } from "lucide-react"

import { EditorOptionChip } from "@/components/markdown/editor-option-chip"
import { EditorTitle, MarkdownEditor } from "@/components/markdown/markdown-editor"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
  editorKey,
  initial,
  saving,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  editorKey: string
  initial?: AnnouncementDraft
  saving: boolean
  submitLabel: string
  onSubmit: (draft: AnnouncementDraft) => Promise<void>
  onCancel: () => void
}) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const [draft, setDraft] = React.useState<AnnouncementDraft>(() => initial ?? emptyDraft)

  React.useEffect(() => {
    if (initial) setDraft(initial)
  }, [initial])

  const patch = (updates: Partial<AnnouncementDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.title.trim()) return
    await onSubmit(draft)
  }

  const bodySeed = initial?.body ?? draft.body

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <div className="mx-auto w-full max-w-3xl space-y-3 px-1 pb-28 pt-2 sm:px-4">
        <EditorTitle
          value={draft.title}
          onChange={(title) => patch({ title })}
          placeholder="Announcement title"
          required
        />

        {initial === undefined || initial.body !== undefined ? (
          <MarkdownEditor
            key={editorKey}
            defaultValue={bodySeed}
            onChange={(body) => patch({ body })}
          placeholder="Start writing…"
          optionsSlot={
            <>
              <EditorOptionChip
                icon={Pin}
                label="Pin"
                value={draft.is_pinned ? "Pinned" : "Pin to top"}
                active={draft.is_pinned}
              >
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.is_pinned}
                    onCheckedChange={(checked) => patch({ is_pinned: checked === true })}
                  />
                  Pin this announcement to the top
                </label>
              </EditorOptionChip>

              <EditorOptionChip
                icon={Tag}
                label="Tags"
                value={draft.tag_names.trim() ? "Tags" : "Tags"}
                active={Boolean(draft.tag_names.trim())}
              >
                <div className="space-y-2">
                  <Label htmlFor="announcement-tags">Tags</Label>
                  <Input
                    id="announcement-tags"
                    value={draft.tag_names}
                    onChange={(e) => patch({ tag_names: e.target.value })}
                    placeholder="Parent Info, Sports"
                    className="h-10 rounded-xl"
                  />
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
                disabled={saving || !draft.title.trim()}
                onClick={() => formRef.current?.requestSubmit()}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : submitLabel}
              </Button>
            </>
          }
          />
        ) : null}
      </div>
    </form>
  )
}
