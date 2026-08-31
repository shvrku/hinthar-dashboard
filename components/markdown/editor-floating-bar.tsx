"use client"

import * as React from "react"
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  Quote,
  Settings2,
  Type,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { applyTextareaUpdate, insertAtCursor, wrapSelection } from "@/lib/markdown-editor-utils"

const FORMAT_TOOLS = [
  { label: "Bold", icon: Bold, wrap: ["**", "**"] as const },
  { label: "Italic", icon: Italic, wrap: ["*", "*"] as const },
  { label: "Heading 1", icon: Heading1, insert: "# " },
  { label: "Heading 2", icon: Heading2, insert: "## " },
  { label: "Heading 3", icon: Heading3, insert: "### " },
  { label: "Bullet list", icon: List, insert: "- " },
  { label: "Quote", icon: Quote, insert: "> " },
  { label: "Link", icon: Link2, wrap: ["[", "](https://)"] as const },
  { label: "Image", icon: ImageIcon, insert: "![description](https://)" },
] as const

export type EditorBarMode = "format" | "options"

export function EditorFloatingBar({
  mode,
  onModeChange,
  textareaRef,
  onMarkdownChange,
  optionsSlot,
  actions,
  className,
}: {
  mode: EditorBarMode
  onModeChange: (mode: EditorBarMode) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onMarkdownChange: (value: string) => void
  optionsSlot?: React.ReactNode
  actions: React.ReactNode
  className?: string
}) {
  const applyFormat = React.useCallback(
    (fn: (textarea: HTMLTextAreaElement) => { next: string; cursorStart: number; cursorEnd: number }) => {
      const textarea = textareaRef.current
      if (!textarea) return
      const result = fn(textarea)
      onMarkdownChange(result.next)
      requestAnimationFrame(() =>
        applyTextareaUpdate(textarea, result.next, result.cursorStart, result.cursorEnd)
      )
    },
    [onMarkdownChange, textareaRef]
  )

  return (
    <div className={cn("sticky bottom-4 z-40 flex w-full justify-center pt-6", className)}>
      <div className="flex max-w-[min(100%,48rem)] flex-wrap items-center justify-center gap-1 rounded-full border border-border/80 bg-background/95 px-2 py-1.5 shadow-lg backdrop-blur-md">
        <Popover>
          <PopoverTrigger
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "format"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
            onClick={() => onModeChange("format")}
          >
            <Type className="size-3.5" />
            Format
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="center" side="top" sideOffset={12}>
            <PopoverHeader className="px-1 pb-1">
              <PopoverTitle className="text-xs">Formatting</PopoverTitle>
            </PopoverHeader>
            <div className="flex flex-wrap gap-0.5">
              {FORMAT_TOOLS.map(({ label, icon: Icon, ...tool }) => (
                <Button
                  key={label}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-8 rounded-full"
                  title={label}
                  onClick={() => {
                    if ("wrap" in tool && tool.wrap) {
                      applyFormat((ta) => wrapSelection(ta, tool.wrap[0], tool.wrap[1]))
                      return
                    }
                    if ("insert" in tool && tool.insert) {
                      applyFormat((ta) => insertAtCursor(ta, tool.insert))
                    }
                  }}
                >
                  <Icon className="size-4" />
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-1.5 rounded-full px-3 text-xs",
            mode === "options" && "bg-primary/10 text-primary"
          )}
          onClick={() => onModeChange("options")}
        >
          <Settings2 className="size-3.5" />
          Options
        </Button>

        {mode === "options" && optionsSlot ? (
          <>
            <div className="mx-0.5 hidden h-5 w-px bg-border sm:block" />
            <div className="flex max-w-full flex-wrap items-center gap-1">{optionsSlot}</div>
          </>
        ) : null}

        <div className="mx-0.5 hidden h-5 w-px bg-border sm:block" />
        <div className="flex items-center gap-1">{actions}</div>
      </div>
    </div>
  )
}
