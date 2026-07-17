"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Calendar } from "@/components/ui/calendar"

export default function TestPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const [date, setDate] = React.useState<Date | undefined>(new Date())

  if (!isLoaded) return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  if (!isSignedIn) return <div className="flex min-h-screen items-center justify-center">Please sign in to view this page.</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">
        Component Test Page
      </h1>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">Calendar</h2>
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              Selected date: {date?.toDateString() ?? "None"}
            </p>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border shadow-sm"
            />
          </div>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              With dropdown caption
            </p>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border shadow-sm"
              captionLayout="dropdown"
            />
          </div>
        </div>
      </section>
    </div>
  )
}


