// --- Enums ---

export const SCHOOL_CODES = [
  { value: "HIS", label: "HIS" },
  { value: "SPD", label: "SPD" },
  { value: "SPN", label: "SPN" },
  { value: "YWM", label: "YWM" },
] as const

export type SchoolCode = (typeof SCHOOL_CODES)[number]["value"]

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

export type SessionAttendanceStatus = "present" | "absent" | "late" | "excused"

// --- API Response types ---

export interface Class {
  id: number
  education_level: EducationLevel
  cohort_identifier: string
  cohort_sub_category: string | null
}

export interface Student {
  id: number
  unique_code: string
  name: string
  dob: string | null
  enrollment_date: string
  school_code: string
  contact: string | null
  exam_candidate_number: string | null
  user_id: number
  check_in_token: string
}

export interface Teacher {
  id: number
  unique_code: string
  name: string
  employment_type: EmploymentType | null
  contact: string | null
  school_code: string
  join_date: string | null
  user_id: number
}

export interface Subject {
  id: number
  name: string
}

export interface TimetableSlot {
  id: number
  class_obj: Class | null
  subject: Subject
  teacher: Teacher
  day_of_week: number
  start_time: string
  end_time: string
  room: string | null
}

export interface Session {
  id: number
  timetable_slot: TimetableSlot | null
  teacher: Teacher
  class_obj: Class | null
  start_time: string
  end_time: string
  status: SessionStatus | null
}

/** Flattened student row from /attendance/matrix/ and /adhoc-attendance/matrix/. */
export interface AttendanceMatrixStudent {
  id: number
  name: string
  unique_code: string | null
  user_id: number | null
  records?: Record<string, string>
}

/** Flattened session row from /attendance/matrix/ and /adhoc-attendance/matrix/. */
export interface AttendanceMatrixSession {
  id: number
  start_time: string
  end_time: string
  subject: string | null
  subject_id: number | null
  teacher_id: number | null
  teacher_name: string | null
  status?: SessionStatus | string | null
  date?: string
  class_obj_id?: number | null
  class_name?: string | null
}

// --- Create/Update payloads (only writable fields) ---

export interface ClassPayload {
  education_level: EducationLevel
  cohort_identifier: string
  cohort_sub_category?: string | null
}

export interface StudentPayload {
  name: string
  school_code: string
  dob?: string | null
  enrollment_date?: string | null
  contact?: string | null
  exam_candidate_number?: string | null
}

export interface SubjectPayload {
  name: string
}

export interface TeacherPayload {
  name: string
  school_code: string
  employment_type?: EmploymentType | null
  contact?: string | null
  join_date?: string | null
}

export interface SessionPayload {
  start_time: string
  end_time: string
  status?: SessionStatus | null
  teacher_id?: number | null
  class_obj_id?: number | null
  timetable_slot_id?: number | null
}

export interface TimetableSlotPayload {
  class_obj_id: number
  subject_id: number
  teacher_id: number
  day_of_week: number
  start_time: string
  end_time: string
}

// --- CheckIn ---

export interface CheckIn {
  id: number
  /** Nested student object from list/retrieve, or bare id in older payloads. */
  student: number | { id: number; name?: string; unique_code?: string | null }
  student_id?: number
  student_name: string
  date: string
  timestamp: string
  check_in_type: "qr" | "manual"
  checked_by: number | null
}

export interface CheckInPayload {
  student: number
  check_in_type: "qr" | "manual"
}

// Safe student lookup for the terminal confirmation step (no QR token exposed).
export interface CheckInLookup {
  id: number
  name: string
  unique_code: string | null
  class_name: string | null
  checked_in_today: boolean
  method: "qr" | "manual"
}

// --- ClassStudent ---

export interface ClassStudent {
  id: number
  student: Student | number | any
  class_obj: Class | number | any
  student_id?: number
  class_obj_id?: number
}

// --- Session Attendance & Ad-Hoc Sessions ---

export interface SessionAttendance {
  id: number
  session: Session | number | any
  session_id?: number
  student: Student | number | any
  student_id?: number
  attended?: boolean
  status?: SessionAttendanceStatus | null
  remarks: string | null
}

export interface SessionAttendancePayload {
  session?: number
  session_id?: number
  student?: number
  student_id?: number
  attended?: boolean
  status?: SessionAttendanceStatus | null
  remarks?: string | null
}

export interface AdHocSession {
  id: number
  title: string
  teacher: Teacher
  start_time: string
  end_time: string
  date?: string
  subject?: Subject | null
  status?: SessionStatus | string | null
}

export interface AdHocSessionPayload {
  title?: string
  teacher_id?: number
  start_time?: string
  end_time?: string
  date?: string
  subject_id?: number | null
  status?: SessionStatus | string | null
}

export interface AdHocSessionAttendance {
  id: number
  adhoc_session?: AdHocSession | number | any
  ad_hoc_session?: AdHocSession | number | any
  adhoc_session_id?: number
  ad_hoc_session_id?: number
  student?: Student | number | any
  student_id?: number
  attended?: boolean
  status?: SessionAttendanceStatus | null
  remarks: string | null
}

export interface AdHocSessionAttendancePayload {
  adhoc_session?: number
  ad_hoc_session?: number
  adhoc_session_id?: number
  ad_hoc_session_id?: number
  student?: number
  student_id?: number
  attended?: boolean
  status?: SessionAttendanceStatus | null
  remarks?: string | null
}

// --- User ---
export interface User {
  id: number
  username: string
  email: string
  role: "pending" | "admin" | "staff" | "teacher" | "student" | "terminal"
  clerk_id: string
  teacher_profile_id: number | null
  student_profile_id: number | null
  staff_profile_id: number | null
  is_active: boolean
}

// --- Stats (GET /api/v1/stats/) ---
export interface Stats {
  users: number
  students: number
  teachers: number
  staff: number
  subjects: number
  classes: number
  class_students: number
  timetable_slots: number
  sessions: number
  session_attendances: number
  check_ins: number
}

/** DRF page envelope (default page_size 50, max 200). */
export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
