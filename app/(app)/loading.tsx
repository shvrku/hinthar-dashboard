import { DashboardOverviewSkeleton } from "@/components/page-skeletons"

export default function AppLoading() {
  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <DashboardOverviewSkeleton />
    </div>
  )
}
