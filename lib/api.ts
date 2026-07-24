export class ApiError extends Error {
  constructor(public status: number, public userMessage: string) {
    super(userMessage)
    this.name = "ApiError"
  }
}

// Always use a relative path — Next.js proxies to the backend via rewrites.
// This keeps all browser requests same-origin, avoiding CORS entirely.
const API_BASE = "/api/v1"

function buildQueryString(params?: Record<string, string | number | undefined | null>): string {
  const query = new URLSearchParams()
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== "" && val !== "all") {
        query.append(key, String(val))
      }
    }
  }
  const str = query.toString()
  return str ? `?${str}` : ""
}

async function request<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  let res: Response
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Network error"
    throw new ApiError(
      0,
      `Unable to connect to API server (${API_BASE}). Details: ${detail}`
    )
  }

  if (!res.ok) {
    let detail = "An error occurred"
    const raw = await res.text()
    if (raw) {
      try {
        const json = JSON.parse(raw)
        if (json && typeof json === "object") {
          if (typeof json.detail === "string") {
            detail = json.detail
          } else if (typeof json.error === "string") {
            detail = json.error
          } else if (typeof json.message === "string") {
            detail = json.message
          } else {
            const formatted = formatErrorDetail(json)
            if (formatted) detail = formatted
          }
        }
      } catch {
        detail = raw // use raw text if not JSON
      }
    }
    throw new ApiError(res.status, detail)
  }

  if (res.status === 204) return undefined as T
  const data = await res.json()
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    "results" in data &&
    Array.isArray((data as { results: unknown }).results)
  ) {
    return (data as { results: unknown[] }).results as unknown as T
  }
  return data as T
}

function formatErrorDetail(data: unknown): string {
  if (!data) return ""
  if (typeof data === "string") return data
  if (Array.isArray(data)) {
    return data.map((item) => formatErrorDetail(item)).filter(Boolean).join(", ")
  }
  if (typeof data === "object") {
    const parts: string[] = []
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const formattedVal = formatErrorDetail(val)
      if (formattedVal) {
        const prefix = !isNaN(Number(key)) ? `Row ${Number(key) + 1}` : key
        parts.push(`${prefix}: ${formattedVal}`)
      }
    }
    return parts.join("; ")
  }
  return String(data)
}

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const apiCache = new Map<string, CacheEntry<unknown>>()
const DEFAULT_TTL_MS = 60_000 // 1 minute default TTL for dropdown metadata

export function clearApiCache(prefix?: string) {
  if (!prefix) {
    apiCache.clear()
    return
  }
  for (const key of apiCache.keys()) {
    if (key.includes(prefix)) {
      apiCache.delete(key)
    }
  }
}

async function cachedRequest<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {},
  ttlMs = DEFAULT_TTL_MS,
  forceRefresh = false
): Promise<T> {
  const method = (options.method || "GET").toUpperCase()
  if (method !== "GET") {
    return request<T>(endpoint, token, options)
  }

  const cacheKey = `${token}:${endpoint}`
  if (!forceRefresh) {
    const cached = apiCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < ttlMs) {
      return cached.data as T
    }
  }

  const data = await request<T>(endpoint, token, options)
  apiCache.set(cacheKey, { data, timestamp: Date.now() })
  return data
}

