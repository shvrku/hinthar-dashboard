import { redirect } from "next/navigation"

/** Live KPIs live on `/overview`. Keep this path as a redirect for old bookmarks. */
export default function DashboardRedirectPage() {
  redirect("/overview/")
}
