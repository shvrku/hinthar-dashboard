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
  paid: boolean | null
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

export interface SubjectPayload {
  name: string
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
  student: number
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
  role: "admin" | "staff" | "teacher" | "student" | "terminal"
  clerk_id: string
  teacher_profile_id: number | null
  student_profile_id: number | null
  staff_profile_id: number | null
  is_active: boolean
}

// --- Dashboard Stats ---
export interface Stats {
  users: number
  students: number
  teachers: number
  staff: number
  classes: number
  sessions: number
  check_ins_today: number
  subjects?: number
  [key: string]: number | undefined
}
