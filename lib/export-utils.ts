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

/** Export the first SVG inside a container as PNG. */
export async function exportContainerChartPng(
  container: HTMLElement | null,
  filename: string
): Promise<boolean> {
  if (!container) return false
  const svg = container.querySelector("svg")
  if (!svg) return false

  const cloned = svg.cloneNode(true) as SVGElement
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
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--background")
      ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue("--background").trim()})`
      : "#ffffff"
    // Fallback solid fill if CSS var parsing fails
    ctx.fillStyle = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? document.documentElement.classList.contains("dark")
        ? "#09090b"
        : "#ffffff"
      : document.documentElement.classList.contains("dark")
        ? "#09090b"
        : "#ffffff"
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
