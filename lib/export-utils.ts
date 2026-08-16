/** Download a data URL or Blob as a file. */
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const link = document.createElement("a")
  link.download = filename
  link.href = dataUrl
  link.click()
}

/** Escape a CSV cell. */
function csvCell(value: unknown): string {
  const raw = value == null ? "" : String(value)
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
  return raw
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    downloadBlob(filename, new Blob([""], { type: "text/csv;charset=utf-8" }))
    return
  }
  const headers = Object.keys(rows[0])
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((h) => csvCell(row[h])).join(",")),
  ]
  downloadBlob(filename, new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }))
}

function isTransparent(color: string) {
  return color === "transparent" || color === "rgba(0, 0, 0, 0)" || color === "rgba(0,0,0,0)"
}

/** First non-transparent background from the chart up through its parents. */
function resolvedSurfaceColor(start: HTMLElement): string {
  let node: HTMLElement | null = start
  while (node) {
    const bg = getComputedStyle(node).backgroundColor
    if (bg && !isTransparent(bg)) return bg
    node = node.parentElement
  }
  return "#ffffff"
}

/** Copy computed paint onto a cloned SVG so CSS variables still resolve off-document. */
function inlineComputedSvgPaint(source: SVGElement, clone: SVGElement) {
  const from = [source, ...source.querySelectorAll("*")]
  const to = [clone, ...clone.querySelectorAll("*")]
  const count = Math.min(from.length, to.length)

  for (let i = 0; i < count; i++) {
    const cs = getComputedStyle(from[i])
    const dest = to[i]
    if (from[i] === source) continue
    dest.setAttribute("fill", cs.fill)
    dest.setAttribute("stroke", cs.stroke)
    dest.setAttribute("stop-color", cs.stopColor)
    dest.setAttribute("opacity", cs.opacity)
    dest.setAttribute("fill-opacity", cs.fillOpacity)
    dest.setAttribute("stroke-opacity", cs.strokeOpacity)
    dest.setAttribute("stroke-width", cs.strokeWidth)
    dest.setAttribute("font-size", cs.fontSize)
    dest.setAttribute("font-family", cs.fontFamily)
    dest.setAttribute("font-weight", cs.fontWeight)
  }
}

/** Export the first SVG inside a container as PNG. */
export async function exportContainerChartPng(
  container: HTMLElement | null,
  filename: string
): Promise<boolean> {
  if (!container) return false
  const svg = container.querySelector("svg")
  if (!svg) return false

  const cloned = svg.cloneNode(true) as SVGElement
  inlineComputedSvgPaint(svg, cloned)

  const bbox = svg.getBoundingClientRect()
  const width = Math.max(1, Math.ceil(bbox.width))
  const height = Math.max(1, Math.ceil(bbox.height))
  cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  cloned.setAttribute("width", String(width))
  cloned.setAttribute("height", String(height))

  const xml = new XMLSerializer().serializeToString(cloned)
  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" })
  const url = URL.createObjectURL(svgBlob)

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error("Failed to rasterize chart"))
      image.src = url
    })
    const canvas = document.createElement("canvas")
    canvas.width = width * 2
    canvas.height = height * 2
    const ctx = canvas.getContext("2d")
    if (!ctx) return false
    ctx.fillStyle = resolvedSurfaceColor(container)
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.scale(2, 2)
    ctx.drawImage(img, 0, 0, width, height)
    downloadDataUrl(filename, canvas.toDataURL("image/png"))
    return true
  } catch {
    return false
  } finally {
    URL.revokeObjectURL(url)
  }
}
