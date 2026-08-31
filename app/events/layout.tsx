import { EventsShell } from "@/components/events/events-shell"

export default function EventsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <EventsShell>{children}</EventsShell>
}
