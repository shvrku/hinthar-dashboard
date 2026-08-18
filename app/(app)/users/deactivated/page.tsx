import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

/** Deactivated accounts live on User management with `?status=deactivated`. */
export default async function DeactivatedUsersRedirectPage() {
  await auth.protect({ unauthenticatedUrl: "/sign-in/" })
  redirect("/users/management/?status=deactivated")
}
