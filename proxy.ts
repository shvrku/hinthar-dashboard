import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/events(.*)",
  "/api/webhooks(.*)",
  "/api(.*)",
])

const HANDSHAKE_QUERY_PARAMS = [
  "__clerk_db_jwt",
  "__clerk_handshake",
  "__clerk_handshake_nonce",
  "__clerk_synced",
  "__clerk_redirect_url",
]

function hasActiveClerkCookie(req: NextRequest): boolean {
  return req.cookies.getAll().some(({ name, value }) => {
    if ((name === "__session" || name.startsWith("__session_")) && Boolean(value)) {
      return true
    }
    if ((name === "__client_uat" || name.startsWith("__client_uat_")) && value && value !== "0") {
      return true
    }
    return false
  })
}

/**
 * Server-side route protection via Clerk `clerkMiddleware`.
 * - Public routes (`/sign-in`, `/sign-up`, `/events`, `/api/*`) pass through with `NextResponse.next()`.
 * - Requests carrying Clerk dev-browser/handshake params pass through so handshakes complete.
 * - Authenticated users (`userId` present) or browsers holding an active Clerk session/UAT cookie
 *   pass through so client hydration completes without bouncing back to `/sign-in/`.
 */
export default clerkMiddleware(
  async (auth, req) => {
    if (isPublicRoute(req)) {
      return NextResponse.next()
    }

    if (HANDSHAKE_QUERY_PARAMS.some((param) => req.nextUrl.searchParams.has(param))) {
      return NextResponse.next()
    }

    const { userId } = await auth()
    if (userId) {
      return NextResponse.next()
    }

    if (hasActiveClerkCookie(req)) {
      return NextResponse.next()
    }

    const rawSignInPath =
      (process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-in/").trim() || "/sign-in/"
    return NextResponse.redirect(new URL(rawSignInPath, req.url))
  },
  {
    clockSkewInMs: process.env.NODE_ENV === "development" ? 86_400_000 : 60_000,
  }
)

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
