"use client"

import * as React from "react"
import Image from "next/image"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ThemeMode, ThemePalette } from "@/lib/theme-types"

type ThemePaletteCardProps = {
  palette: ThemePalette
  label: string
  description: string
  mode: ThemeMode
  selected: boolean
  onSelect: () => void
}

export function ThemePaletteCard({
  palette,
  label,
  description,
  mode,
  selected,
  onSelect,
}: ThemePaletteCardProps) {
  const src = `/themes/${palette}-${mode}.png`

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Use ${label} palette`}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-xl border bg-card text-left transition-colors",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-border/80 hover:border-border"
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <Image
          key={src}
          src={src}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover object-top"
          unoptimized
        />
        {selected ? (
          <span className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Check className="size-3.5" />
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-0.5 px-4 py-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
    </button>
  )
}
