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
    "First look at enrollments, sessions, and arrivals.",
    "The morning board is up.",
    "Before the rush — a quiet read of campus.",
    "Students are arriving. Here's the opening picture.",
    "A fresh day. Here's where you stand.",
    "Roll, check-ins, and headcount — morning edition.",
    "Open the day with a glance at what moved.",
    "Early hours. The overview is ready when you are.",
    "New day, same desk. Here's the snapshot.",
    "Morning light on the numbers.",
    "Let's see who showed up and what's scheduled.",
    "Start here — people, classes, and today's pulse.",
  ],
  afternoon: [
    "The day is in motion. Here's where things stand.",
    "Midday check — classes, people, and arrivals.",
    "Keep an eye on check-ins and sessions from here.",
    "A quick pulse on school operations.",
    "Halfway through — enrollments and activity at a glance.",
    "Classes are underway. Here's the live picture.",
    "Afternoon snapshot of campus and the roll.",
    "A pause between periods. The numbers are current.",
    "Still plenty of day left. Here's the pulse.",
    "Sessions, arrivals, and people — midday view.",
    "The school is in full swing. Here's the cut.",
    "Catch up on what changed since this morning.",
    "Operations at cruising speed. Here's the board.",
    "Midday read: students, teachers, and check-ins.",
    "Between bells — a look at how campus is tracking.",
    "A second look at today's numbers.",
  ],
  evening: [
    "Wrapping up — a look at today's numbers.",
    "Here's how the school day is closing out.",
    "A quiet recap before tomorrow.",
    "End-of-day snapshot of campus activity.",
    "The last look before lights go down.",
    "Today's headcount, sessions, and arrivals — in one place.",
    "Evening board. See how the day landed.",
    "Campus is winding down. Here's the recap.",
    "A final pass over today's activity.",
    "Tomorrow will wait. Here's today, summarized.",
    "After hours — the numbers still tell the story.",
    "Close the loop on check-ins and sessions.",
    "The day is mostly done. Here's what it added up to.",
    "A calm evening read of campus.",
    "Last glance at enrollments and activity for today.",
    "Settle the day with a look at the board.",
  ],
}

const LAST_SUBTEXT_KEY = "hinthar-dashboard-subtext"

function readLastSubtext(): string | null {
  try {
    return sessionStorage.getItem(LAST_SUBTEXT_KEY)
  } catch {
    return null
  }
}

function writeLastSubtext(value: string) {
  try {
    sessionStorage.setItem(LAST_SUBTEXT_KEY, value)
  } catch {
    /* private mode / blocked storage */
  }
}

/** New line on each page load; skips the previous one when possible. */
export function pickDashboardSubtext(date = new Date()): string {
  const list = SUBTEXTS[dayPeriod(date)]
  const previous = readLastSubtext()
  const pool = list.length > 1 ? list.filter((line) => line !== previous) : list
  const next = pool[Math.floor(Math.random() * pool.length)] ?? list[0]
  writeLastSubtext(next)
  return next
}

export function dashboardGreeting(firstName?: string | null, date = new Date()): string {
  const hello = timeOfDayGreeting(date)
  const name = firstName?.trim()
  return name ? `${hello}, ${name}` : hello
}
