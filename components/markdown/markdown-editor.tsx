"use client"

import * as React from "react"

import { MarkdownContent } from "@/components/markdown-content"
import {
  EditorFloatingBar,
  type EditorBarMode,
} from "@/components/markdown/editor-floating-bar"
import { cn } from "@/lib/utils"

export function EditorTitle({
  value,
  onChange,
  placeholder = "Untitled",
  required,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className={cn(
        "w-full border-0 bg-transparent text-4xl font-bold tracking-tight shadow-none outline-none",
        "placeholder:text-muted-foreground/40 focus:ring-0 sm:text-5xl"
      )}
    />
  )
}

export function EditorSummary({
  value,
  onChange,
  placeholder = "Add a short description…",
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full border-0 bg-transparent text-lg text-muted-foreground shadow-none outline-none",
        "placeholder:text-muted-foreground/35 focus:text-foreground sm:text-xl"
      )}
    />
  )
}

export function MarkdownEditor({
  defaultValue = "",
  onChange,
  placeholder = "Write in markdown — use Format for bold, links, images, and headings…",
  minHeight = "min-h-[12rem]",
  optionsSlot,
  actions,
  hint,
}: {
  defaultValue?: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
  optionsSlot?: React.ReactNode
  actions: React.ReactNode
  hint?: React.ReactNode
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [text, setText] = React.useState(defaultValue)
  const [mode, setMode] = React.useState<EditorBarMode>("format")
  const [focused, setFocused] = React.useState(false)

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value
    setText(next)
    onChange(next)
  }

  const handleMarkdownChange = (next: string) => {
    setText(next)
    onChange(next)
  }

  return (
    <div className="relative space-y-3">
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs transition-shadow",
          focused && "border-primary/30 ring-2 ring-primary/10"
        )}
      >
        <div className={cn("border-b border-border/50 bg-muted/10 px-5 py-4 sm:px-6", minHeight)}>
          <MarkdownContent
            source={text}
            emptyPlaceholder={placeholder}
            className="text-[15px] leading-7"
          />
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          spellCheck
          rows={4}
          className={cn(
            "w-full resize-y border-0 bg-transparent px-5 py-3 text-[15px] leading-7 shadow-none outline-none sm:px-6",
            "placeholder:text-muted-foreground/40"
          )}
        />
      </div>

      <EditorFloatingBar
        mode={mode}
        onModeChange={setMode}
        textareaRef={textareaRef}
        onMarkdownChange={handleMarkdownChange}
        optionsSlot={optionsSlot}
        actions={actions}
      />

      {hint}
    </div>
  )
}
