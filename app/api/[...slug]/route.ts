import { auth } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"

// Proxies /api/* to Django. Requires a Clerk session; injects a server-verified Bearer token.

const API_ORIGIN = (
  process.env.BACKEND_API_ORIGIN ||
  // Legacy fallback — prefer BACKEND_API_ORIGIN (server-only).
  process.env.NEXT_PUBLIC_API_ORIGIN ||
  "http://localhost:8000"
).replace(/\/+$/, "")

const STRIP_RESPONSE_HEADERS = new Set([
  "transfer-encoding",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "upgrade",
  "content-encoding",
  "content-length",
])

function isSafeApiSlug(slugParts: string[]): boolean {
  if (slugParts.length === 0) return false
  // Reject path traversal and empty/dot segments
  if (slugParts.some((part) => part === ".." || part === "." || part.includes("\\"))) {
    return false
  }
  // Only forward /api/v1/* to Django (slug arrives without the leading "api")
  if (slugParts[0] !== "v1") return false
  return true
}

async function handleRequest(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  // Resource-level auth (replaces middleware createRouteMatcher gate).
  // Keep explicit 401 JSON — auth.protect() returns 404 for non-document requests.
  const { userId, getToken } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { slug } = await params
  const slugParts = (slug || []).filter(Boolean)

  // SEC-M5: allowlist /api/v1/* and reject traversal
  if (!isSafeApiSlug(slugParts)) {
    // #region agent log
    fetch("http://127.0.0.1:7494/ingest/034dad9a-cd9e-49bb-a577-1a6936ff77a1", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5b0a01" },
      body: JSON.stringify({
        sessionId: "5b0a01",
        hypothesisId: "M5",
        location: "app/api/[...slug]/route.ts:isSafeApiSlug",
        message: "rejected unsafe proxy slug",
        data: { slugParts },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    return NextResponse.json({ error: "Invalid API path" }, { status: 400 })
  }

  const cleanSlug = slugParts.join("/")
  const pathname = `/api/${cleanSlug}/`
  const search = request.nextUrl.search || ""
  const proxyUrl = `${API_ORIGIN}${pathname}${search}`

  const forwardHeaders = new Headers()
  const ignoreRequestHeaders = new Set([
    "host",
    "connection",
    "content-length",
    "authorization",
  ])
  request.headers.forEach((value, key) => {
    if (!ignoreRequestHeaders.has(key.toLowerCase())) {
      forwardHeaders.set(key, value)
    }
  })
  forwardHeaders.set("Authorization", `Bearer ${token}`)

  let requestBody: ArrayBuffer | undefined = undefined
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      requestBody = await request.arrayBuffer()
    } catch {
      // ignore
    }
  }

  try {
    const response = await fetch(proxyUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: requestBody,
      // SEC-M5: do not follow redirects to non-allowlisted locations
      redirect: "manual",
    })

    if (response.status >= 300 && response.status < 400) {
      return NextResponse.json(
        { error: "Unexpected redirect from backend" },
        { status: 502 }
      )
    }

    const body = await response.arrayBuffer()

    const responseHeaders = new Headers()
    for (const [key, value] of response.headers) {
      if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    }

    const hasNoBody =
      response.status === 204 || response.status === 205 || response.status === 304
    return new NextResponse(hasNoBody ? null : body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch {
    return NextResponse.json(
      { error: "Backend unavailable" },
      { status: 502 }
    )
  }
}

export const GET = handleRequest
export const POST = handleRequest
export const PUT = handleRequest
export const DELETE = handleRequest
export const PATCH = handleRequest
