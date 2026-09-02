"use client"

import * as React from "react"
import { FileText, XIcon } from "lucide-react"

import { MarkdownContent } from "@/components/markdown-content"
import { MarkdownEditor } from "@/components/markdown/markdown-editor"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { decodeMarkdownEntities } from "@/lib/event-draft"
import { cn } from "@/lib/utils"

export function EventDescriptionDialog({
  value,
  onChange,
  editorKey,
  className,
}: {
  value: string
  onChange: (value: string) => void
  editorKey: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(value)
  const previewSource = decodeMarkdownEntities(value)

  React.useEffect(() => {
    if (open) setDraft(decodeMarkdownEntities(value))
  }, [open, value])

  const save = () => {
    onChange(decodeMarkdownEntities(draft))
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-start gap-3 rounded-2xl border border-border/80 bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/40",
          className
        )}
      >
        <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">Add Description</div>
          {previewSource.trim() ? (
            <MarkdownContent
              source={previewSource}
              className="pointer-events-none mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground [&_*]:m-0 [&_*]:inline [&_p]:mr-1"
            />
          ) : (
            <div className="mt-0.5 text-xs text-muted-foreground">
              Tell people what this event is about
            </div>
          )}
        </div>
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setDraft(decodeMarkdownEntities(value))
          setOpen(next)
        }}
      >
        <DialogContent
          className="flex max-h-[min(90vh,56rem)] w-[min(calc(100vw-2rem),48rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
          showCloseButton={false}
        >
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-3 space-y-0 border-b border-border/80 px-5 py-3 sm:px-6">
            <DialogTitle>Event Description</DialogTitle>
            <DialogClose
              render={
                <Button type="button" variant="ghost" size="icon-sm" className="shrink-0" />
              }
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            {open ? (
              <MarkdownEditor
                key={`${editorKey}-description`}
                defaultValue={draft}
                onChange={setDraft}
                placeholder="Who should come? What's the event about?"
                showFloatingBar={false}
                contentClassName="min-h-[18rem] text-base leading-relaxed"
              />
            ) : null}
          </div>

          <DialogFooter className="shrink-0 border-t border-border/80 px-5 py-4 sm:px-6 sm:justify-end">
            <Button type="button" size="lg" className="rounded-full px-6" onClick={save}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
