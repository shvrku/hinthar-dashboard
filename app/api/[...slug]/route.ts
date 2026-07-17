const API_ORIGIN = "https://school-management-system-api-xs24.onrender.com"

/** Headers from the client that we forward to the external API. */
const ALLOWED_FORWARD_HEADERS = [
  "authorization",
  "content-type",
  "accept",
  "cookie",
  "user-agent",
  "x-clerk-auth-status",
  "x-clerk-auth-reason",
  "x-clerk-auth-token",
  "x-clerk-claims",
]

async function handleRequest(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  const pathname = `/api/${slug.join("/")}`

  // Strip trailing slash so the external API doesn't 308-redirect us
  const cleanPath = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
  const proxyUrl = new URL(cleanPath, API_ORIGIN)

  // Copy query params from the original request
  if (request.url.includes("?")) {
    proxyUrl.search = new URL(request.url).search
  }

  // Build clean headers — only forward safe headers
  const headers = new Headers()
  for (const key of ALLOWED_FORWARD_HEADERS) {
    const value = request.headers.get(key)
    if (value) headers.set(key, value)
  }

  // Forward the request to the external API (follow redirects server-side)
  try {
    const response = await fetch(proxyUrl, {
      method: request.method,
      headers,
      body:
        request.method !== "GET" && request.method !== "HEAD"
          ? request.body
          : undefined,
      redirect: "follow",
      // @ts-expect-error - duplex is required for streaming bodies in some environments
      duplex: "half",
    })

    // Build the response, stripping problematic hop-by-hop headers
    const responseHeaders = new Headers()
    const HOP_BY_HOP = [
      "transfer-encoding",
      "connection",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailer",
      "upgrade",
    ]
    for (const [key, value] of response.headers) {
      if (!HOP_BY_HOP.includes(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred"
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    })
  }
}

export const GET = handleRequest
export const POST = handleRequest
export const PUT = handleRequest
export const DELETE = handleRequest
export const PATCH = handleRequest
