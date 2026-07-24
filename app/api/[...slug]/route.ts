import { NextResponse, type NextRequest } from "next/server"

// Proxies ALL /api/* requests to the Django backend (including /api/v1/*).
// trailingSlash: true in next.config.ts prevents Next.js from redirecting slashed URLs.
// Django uses APPEND_SLASH=True, so we always forward with trailing slash.
// CORS handled by headers() in next.config.ts (framework-level).

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

async function handleRequest(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  const cleanSlug = slug.filter(Boolean).join("/")
  const pathname = `/api/${cleanSlug}/`
  const search = request.nextUrl.search || ""
  const proxyUrl = `${API_ORIGIN}${pathname}${search}`

  const forwardHeaders = new Headers()
  const ignoreRequestHeaders = new Set(["host", "connection", "content-length"])
  request.headers.forEach((value, key) => {
    if (!ignoreRequestHeaders.has(key.toLowerCase())) {
      forwardHeaders.set(key, value)
    }
  })

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
      redirect: "follow",
    })

    const body = await response.arrayBuffer()

    const responseHeaders = new Headers()
    for (const [key, value] of response.headers) {
      if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    }

    const hasNoBody = response.status === 204 || response.status === 205 || response.status === 304
    return new NextResponse(hasNoBody ? null : body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred"
    return NextResponse.json(
      { error: message },
      { status: 502 }
    )
  }
}

export const GET = handleRequest
export const POST = handleRequest
export const PUT = handleRequest
export const DELETE = handleRequest
export const PATCH = handleRequest
