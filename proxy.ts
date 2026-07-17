import { clerkMiddleware } from "@clerk/nextjs/server"

// In Next.js 16, "middleware" is renamed to "proxy".
// clerkMiddleware() returns a NextMiddleware function, which is
// type-aliased as NextProxy — so it works directly as the export.
const clerkHandler = clerkMiddleware()

export function proxy(
  request: Parameters<typeof clerkHandler>[0],
  event: Parameters<typeof clerkHandler>[1]
) {
  return clerkHandler(request, event)
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
