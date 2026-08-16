export type DayPeriod = "morning" | "afternoon" | "evening"

export function dayPeriod(date = new Date()): DayPeriod {
  const hour = date.getHours()
  if (hour < 12) return "morning"
  if (hour < 17) return "afternoon"
  return "evening"
}

export function timeOfDayGreeting(date = new Date()): string {
  switch (dayPeriod(date)) {
    case "morning":
      return "Good morning"
    case "afternoon":
      return "Good afternoon"
    case "evening":
      return "Good evening"
  }
}

const SUBTEXTS: Record<DayPeriod, readonly string[]> = {
  morning: [
    "Ready for a new school day.",
    "Campus is waking up — here's the live snapshot.",
    "A calm start. Here's what the numbers say.",
    "Good to have you in. Let's see how today looks.",
  ],
  afternoon: [
    "The day is in motion. Here's where things stand.",
    "Midday check — classes, people, and arrivals.",
    "Keep an eye on check-ins and sessions from here.",
    "A quick pulse on school operations.",
  ],
  evening: [
    "Wrapping up — a look at today's numbers.",
    "Here's how the school day is closing out.",
    "A quiet recap before tomorrow.",
    "End-of-day snapshot of campus activity.",
  ],
}

/** Stable for the calendar day so refresh doesn't shuffle the line. */
export function pickDashboardSubtext(date = new Date()): string {
  const period = dayPeriod(date)
  const list = SUBTEXTS[period]
  const start = new Date(date.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000)
  return list[dayOfYear % list.length]
}

export function dashboardGreeting(firstName?: string | null, date = new Date()): string {
  const hello = timeOfDayGreeting(date)
  const name = firstName?.trim()
  return name ? `${hello}, ${name}` : hello
}
