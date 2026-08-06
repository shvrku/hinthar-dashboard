import type { Class, EducationLevel } from "@/lib/types"
import { EDUCATION_LEVELS } from "@/lib/types"

export function formatClassLabel(cls: Pick<Class, "education_level" | "cohort_identifier" | "cohort_sub_category">): string {
  const level =
    EDUCATION_LEVELS.find((l) => l.value === cls.education_level)?.label ?? cls.education_level
  const sub = cls.cohort_sub_category ? cls.cohort_sub_category : ""
  return `${level} ${cls.cohort_identifier}${sub}`.trim()
}

export function educationLevelLabel(level: EducationLevel | string): string {
  return EDUCATION_LEVELS.find((l) => l.value === level)?.label ?? level
}
