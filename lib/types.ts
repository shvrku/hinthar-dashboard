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
  { value: "IAL", label: "IAL (A Level)" },
  { value: "IG", label: "IGCSE" },
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
  user_id: number | null
  /** Present on student detail / token endpoints only — omitted from list responses. */
  check_in_token?: string
  check_in_token_active?: boolean
  /** Enrollment summary from list/detail (class display names). */
  class_labels?: string[]
  class_ids?: number[]
}

export type StudentAnalyticsRange = "week" | "month" | "all"
export type AnalyticsRange = StudentAnalyticsRange

export interface StudentAttendanceSummary {
  range: StudentAnalyticsRange
  date_from: string
  date_to: string
  campus: {
    days_in_range: number
    days_checked_in: number
    rate: number | null
    daily: { date: string; checked_in: boolean }[]
  }
  lesson: {
    total_sessions: number
    present: number
    late: number
    absent: number
    excused: number
    rate_attended: number | null
    by_status: { status: SessionAttendanceStatus; count: number }[]
    by_class: {
      class_id: number
      class_label: string
      present: number
      late: number
      absent: number
      excused: number
      total: number
    }[]
    by_subject?: {
      subject_id: number | null
      subject_label: string
      present: number
      late: number
      absent: number
      excused: number
      total: number
    }[]
    trend: {
      date: string
      present: number
      late: number
      absent: number
      excused: number
    }[]
  }
}

export interface ClassAttendanceSummary {
  range: AnalyticsRange
  date_from: string
  date_to: string
  campus: {
    enrolled_students: number
    days_in_range: number
    check_ins: number
    rate: number | null
    daily: { date: string; checked_in: number; enrolled: number }[]
  }
  lesson: {
    total_marks: number
    present: number
    late: number
    absent: number
    excused: number
    rate_attended: number | null
    by_status: { status: SessionAttendanceStatus; count: number }[]
    by_subject: {
      subject_id: number | null
      subject_label: string
      present: number
      late: number
      absent: number
      excused: number
      total: number
    }[]
    by_teacher: {
      teacher_id: number | null
      teacher_name: string
      present: number
      late: number
      absent: number
      excused: number
      total: number
    }[]
    trend: {
      date: string
      present: number
      late: number
      absent: number
      excused: number
    }[]
  }
}

export type TeacherPersonalOutcome =
  | "unmarked"
  | "present"
  | "covered"
  | "cover_taught"
  | "no_show"
  | "cancelled"

export interface TeacherAttendanceSummary {
  range: AnalyticsRange
  date_from: string
  date_to: string
  accountability: {
    sessions_taught: number
    total_marks: number
    present: number
    late: number
    absent: number
    excused: number
    rate_attended: number | null
    by_status: { status: SessionAttendanceStatus; count: number }[]
    by_class: {
      class_id: number
      class_label: string
      present: number
      late: number
      absent: number
      excused: number
      total: number
    }[]
    by_subject?: {
      subject_id: number | null
      subject_label: string
      present: number
      late: number
      absent: number
      excused: number
      total: number
    }[]
  }
  personal: {
    by_outcome: { outcome: TeacherPersonalOutcome; count: number }[]
    unmarked: number
    present: number
    covered: number
    cover_taught: number
    no_show: number
    cancelled: number
    recent_sessions: {
      kind: "session" | "adhoc"
      session_id: number
      date: string
      status: SessionStatus | string
      outcome: TeacherPersonalOutcome
      class_label: string | null
      subject_label: string | null
      assigned_teacher_id: number
      assigned_teacher_name: string | null
      actual_teacher_id: number | null
      actual_teacher_name: string | null
    }[]
    cover_history: TeacherAttendanceSummary["personal"]["recent_sessions"]
  }
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
  /** Who actually taught; null means taught as assigned (or not yet run). */
  actual_teacher?: Teacher | null
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
  records?: Record<string, string | null>
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
  start_time?: string
  end_time?: string
  status?: SessionStatus | null
  teacher_id?: number | null
  actual_teacher_id?: number | null
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

// --- Check-in overview aggregate (GET /check-ins/overview/) ---

export interface CheckInStatus {
  id: number
  timestamp: string
  check_in_type: "qr" | "manual"
}

export interface OverviewClassSummary {
  id: number
  label: string
  arrived: number
  total: number
}

export interface OverviewClassStudent {
  id: number
  name: string
  unique_code: string | null
  class_id?: number | null
  class_label?: string | null
  check_in: CheckInStatus | null
}

export interface OverviewSearchResult {
  student_id: number
  name: string
  unique_code: string | null
  class_id: number
  class_label: string
  check_in: CheckInStatus | null
}

export interface OverviewClassesResponse {
  mode: "classes"
  date: string
  classes: OverviewClassSummary[]
}

export interface OverviewClassResponse {
  mode: "class"
  date: string
  class: { id: number; label: string }
  arrived: number
  total: number
  students: OverviewClassStudent[]
}

export interface OverviewSchoolResponse {
  mode: "school"
  date: string
  class: { id: null; label: string }
  arrived: number
  total: number
  count: number
  page: number
  page_size: number
  num_pages: number
  /** Present when requested via `status=missing|arrived`. */
  status?: "missing" | "arrived"
  students: OverviewClassStudent[]
}

export type OverviewRosterResponse =
  | OverviewClassResponse
  | OverviewSchoolResponse

export interface OverviewSearchResponse {
  mode: "search"
  date: string
  count: number
  page: number
  page_size: number
  num_pages: number
  results: OverviewSearchResult[]
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

export type TrendDirection = "up" | "down" | "stable"

export interface StatTrend {
  current: number
  previous: number
  delta: number
  direction: TrendDirection
}

export type AuditCategory =
  | "student"
  | "teacher"
  | "staff"
  | "class"
  | "session"
  | "check_in"
  | "user"
  | "other"

export interface AuditLog {
  id: number
  user: number | null
  user_email: string | null
  category: AuditCategory
  summary: string
  model_name: string
  record_id: string
  action: "create" | "update" | "delete"
  field_name: string | null
  old_value: string | null
  new_value: string | null
  timestamp: string
}

export interface StudentSeriesPoint {
  date: string
  count: number
  new?: number
}

/** Stats (GET /api/v1/stats/) --- */
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
  trends: {
    students: StatTrend
    teachers: StatTrend
    classes: StatTrend
    sessions: StatTrend
    check_ins: StatTrend
  }
  student_series: StudentSeriesPoint[]
  recent_activity: AuditLog[]
}

/** DRF page envelope (default page_size 50, max 200). */
export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
