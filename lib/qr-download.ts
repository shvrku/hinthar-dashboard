import { downloadBlob } from "@/lib/export-utils"

export { qrDownloadFilename } from "@/lib/qr-filename"

export async function downloadQrPng(token: string, filename: string, size = 256) {
  const { default: QRCode } = await import("qrcode")
  const dataUrl = await QRCode.toDataURL(token, { width: size, margin: 2 })
  const link = document.createElement("a")
  link.download = filename
  link.href = dataUrl
  link.click()
}

export async function downloadQrZip(
  items: { token: string; filename: string }[],
  zipName: string,
  size = 256
) {
  const [{ default: QRCode }, { default: JSZip }] = await Promise.all([
    import("qrcode"),
    import("jszip"),
  ])
  const zip = new JSZip()
  const folder = zip.folder("qr-codes") ?? zip
  const usedNames = new Set<string>()
  for (const item of items) {
    if (!item.token) continue
    const dataUrl = await QRCode.toDataURL(item.token, { width: size, margin: 2 })
    const base64 = dataUrl.split(",")[1]
    if (!base64) continue
    let filename = item.filename
    if (usedNames.has(filename)) {
      const stem = filename.replace(/\.png$/i, "")
      let n = 2
      while (usedNames.has(`${stem}-${n}.png`)) n += 1
      filename = `${stem}-${n}.png`
    }
    usedNames.add(filename)
    folder.file(filename, base64, { base64: true })
  }
  const blob = await zip.generateAsync({ type: "blob" })
  downloadBlob(zipName, blob)
}