export function createApi(token: string) {
  return {
    // --- Classes ---
    listClasses: (params?: Record<string, string | number | undefined | null>, forceRefresh = false) =>
      cachedRequest<import("./types").Class[]>(`/classes/${buildQueryString(params)}`, token, {}, DEFAULT_TTL_MS, forceRefresh),

    getClass: (id: number) =>
      request<import("./types").Class>(`/classes/${id}/`, token),

    createClass: async (data: import("./types").ClassPayload) => {
      const res = await request<import("./types").Class>(`/classes/`, token, {
        method: "POST",
        body: JSON.stringify(data),
      })
      clearApiCache("/classes/")
      return res
    },

    updateClass: async (id: number, data: import("./types").ClassPayload) => {
      const res = await request<import("./types").Class>(`/classes/${id}/`, token, {
        method: "PUT",
        body: JSON.stringify(data),
      })
      clearApiCache("/classes/")
      return res
    },

    deleteClass: async (id: number) => {
      const res = await request<void>(`/classes/${id}/`, token, { method: "DELETE" })
      clearApiCache("/classes/")
      return res
    },

    bulkDeleteClasses: async (ids: number[]) => {
      const res = await request<{ deleted_count: number; deleted_ids: number[] }>(`/classes/bulk_delete/`, token, {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      })
      clearApiCache("/classes/")
      return res
    },

    // --- Students ---
    listStudents: (params?: Record<string, string | number | undefined | null>) =>
      request<import("./types").Student[]>(`/students/${buildQueryString(params)}`, token),

    getStudent: (id: number) =>
      request<import("./types").Student>(`/students/${id}/`, token),

    createStudent: (data: import("./types").StudentPayload) =>
      request<import("./types").Student>(`/students/`, token, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateStudent: (id: number, data: import("./types").StudentPayload) =>
      request<import("./types").Student>(`/students/${id}/`, token, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    deleteStudent: (id: number) =>
      request<void>(`/students/${id}/`, token, { method: "DELETE" }),

    bulkDeleteStudents: (ids: number[]) =>
      request<{ deleted_count: number; deleted_ids: number[] }>(`/students/bulk_delete/`, token, {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }),

    bulkCreateStudents: (items: import("./types").StudentPayload[]) =>
      request<{ created_count: number; items: import("./types").Student[] }>(`/students/bulk_create/`, token, {
        method: "POST",
        body: JSON.stringify({ items }),
      }),

    getCheckInToken: (id: number) =>
      request<import("./types").Student>(`/students/${id}/check_in_token/`, token),

    regenerateCheckInToken: (id: number) =>
      request<import("./types").Student>(`/students/${id}/regenerate_check_in_token/`, token, {
        method: "POST",
      }),

    // --- Check-Ins ---
    listCheckIns: (params?: Record<string, string | number | undefined | null>) =>
      request<import("./types").CheckIn[]>(`/check-ins/${buildQueryString(params)}`, token),

    createCheckInManual: (studentId: number) =>
      request<import("./types").CheckIn>(`/check-ins/manual/`, token, {
        method: "POST",
        body: JSON.stringify({ student_id: studentId }),
      }),

    createCheckInByQr: (checkInToken: string) =>
      request<import("./types").CheckIn>(`/check-ins/qr/`, token, {
        method: "POST",
        body: JSON.stringify({ check_in_token: checkInToken }),
      }),

    // --- Class-Students ---
    listClassStudents: (params?: Record<string, string | number | undefined | null>) =>
      request<import("./types").ClassStudent[]>(`/class-students/${buildQueryString(params)}`, token),

    createClassStudent: (classObjId: number, studentId: number) =>
      request<import("./types").ClassStudent>(`/class-students/`, token, {
        method: "POST",
        body: JSON.stringify({ class_obj_id: classObjId, student_id: studentId }),
      }),

    deleteClassStudent: (id: number) =>
      request<void>(`/class-students/${id}/`, token, { method: "DELETE" }),

    bulkDeleteClassStudents: (ids: number[]) =>
      request<{ deleted_count: number; deleted_ids: number[] }>(`/class-students/bulk_delete/`, token, {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }),

    // --- Subjects ---
    listSubjects: (params?: Record<string, string | number | undefined | null>, forceRefresh = false) =>
      cachedRequest<import("./types").Subject[]>(`/subjects/${buildQueryString(params)}`, token, {}, DEFAULT_TTL_MS, forceRefresh),

    getSubject: (id: number) =>
      request<import("./types").Subject>(`/subjects/${id}/`, token),

    createSubject: async (data: import("./types").SubjectPayload) => {
      const res = await request<import("./types").Subject>(`/subjects/`, token, {
        method: "POST",
        body: JSON.stringify(data),
      })
      clearApiCache("/subjects/")
      return res
    },

    updateSubject: async (id: number, data: import("./types").SubjectPayload) => {
      const res = await request<import("./types").Subject>(`/subjects/${id}/`, token, {
        method: "PUT",
        body: JSON.stringify(data),
      })
      clearApiCache("/subjects/")
      return res
    },

    deleteSubject: async (id: number) => {
      const res = await request<void>(`/subjects/${id}/`, token, { method: "DELETE" })
      clearApiCache("/subjects/")
      return res
    },

    bulkDeleteSubjects: async (ids: number[]) => {
      const res = await request<{ deleted_count: number; deleted_ids: number[] }>(`/subjects/bulk_delete/`, token, {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      })
      clearApiCache("/subjects/")
      return res
    },

    // --- Timetable Slots ---
    listTimetableSlots: (params?: Record<string, string | number | undefined | null>, forceRefresh = false) =>
      cachedRequest<import("./types").TimetableSlot[]>(`/timetable-slots/${buildQueryString(params)}`, token, {}, DEFAULT_TTL_MS, forceRefresh),

    getTimetableSlot: (id: number) =>
      request<import("./types").TimetableSlot>(`/timetable-slots/${id}/`, token),

    createTimetableSlot: async (data: import("./types").TimetableSlotPayload) => {
      const res = await request<import("./types").TimetableSlot>(`/timetable-slots/`, token, {
        method: "POST",
        body: JSON.stringify(data),
      })
      clearApiCache("/timetable-slots/")
      return res
    },

    updateTimetableSlot: async (id: number, data: import("./types").TimetableSlotPayload) => {
      const res = await request<import("./types").TimetableSlot>(`/timetable-slots/${id}/`, token, {
        method: "PUT",
        body: JSON.stringify(data),
      })
      clearApiCache("/timetable-slots/")
      return res
    },

    deleteTimetableSlot: async (id: number) => {
      const res = await request<void>(`/timetable-slots/${id}/`, token, { method: "DELETE" })
      clearApiCache("/timetable-slots/")
      return res
    },

    // --- Teachers ---
    listTeachers: (params?: Record<string, string | number | undefined | null>, forceRefresh = false) =>
      cachedRequest<import("./types").Teacher[]>(`/teachers/${buildQueryString(params)}`, token, {}, DEFAULT_TTL_MS, forceRefresh),

    getTeacher: (id: number) =>
      request<import("./types").Teacher>(`/teachers/${id}/`, token),

    createTeacher: async (data: import("./types").TeacherPayload) => {
      const res = await request<import("./types").Teacher>(`/teachers/`, token, {
        method: "POST",
        body: JSON.stringify(data),
      })
      clearApiCache("/teachers/")
      return res
    },

    updateTeacher: async (id: number, data: import("./types").TeacherPayload) => {
      const res = await request<import("./types").Teacher>(`/teachers/${id}/`, token, {
        method: "PUT",
        body: JSON.stringify(data),
      })
      clearApiCache("/teachers/")
      return res
    },

    deleteTeacher: async (id: number) => {
      const res = await request<void>(`/teachers/${id}/`, token, { method: "DELETE" })
      clearApiCache("/teachers/")
      return res
    },

    bulkDeleteTeachers: async (ids: number[]) => {
      const res = await request<{ deleted_count: number; deleted_ids: number[] }>(`/teachers/bulk_delete/`, token, {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      })
      clearApiCache("/teachers/")
      return res
    },

    bulkCreateTeachers: async (items: import("./types").TeacherPayload[]) => {
      const res = await request<{ created_count: number; items: import("./types").Teacher[] }>(`/teachers/bulk_create/`, token, {
        method: "POST",
        body: JSON.stringify({ items }),
      })
      clearApiCache("/teachers/")
      return res
    },

    // --- Sessions ---
    listSessions: (params?: Record<string, string | number | undefined | null>) =>
      request<import("./types").Session[]>(`/sessions/${buildQueryString(params)}`, token),

    getSession: (id: number) =>
      request<import("./types").Session>(`/sessions/${id}/`, token),

    createSession: (data: import("./types").SessionPayload) =>
      request<import("./types").Session>(`/sessions/`, token, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateSession: (id: number, data: import("./types").SessionPayload) =>
      request<import("./types").Session>(`/sessions/${id}/`, token, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    deleteSession: (id: number) =>
      request<void>(`/sessions/${id}/`, token, { method: "DELETE" }),

    bulkDeleteSessions: (ids: number[]) =>
      request<{ deleted_count: number; deleted_ids: number[] }>(`/sessions/bulk_delete/`, token, {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }),

    generateSessionsForClass: (classId: number, data?: { start_date?: string; end_date?: string }) =>
      request<{ class_id: number; total_created: number; total_already_existed: number; created: import("./types").Session[]; already_existed: import("./types").Session[] }>(
        `/sessions/generate/${classId}/`,
        token,
        {
          method: "POST",
          body: JSON.stringify(data ?? {}),
        }
      ),

    // --- Session Attendances ---
    listSessionAttendances: (params?: Record<string, string | number | undefined | null>) =>
      request<import("./types").SessionAttendance[]>(`/session-attendances/${buildQueryString(params)}`, token),

    createSessionAttendance: (data: import("./types").SessionAttendancePayload) =>
      request<import("./types").SessionAttendance>(`/session-attendances/`, token, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateSessionAttendance: (id: number, data: Partial<import("./types").SessionAttendancePayload>) =>
      request<import("./types").SessionAttendance>(`/session-attendances/${id}/`, token, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    deleteSessionAttendance: (id: number) =>
      request<void>(`/session-attendances/${id}/`, token, { method: "DELETE" }),

    bulkDeleteSessionAttendances: (ids: number[]) =>
      request<{ deleted_count: number; deleted_ids: number[] }>(`/session-attendances/bulk_delete/`, token, {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }),

    // --- Ad-Hoc Sessions ---
    listAdHocSessions: (params?: Record<string, string | number | undefined | null>) =>
      request<import("./types").AdHocSession[]>(`/adhoc-sessions/${buildQueryString(params)}`, token),

    getAdHocSession: (id: number) =>
      request<import("./types").AdHocSession>(`/adhoc-sessions/${id}/`, token),

    createAdHocSession: (data: import("./types").AdHocSessionPayload) =>
      request<import("./types").AdHocSession>(`/adhoc-sessions/`, token, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateAdHocSession: (id: number, data: import("./types").AdHocSessionPayload) =>
      request<import("./types").AdHocSession>(`/adhoc-sessions/${id}/`, token, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    deleteAdHocSession: (id: number) =>
      request<void>(`/adhoc-sessions/${id}/`, token, { method: "DELETE" }),

    bulkDeleteAdHocSessions: (ids: number[]) =>
      request<{ deleted_count: number; deleted_ids: number[] }>(`/adhoc-sessions/bulk_delete/`, token, {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }),

    bulkCreateAdHocSessions: (records: import("./types").AdHocSessionPayload[]) =>
      request<import("./types").AdHocSession[]>(`/adhoc-sessions/bulk_create/`, token, {
        method: "POST",
        body: JSON.stringify(records),
      }),

    // --- Ad-Hoc Session Attendances ---
    listAdHocSessionAttendances: (params?: Record<string, string | number | undefined | null>) =>
      request<import("./types").AdHocSessionAttendance[]>(`/adhoc-session-attendances/${buildQueryString(params)}`, token),

    createAdHocSessionAttendance: (data: import("./types").AdHocSessionAttendancePayload) =>
      request<import("./types").AdHocSessionAttendance>(`/adhoc-session-attendances/`, token, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateAdHocSessionAttendance: (id: number, data: Partial<import("./types").AdHocSessionAttendancePayload>) =>
      request<import("./types").AdHocSessionAttendance>(`/adhoc-session-attendances/${id}/`, token, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    deleteAdHocSessionAttendance: (id: number) =>
      request<void>(`/adhoc-session-attendances/${id}/`, token, { method: "DELETE" }),

    bulkDeleteAdHocSessionAttendances: (ids: number[]) =>
      request<{ deleted_count: number; deleted_ids: number[] }>(`/adhoc-session-attendances/bulk_delete/`, token, {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }),

    bulkUpsertSessionAttendances: (records: Array<{ session_id: number; student_id: number; status: string; remarks?: string }>) =>
      request<{ created_count: number; updated_count: number }>(`/session-attendances/bulk_upsert/`, token, {
        method: "POST",
        body: JSON.stringify({ records }),
      }),

    bulkUpsertAdHocSessionAttendances: (records: Array<{ adhoc_session_id?: number; ad_hoc_session_id?: number; student_id: number; status: string; attended?: boolean; remarks?: string }>) =>
      request<{ created_count: number; updated_count: number }>(`/adhoc-session-attendances/bulk_upsert/`, token, {
        method: "POST",
        body: JSON.stringify({ records }),
      }),

    // --- Attendance Matrix Endpoints ---
    getAttendanceMatrix: (params?: Record<string, string | number | undefined | null>) =>
      request<{
        class_id?: string
        sessions: import("./types").Session[]
        students: import("./types").Student[] & { records?: Record<string, string> }[]
        attendances: import("./types").SessionAttendance[]
      }>(`/attendance/matrix/${buildQueryString(params)}`, token),

    getAdHocAttendanceMatrix: (params?: Record<string, string | number | undefined | null>) =>
      request<{
        sessions: import("./types").AdHocSession[]
        students: import("./types").Student[]
        attendances: import("./types").AdHocSessionAttendance[]
      }>(`/adhoc-attendance/matrix/${buildQueryString(params)}`, token),

    // --- Users ---
    listUsers: (params?: Record<string, string | number | undefined | null>) =>
      request<import("./types").User[]>(`/users/${buildQueryString(params)}`, token),

    // --- Stats ---
    getStats: () =>
      request<import("./types").Stats>(`/stats/`, token),
  }
}
