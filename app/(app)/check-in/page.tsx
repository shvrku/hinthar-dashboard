import { redirect } from "next/navigation"

/** Legacy /check-in → overview. */
export default function CheckInIndexPage() {
  redirect("/check-in/overview/")
}
