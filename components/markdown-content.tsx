"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

export function MarkdownContent({
  source,
  className,
  emptyPlaceholder,
}: {
  source: string
  className?: string
  emptyPlaceholder?: string
}) {
  const trimmed = source.trim()

  if (!trimmed) {
    return emptyPlaceholder ? (
      <p className={cn("text-muted-foreground/50", className)}>{emptyPlaceholder}</p>
    ) : null
  }

  return (
    <div className={cn("max-w-none text-[15px] leading-7 text-foreground", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-6 text-2xl font-bold tracking-tight first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-5 text-xl font-semibold tracking-tight first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-lg font-semibold first:mt-0">{children}</h3>
          ),
          p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-primary/30 pl-4 text-muted-foreground">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-4"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src ?? ""}
              alt={alt ?? ""}
              className="my-4 max-h-96 w-full rounded-xl border border-border/80 object-cover"
            />
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{children}</code>
          ),
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
