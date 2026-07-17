// --- Enums ---

export type EducationLevel =
  | "IAL" | "IG"
  | "Year1" | "Year2" | "Year3" | "Year4" | "Year5"
  | "Year6" | "Year7" | "Year8" | "Year9"

export const EDUCATION_LEVELS: { value: EducationLevel; label: string }[] = [
  { value: "IAL", label: "IAL" },
  { value: "IG", label: "IG" },
  { value: "Year1", label: "Year 1" },
  { value: "Year2", label: "Year 2" },
  { value: "Year3", label: "Year 3" },
  { value: "Year4", label: "Year 4" },
  { value: "Year5", label: "Year 5" },
  { value: "Year6", label: "Year 6" },
  { value: "Year7", label: "Year 7" },
  { value: "Year8", label: "Year 8" },
  { value: "Year9", label: "Year 9" },
]

export type EmploymentType = "full_time" | "tutor"
export const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "full_time", label: "Full Time" },
  { value: "tutor", label: "Tutor" },
]

export type SessionStatus = "scheduled" | "completed" | "cancelled" | "no_show"
export const SESSION_STATUSES: { value: SessionStatus; label: string }[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
]

// --- API Response types ---

export interface Class {
  id: number
  education_level: EducationLevel
  cohort_identifier: string
  cohort_sub_category: string | null
}

export interface Student {
  id: number
  name: string
  dob: string | null
  enrollment_date: string
  contact: string | null
  user_id: number
  check_in_token: string
}

export interface Teacher {
  id: number
  name: string
  employment_type: EmploymentType | null
  default_rate: string | null
  contact: string | null
  bank_details: string | null
  user_id: number
}

export interface Session {
  id: number
  timetable_slot: unknown
  teacher: Teacher
  class_obj: Class
  start_time: string
  end_time: string
  status: SessionStatus | null
  paid: boolean | null
  payslip: number | null
}

// --- Create/Update payloads (only writable fields) ---

export interface ClassPayload {
  education_level: EducationLevel
  cohort_identifier: string
  cohort_sub_category?: string | null
}

export interface StudentPayload {
  name: string
  dob?: string | null
  contact?: string | null
}

export interface TeacherPayload {
  name: string
  employment_type?: EmploymentType | null
  default_rate?: string | null
  contact?: string | null
  bank_details?: string | null
}

export interface SessionPayload {
  start_time: string
  end_time: string
  status?: SessionStatus | null
  paid?: boolean | null
  payslip?: number | null
}

// --- CheckIn ---

export interface CheckIn {
  id: number
  student: number
  student_name: string
  date: string
  timestamp: string
  check_in_type: "qr" | "manual"
  checked_by: string | null
}

export interface CheckInPayload {
  student: number
  check_in_type: "qr" | "manual"
}

// --- ClassStudent ---

export interface ClassStudent {
  id: number
  student: number
  class_obj: number
}
