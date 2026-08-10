import type { Class, EducationLevel } from "@/lib/types"
import { EDUCATION_LEVELS } from "@/lib/types"

/** Max lengths — keep in sync with Django `Class` model fields. */
export const COHORT_IDENTIFIER_MAX_LENGTH = 1
export const COHORT_SUB_CATEGORY_MAX_LENGTH = 10

export const COHORT_IDENTIFIER_PLACEHOLDER = "e.g. A, K"
export const COHORT_SUB_CATEGORY_PLACEHOLDER = "e.g. 2, 2A, 2B, 4"

export const COHORT_IDENTIFIER_HINT =
  "One letter only (e.g. A for Year 6 A, K for IGCSE K-stream)."
export const COHORT_SUB_CATEGORY_HINT =
  "Letters and numbers — combines with the identifier (K + 2 → K2, K + 2A → K2A, K + 4 → K4)."

/** Strip non-letters and keep a single uppercase character. */
export function sanitizeCohortIdentifierInput(value: string): string {
  return value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, COHORT_IDENTIFIER_MAX_LENGTH)
}

/** Strip to letters/numbers and uppercase letters (e.g. 2a → 2A). */
export function sanitizeCohortSubCategoryInput(value: string): string {
  return value
    .replace(/[^A-Za-z0-9]/g, "")
    .replace(/[A-Za-z]/g, (ch) => ch.toUpperCase())
    .slice(0, COHORT_SUB_CATEGORY_MAX_LENGTH)
}

/** Concatenate cohort identifier + optional sub-category (e.g. K + 2 → K2, K + 2A → K2A). */
export function formatClassStream(
  cohortIdentifier: string,
  cohortSubCategory?: string | null
): string {
  return `${cohortIdentifier ?? ""}${cohortSubCategory ?? ""}`.trim()
}

/** Human-readable class name, e.g. "Year 6 · A", "IGCSE · K2", or "IGCSE · K2A". */
export function formatClassLabel(
  cls: Pick<Class, "education_level" | "cohort_identifier"> & {
    cohort_sub_category?: string | null
  }
): string {
  const level = educationLevelLabel(cls.education_level)
  const stream = formatClassStream(cls.cohort_identifier, cls.cohort_sub_category)
  return stream ? `${level} · ${stream}` : level
}

export function educationLevelLabel(level: EducationLevel | string): string {
  return EDUCATION_LEVELS.find((l) => l.value === level)?.label ?? level
}

/** Format API `class_labels` entries that may still be raw (`Year6 A` / `IG K2A`). */
export function formatClassLabelText(raw: string): string {
  const text = raw.trim()
  if (!text) return "Unassigned"
  if (text.includes("·")) return text
  const match = text.match(/^(IAL|IG|Year\d+)\s*(.*)$/i)
  if (!match) return text
  const level = educationLevelLabel(match[1])
  const stream = (match[2] || "").trim()
  return stream ? `${level} · ${stream}` : level
}
