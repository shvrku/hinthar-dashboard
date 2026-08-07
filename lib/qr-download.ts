import QRCode from "qrcode"
import JSZip from "jszip"
import { downloadBlob } from "@/lib/export-utils"

export async function downloadQrPng(token: string, filename: string, size = 256) {
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
  const zip = new JSZip()
  const folder = zip.folder("qr-codes") ?? zip
  for (const item of items) {
    if (!item.token) continue
    const dataUrl = await QRCode.toDataURL(item.token, { width: size, margin: 2 })
    const base64 = dataUrl.split(",")[1]
    if (!base64) continue
    folder.file(item.filename, base64, { base64: true })
  }
  const blob = await zip.generateAsync({ type: "blob" })
  downloadBlob(zipName, blob)
}
