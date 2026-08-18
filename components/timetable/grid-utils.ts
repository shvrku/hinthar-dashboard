import type { Class } from "@/lib/types"
import { formatClassLabel } from "@/lib/format-class"

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
export const HOURS = Array.from({ length: 10 }, (_, i) => i + 7) // 07:00–16:00

export const timeToMins = (t: string) => {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

export const getClassName = (cls: Class) => formatClassLabel(cls)

export const getDurationMinutes = (start: string, end: string) => {
  const diff = timeToMins(end) - timeToMins(start)
  if (diff <= 0) return ""
  const hours = Math.floor(diff / 60)
  const mins = diff % 60
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
  if (hours > 0) return `${hours}h`
  return `${mins}m`
}
