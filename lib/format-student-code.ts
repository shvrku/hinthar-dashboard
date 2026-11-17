const CANONICAL_STUDENT_CODE_RE = /^(?:HIS|SPD|SPN|YWM)\d{2}-\d{5}$/

/**
 * Return the canonical SPD26-00001 student identifier for broadsheet/portal display,
 * normalizing legacy dummy codes such as DUMMY-IGK3-001 or #0001-2023-001.
 */
export function formatStudentIdentifier(
  code: string | null | undefined,
  studentId: number
): string {
  const raw = (code ?? "").trim()
  if (CANONICAL_STUDENT_CODE_RE.test(raw)) {
    return raw
  }
  const trailingDigits = /(\d+)\s*$/.exec(raw)
  const seq = trailingDigits ? Number(trailingDigits[1]) : studentId
  const safeSeq = Number.isFinite(seq) && seq > 0 ? seq : studentId
  return `SPD26-${String(safeSeq).padStart(5, "0")}`
}
