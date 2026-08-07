"use client"

/** Shared pulse placeholder while chart chunks load (PERF-M3). */
export function ChartChunkSkeleton({ className = "h-52" }: { className?: string }) {
  return <div className={`w-full animate-pulse rounded-xl bg-muted ${className}`} aria-hidden />
}
