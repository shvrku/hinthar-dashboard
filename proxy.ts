import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"

const ENTRY_PATHS = new Set(["/", "/sign-in", "/sign-in/", "/sign-up", "/sign-up/"])

function resolveSafeRedirectPath(req: NextRequest, rawRedirect: string | null): string {
  if (!rawRedirect) return "/academics/"
  const trimmed = rawRedirect.trim()
  try {
    const reqUrl = new URL(req.url)
    const parsed = new URL(trimmed, reqUrl)
    if (parsed.origin === reqUrl.origin && !ENTRY_PATHS.has(parsed.pathname)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    // fall through to default route
  }
  return "/academics/"
}

/**
 * Session plumbing + direct post-login routing to `/academics/` on entry routes
 * so already-authenticated users visiting `/academics` or `/payroll` never bounce.
 * Resource auth gates live on:
 * - app/(app)/layout.tsx → await auth.protect()
 * - app/api/[...slug]/route.ts → await auth.protect()
 */
export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl
  if (!ENTRY_PATHS.has(pathname)) {
    return
  }

  const { userId } = await auth()
  if (!userId) {
    return
  }

  const targetPath = resolveSafeRedirectPath(
    req,
    req.nextUrl.searchParams.get("redirect_url")
  )
  return NextResponse.redirect(new URL(targetPath, req.url))
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
