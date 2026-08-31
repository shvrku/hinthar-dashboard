"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CommTag } from "@/lib/types"

export function TagChips({
  tags,
  selectedSlug,
  onSelect,
  className,
}: {
  tags: CommTag[]
  selectedSlug?: string | null
  onSelect?: (slug: string | null) => void
  className?: string
}) {
  if (tags.length === 0) return null

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {onSelect && (
        <Badge
          variant={selectedSlug ? "outline" : "default"}
          className="cursor-pointer"
          onClick={() => onSelect(null)}
        >
          All
        </Badge>
      )}
      {tags.map((tag) => (
        <Badge
          key={tag.slug}
          variant={selectedSlug === tag.slug ? "default" : "outline"}
          className={onSelect ? "cursor-pointer" : undefined}
          onClick={onSelect ? () => onSelect(tag.slug) : undefined}
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  )
}

export function TagBadges({ tags }: { tags: CommTag[] }) {
  if (!tags.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <Badge key={tag.slug} variant="secondary" className="text-xs">
          {tag.name}
        </Badge>
      ))}
    </div>
  )
}
