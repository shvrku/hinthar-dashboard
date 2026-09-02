"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"

import { decodeMarkdownEntities } from "@/lib/event-draft"
import { markdownProseClass } from "@/lib/markdown-prose"
import { cn } from "@/lib/utils"

/** Allow MDXEditor underline HTML while keeping other raw HTML locked down. */
const markdownSanitizeSchema: typeof defaultSchema = {
  ...defaultSchema,
  tagNames: [...new Set([...(defaultSchema.tagNames ?? []), "u", "ins"])],
}

/** Normalize editor HTML so underline renders through react-markdown. */
function prepareMarkdownSource(source: string): string {
  return decodeMarkdownEntities(source)
    .replace(/<u(\s[^>]*)?>/gi, "<u>")
    .replace(/<\/u>/gi, "</u>")
}

export function MarkdownContent({
  source,
  className,
  emptyPlaceholder,
  lineClamp,
}: {
  source: string
  className?: string
  emptyPlaceholder?: string
  /** Clamp rendered markdown to N lines (works across paragraphs). */
  lineClamp?: 2 | 3 | 4 | 5 | 6
}) {
  const prepared = prepareMarkdownSource(source).trim()

  if (!prepared) {
    return emptyPlaceholder ? (
      <p className={cn("text-muted-foreground/50", className)}>{emptyPlaceholder}</p>
    ) : null
  }

  const lineClampClass =
    lineClamp === 2
      ? "line-clamp-2"
      : lineClamp === 3
        ? "line-clamp-3"
        : lineClamp === 4
          ? "line-clamp-4"
          : lineClamp === 5
            ? "line-clamp-5"
            : lineClamp === 6
              ? "line-clamp-6"
              : undefined

  return (
    <div
      className={cn(
        markdownProseClass,
        "min-w-0 max-w-full overflow-x-clip break-all [overflow-wrap:anywhere]",
        "[&_*]:max-w-full [&_*]:break-all [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap",
        lineClamp != null && [
          lineClampClass,
          "[&_*]:m-0 [&_*]:inline [&_li]:inline [&_ol]:inline [&_p]:mr-1 [&_ul]:inline",
        ],
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src ?? ""} alt={alt ?? ""} />
          ),
          u: ({ children }) => <span className="underline">{children}</span>,
          ins: ({ children }) => <span className="underline">{children}</span>,
        }}
      >
        {prepared}
      </ReactMarkdown>
    </div>
  )
}
