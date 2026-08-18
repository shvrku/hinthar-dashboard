import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

/** Canonical admin list now lives at `/users/management`. Keep old bookmarks working. */
export default async function UsersRedirectPage() {
  await auth.protect({ unauthenticatedUrl: "/sign-in/" })
  redirect("/users/management/")
}
