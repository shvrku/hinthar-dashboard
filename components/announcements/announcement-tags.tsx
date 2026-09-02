import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

const TAG_TONES = [
  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  "bg-rose-500/10 text-rose-700 dark:text-rose-300",
] as const

export function announcementTagTone(slug: string) {
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = (hash + slug.charCodeAt(i) * (i + 1)) % TAG_TONES.length
  }
  return TAG_TONES[hash]
}

export function formatAnnouncementTagLabel(name: string) {
  return `#${name.toLowerCase().replace(/\s+/g, "")}`
}

export function AnnouncementPinnedTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-400/15 dark:text-amber-200",
        className
      )}
    >
      <Star className="size-3 fill-current" aria-hidden />
      Pinned
    </span>
  )
}

export function AnnouncementTagChip({
  name,
  slug,
  className,
}: {
  name: string
  slug: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        announcementTagTone(slug),
        className
      )}
    >
      {formatAnnouncementTagLabel(name)}
    </span>
  )
}
