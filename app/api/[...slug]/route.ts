const API_ORIGIN = process.env.API_ORIGIN || "https://school-management-system-api-xs24.onrender.com"

/** CORS headers added to every response so browsers on other devices/origins can fetch. */
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

/** Headers from the client that we forward to the external API. */
const ALLOWED_FORWARD_HEADERS = [
  "authorization",
  "content-type",
  "accept",
  "user-agent",
]

/** Hop-by-hop & encoding headers that must NOT be forwarded from the upstream response. */
const STRIP_RESPONSE_HEADERS = [
  "transfer-encoding",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "upgrade",
  // These are stripped because Node's fetch() transparently decompresses the body,
  // so forwarding them would make the browser attempt to decompress already-plain bytes.
  "content-encoding",
  "content-length",
]

/** Handle CORS preflight requests. */
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

async function handleRequest(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  // Reconstruct the path. Upstream Django API endpoints always expect a trailing slash
  // (APPEND_SLASH=True). So we ensure the proxied path always ends with a slash.
  const pathname = `/api/${slug.join("/")}/`
  const proxyUrl = new URL(pathname, API_ORIGIN)

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
      headers,
      body: requestBody,
      redirect: "follow",
    })

    // Read the response body as a buffer.
    // Node's fetch() transparently decompresses gzip/br, so `body` is plain bytes.
    // Streaming `response.body` while forwarding the original content-encoding
    // header caused "decoding failed" in browsers. Reading as ArrayBuffer and
    // stripping content-encoding/content-length avoids the mismatch.
    const body = await response.arrayBuffer()

    // Build the response headers, stripping problematic ones
    const responseHeaders = new Headers()
    for (const [key, value] of response.headers) {
      if (!STRIP_RESPONSE_HEADERS.includes(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    }

    // Add CORS headers
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      responseHeaders.set(key, value)
    }

    const hasNoBody = response.status === 204 || response.status === 205 || response.status === 304
    return new Response(hasNoBody ? null : body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred"
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    })
  }
}

export const GET = handleRequest
export const POST = handleRequest
export const PUT = handleRequest
export const DELETE = handleRequest
export const PATCH = handleRequest
