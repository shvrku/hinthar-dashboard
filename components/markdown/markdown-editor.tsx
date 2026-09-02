"use client"

import * as React from "react"
import type { MDXEditorMethods } from "@mdxeditor/editor"

import { FormatAnchorProvider } from "@/components/markdown/editor-format-anchor"
import { ForwardRefEditor } from "@/components/markdown/forward-ref-editor"
import { markdownProseClass } from "@/lib/markdown-prose"
import { cn } from "@/lib/utils"

export function EditorTitle({
  value,
  onChange,
  placeholder = "Untitled",
  required,
  invalid,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  invalid?: boolean
  className?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full border-0 bg-transparent text-4xl font-bold tracking-tight shadow-none outline-none",
        "placeholder:text-muted-foreground/40 focus:ring-0 sm:text-5xl",
        invalid && "text-destructive placeholder:text-destructive/70",
        className
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
  placeholder = "Start writing…",
  optionsSlot,
  actions,
  hint,
  showFloatingBar = true,
  className,
  contentClassName,
}: {
  defaultValue?: string
  onChange: (value: string) => void
  placeholder?: string
  optionsSlot?: React.ReactNode
  actions?: React.ReactNode
  hint?: React.ReactNode
  showFloatingBar?: boolean
  className?: string
  contentClassName?: string
}) {
  const editorRef = React.useRef<MDXEditorMethods>(null)
  const [formatAnchor, setFormatAnchor] = React.useState<HTMLDivElement | null>(null)
  const [markdownSeed] = React.useState(defaultValue)
  const seededBodyRef = React.useRef(defaultValue)
  const hasSyncedInitialChangeRef = React.useRef(false)

  const handleChange = React.useCallback(
    (value: string) => {
      if (!hasSyncedInitialChangeRef.current && value === "" && seededBodyRef.current) {
        return
      }
      hasSyncedInitialChangeRef.current = true
      onChange(value)
    },
    [onChange]
  )

  return (
    <FormatAnchorProvider anchor={formatAnchor}>
      <div className={cn("relative", className)}>
        <div ref={setFormatAnchor} className="min-h-0" />
        <ForwardRefEditor
          ref={editorRef}
          markdown={markdownSeed}
          onChange={handleChange}
          optionsSlot={optionsSlot}
          actions={actions}
          showFloatingBar={showFloatingBar}
          placeholder={placeholder}
          className="hinthar-mdx-editor"
          contentEditableClassName={cn(markdownProseClass, "outline-none", contentClassName)}
        />
        {hint ? <div className="pt-2">{hint}</div> : null}
      </div>
    </FormatAnchorProvider>
  )
}
