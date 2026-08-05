import { auth } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"

// Proxies /api/* to Django. Requires a Clerk session; injects a server-verified Bearer token.

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
  const { userId, getToken } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { slug } = await params
  const cleanSlug = slug.filter(Boolean).join("/")
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
      redirect: "follow",
    })

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
