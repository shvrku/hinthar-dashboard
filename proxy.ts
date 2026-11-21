import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/events(.*)",
  "/api(.*)",
])

/**
 * Server-side route protection via Clerk `auth.protect()`.
 * Public auth routes (`/sign-in`, `/sign-up`), public `/events`, and `/api/*`
 * (which returns JSON 401 inside app/api/[...slug]/route.ts) are never auto-redirected,
 * preventing any ping-pong loop between `/academics/` and `/sign-in/`.
 */
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect({ unauthenticatedUrl: "/sign-in/" })
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
