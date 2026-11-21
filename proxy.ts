import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

/**
 * Session plumbing + direct post-login routing to `/academics/` so authenticated
 * visits to `/` or `/sign-in`/`/sign-up` skip compiling `/` first.
 * Resource auth gates live on:
 * - app/(app)/layout.tsx → await auth.protect()
 * - app/api/[...slug]/route.ts → await auth.protect()
 */
export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()
  const { pathname } = req.nextUrl

  if (
    userId &&
    (pathname === "/" ||
      pathname === "/sign-in" ||
      pathname === "/sign-in/" ||
      pathname === "/sign-up" ||
      pathname === "/sign-up/")
  ) {
    return NextResponse.redirect(new URL("/academics/", req.url))
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
