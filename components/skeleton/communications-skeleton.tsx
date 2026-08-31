import { PageSkeleton, type PageSkeletonBlock } from "@/components/skeleton/page-skeleton"

export function AnnouncementsListSkeleton() {
  const blocks: PageSkeletonBlock[] = [
    {
      type: "card",
      className: "p-4",
      body: { type: "enroll-row" },
    },
    {
      type: "card",
      header: { description: true },
      body: { type: "list-rows", rows: 5, variant: "session" },
    },
  ]
  return (
    <div className="space-y-4">
      <PageSkeleton blocks={blocks} />
      <p className="text-center text-sm text-muted-foreground">Loading announcements…</p>
    </div>
  )
}

export function EventsManageListSkeleton() {
  const blocks: PageSkeletonBlock[] = [
    {
      type: "card",
      header: { action: true },
      body: { type: "list-rows", rows: 4, variant: "session" },
    },
  ]
  return (
    <div className="space-y-4">
      <PageSkeleton blocks={blocks} />
      <p className="text-center text-sm text-muted-foreground">Loading events…</p>
    </div>
  )
}

export function EditorPageSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <PageSkeleton
        blocks={[
          { type: "text-line", className: "h-10 w-2/3" },
          { type: "text-line", className: "h-6 w-1/2" },
          { type: "card", body: { type: "text-line", className: "h-64 w-full" } },
        ]}
      />
      <p className="text-center text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
