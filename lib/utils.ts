import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * YYYY-MM-DD for the calendar day the given date falls on locally.
 * The backend stores dates in Asia/Yangon (UTC+6:30), so `toISOString()`
 * would return the previous day between midnight and 06:30 local time.
 */
export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
