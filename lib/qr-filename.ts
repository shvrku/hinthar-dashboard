/** Strip characters that are unsafe or awkward in download filenames. */
function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
}

/**
 * QR download basename: unique code + student name.
 * Example: `STU-1042_Aung-Min.png`
 */
export function qrDownloadFilename(student: {
  name?: string | null
  unique_code?: string | null
  id?: number | null
}): string {
  const code =
    sanitizeFilenamePart(student.unique_code ?? "") ||
    (student.id != null ? `id-${student.id}` : "unknown")
  const name = sanitizeFilenamePart(student.name ?? "") || "student"
  return `${code}_${name}.png`
}
