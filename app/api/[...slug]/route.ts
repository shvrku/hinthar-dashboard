import { auth } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"

// Fallback proxy when NEXT_PUBLIC_API_ORIGIN is unset.
// Prefer browser → Django (direct) in production to cut Vercel function usage.

const API_ORIGIN = (
  process.env.BACKEND_API_ORIGIN ||
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

/** Safe-to-cache catalog GETs (short private browser/CDN cache). */
const CACHEABLE_GET_PREFIXES = [
  "v1/subjects",
  "v1/classes",
  "v1/teachers",
  "v1/stats",
  "v1/timetable-slots",
  "v1/timetable/class",
  "v1/timetable/teacher",
]

function isSafeApiSlug(slugParts: string[]): boolean {
  if (slugParts.length === 0) return false
  if (slugParts.some((part) => part === ".." || part === "." || part.includes("\\"))) {
    return false
  }
  if (slugParts[0] !== "v1") return false
  return true
}

function cacheControlForGet(slugParts: string[]): string | null {
  const path = slugParts.join("/")
  if (CACHEABLE_GET_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    // private: personalized auth; max-age short to cut repeat proxy hits in a session
    return "private, max-age=60, stale-while-revalidate=120"
  }
  return null
}

async function handleRequest(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
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

  if (!isSafeApiSlug(slugParts)) {
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

    if (request.method === "GET" && response.ok) {
      const cacheControl = cacheControlForGet(slugParts)
      if (cacheControl) {
        responseHeaders.set("Cache-Control", cacheControl)
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
