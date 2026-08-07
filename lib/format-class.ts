import type { Class, EducationLevel } from "@/lib/types"
import { EDUCATION_LEVELS } from "@/lib/types"

/** Human-readable class name, e.g. "Year 6 · A" or "IGCSE · K1". */
export function formatClassLabel(
  cls: Pick<Class, "education_level" | "cohort_identifier" | "cohort_sub_category">
): string {
  const level = educationLevelLabel(cls.education_level)
  const stream = `${cls.cohort_identifier ?? ""}${cls.cohort_sub_category ?? ""}`.trim()
  return stream ? `${level} · ${stream}` : level
}

export function educationLevelLabel(level: EducationLevel | string): string {
  return EDUCATION_LEVELS.find((l) => l.value === level)?.label ?? level
}

/** Format API `class_labels` entries that may still be raw (`Year6 A` / `IG K1`). */
export function formatClassLabelText(raw: string): string {
  const text = raw.trim()
  if (!text) return "Unassigned"
  // Already formatted with middle dot
  if (text.includes("·")) return text
  const match = text.match(/^(IAL|IG|Year\d+)\s*(.*)$/i)
  if (!match) return text
  const level = educationLevelLabel(match[1])
  const stream = (match[2] || "").trim()
  return stream ? `${level} · ${stream}` : level
}
