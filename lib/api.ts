export class ApiError extends Error {
  constructor(
    public status: number,
    public userMessage: string,
    public payload?: unknown,
    public retryAfterSeconds?: number
  ) {
    super(userMessage)
    this.name = "ApiError"
  }
}

// Prefer browser → Django (NEXT_PUBLIC_API_ORIGIN) to avoid Vercel serverless
// invocations on every API call. Falls back to same-origin /api proxy.
function resolveApiBase(): string {
  const origin = (process.env.NEXT_PUBLIC_API_ORIGIN || "").replace(/\/+$/, "")
  if (origin) return `${origin}/api/v1`
  return "/api/v1"
}

const API_BASE = resolveApiBase()

export function getApiBase(): string {
  return API_BASE
}

/** True when the browser talks to Django directly (CORS required on SMS). */
export function isDirectApiMode(): boolean {
  return Boolean((process.env.NEXT_PUBLIC_API_ORIGIN || "").trim())
}

/** Builds a query string. The value `"all"` is omitted (UI filter sentinel =
 * "no filter"). Callers that need a literal `all` (e.g. overview `class_id`)
 * must build that param themselves — see `overviewClass`. */
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

function parseRetryAfterSeconds(res: Response, detail: string): number | undefined {
  const header = res.headers.get("Retry-After")
  if (header) {
    const fromHeader = Number(header)
    if (Number.isFinite(fromHeader) && fromHeader > 0) return Math.ceil(fromHeader)
  }
  const fromDetail = detail.match(/available in (\d+) seconds/i)
  if (fromDetail) return Number(fromDetail[1])
  return undefined
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
    const corsHint =
      typeof window !== "undefined" && isDirectApiMode()
        ? ` If this is a CORS failure, add this dashboard origin to SMS CORS_ALLOWED_ORIGINS (and optionally CORS_ALLOWED_ORIGIN_REGEXES for Vercel previews). API base: ${API_BASE}.`
        : ""
    throw new ApiError(
      0,
      `Unable to connect to API server (${API_BASE}). Details: ${detail}.${corsHint}`
    )
  }

  if (!res.ok) {
    let detail = "An error occurred"
    let payload: unknown = undefined
    const raw = await res.text()
    if (raw) {
      try {
        const json = JSON.parse(raw)
        payload = json
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
    throw new ApiError(res.status, detail, payload, parseRetryAfterSeconds(res, detail))
  }

  if (res.status === 204) return undefined as T
  const data = await res.json()
  return data as T
}

function isPaginatedEnvelope<T>(data: unknown): data is import("./types").Paginated<T> {
  return (
    !!data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    "results" in data &&
    Array.isArray((data as { results: unknown }).results) &&
    "count" in data
  )
}

/** Walk DRF pages (page_size=200) until exhausted. Plain arrays pass through. */
async function fetchAllPages<T>(
  endpointPath: string,
  token: string,
  params?: Record<string, string | number | undefined | null>
): Promise<T[]> {
  const pageSize = 200
  const base: Record<string, string | number | undefined | null> = {
    ...params,
    page_size: pageSize,
  }
  delete base.page

  const all: T[] = []
  let page = 1
  for (;;) {
    const data = await request<import("./types").Paginated<T> | T[]>(
      `${endpointPath}${buildQueryString({ ...base, page })}`,
      token
    )
    if (Array.isArray(data)) return data
    if (!isPaginatedEnvelope<T>(data)) return all
    all.push(...data.results)
    if (!data.next || all.length >= data.count || data.results.length === 0) break
    page += 1
    if (page > 100) break
  }
  return all
}

async function fetchPage<T>(
  endpointPath: string,
  token: string,
  params?: Record<string, string | number | undefined | null>
): Promise<import("./types").Paginated<T>> {
  const data = await request<import("./types").Paginated<T> | T[]>(
    `${endpointPath}${buildQueryString(params)}`,
    token
  )
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data }
  }
  if (isPaginatedEnvelope<T>(data)) return data
  return { count: 0, next: null, previous: null, results: [] }
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

    getClassAttendanceSummary: (id: number, range: import("./types").AnalyticsRange) =>
      request<import("./types").ClassAttendanceSummary>(
        `/classes/${id}/attendance-summary/?range=${encodeURIComponent(range)}`,
        token
      ),

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
      fetchAllPages<import("./types").Student>(`/students/`, token, params),

    listStudentsPage: (params?: Record<string, string | number | undefined | null>) =>
      fetchPage<import("./types").Student>(`/students/`, token, params),

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
      request<{ check_in_token: string }>(`/students/${id}/check_in_token/`, token),

    regenerateCheckInToken: (id: number) =>
      request<{ check_in_token: string; check_in_token_active?: boolean }>(
        `/students/${id}/regenerate_check_in_token/`,
        token,
        { method: "POST" }
      ),

    activateCheckInToken: (id: number) =>
      request<{ check_in_token_active: boolean }>(
        `/students/${id}/activate_check_in_token/`,
        token,
        { method: "POST" }
      ),

    deactivateCheckInToken: (id: number) =>
      request<{ check_in_token_active: boolean }>(
        `/students/${id}/deactivate_check_in_token/`,
        token,
        { method: "POST" }
      ),

    getStudentAttendanceSummary: (id: number, range: import("./types").StudentAnalyticsRange) =>
      request<import("./types").StudentAttendanceSummary>(
        `/students/${id}/attendance-summary/?range=${encodeURIComponent(range)}`,
        token
      ),

    linkStudentUser: (studentId: number, userId: number) =>
      request<import("./types").Student>(`/students/${studentId}/link_user/`, token, {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      }),

    unlinkStudentUser: (studentId: number) =>
      request<import("./types").Student>(`/students/${studentId}/unlink_user/`, token, {
        method: "POST",
      }),

    // --- Check-Ins ---
    listCheckIns: (params?: Record<string, string | number | undefined | null>) =>
      fetchAllPages<import("./types").CheckIn>(`/check-ins/`, token, params),

    listCheckInsPage: (params?: Record<string, string | number | undefined | null>) =>
      fetchPage<import("./types").CheckIn>(`/check-ins/`, token, params),

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

    lookupCheckIn: (input: { check_in_token?: string; unique_code?: string }) =>
      request<import("./types").CheckInLookup>(`/check-ins/lookup/`, token, {
        method: "POST",
        body: JSON.stringify(input),
      }),

    deleteCheckIn: (id: number) =>
      request<void>(`/check-ins/${id}/`, token, { method: "DELETE" }),

    // Server-side aggregate for the overview page. Mode is inferred from params:
    // search -> paginated matches; class_id=all -> school roster; class_id -> one roster; neither -> picker summary.
    overviewClasses: (date: string) =>
      request<import("./types").OverviewClassesResponse>(
        `/check-ins/overview/${buildQueryString({ date })}`,
        token
      ),

    // class_id=all must be sent literally. buildQueryString strips "all" for
    // filter UIs (subject/teacher = all means omit), which would wrongly hit
    // the picker-summary mode instead of the school-wide roster.
    overviewClass: (
      date: string,
      classId: number | "all",
      params?: {
        page?: number
        page_size?: number
        status?: "missing" | "arrived"
      }
    ) => {
      const query = new URLSearchParams({
        date,
        class_id: String(classId),
      })
      if (classId === "all") {
        if (params?.page != null) query.set("page", String(params.page))
        if (params?.page_size != null)
          query.set("page_size", String(params.page_size))
        if (params?.status) query.set("status", params.status)
      }
      return request<
        | import("./types").OverviewClassResponse
        | import("./types").OverviewSchoolResponse
      >(`/check-ins/overview/?${query.toString()}`, token)
    },

    overviewSearch: (
      date: string,
      search: string,
      params?: { page?: number; page_size?: number }
    ) =>
      request<import("./types").OverviewSearchResponse>(
        `/check-ins/overview/${buildQueryString({ date, search, ...params })}`,
        token
      ),

    bulkDeleteCheckIns: (ids: number[]) =>
      request<{
        deleted_count: number
        deleted_ids: number[]
        reverted_session_attendances?: number
        reverted_adhoc_attendances?: number
      }>(`/check-ins/bulk_delete/`, token, {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }),

    // --- Class-Students ---
    listClassStudents: (params?: Record<string, string | number | undefined | null>) =>
      fetchAllPages<import("./types").ClassStudent>(`/class-students/`, token, params),

    listClassStudentsPage: (params?: Record<string, string | number | undefined | null>) =>
      fetchPage<import("./types").ClassStudent>(`/class-students/`, token, params),

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
    listTeachers: async (
      params?: Record<string, string | number | undefined | null>,
      forceRefresh = false
    ) => {
      const cacheKey = `${token}:/teachers/:all:${buildQueryString(params)}`
      if (!forceRefresh) {
        const cached = apiCache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < DEFAULT_TTL_MS) {
          return cached.data as import("./types").Teacher[]
        }
      }
      const data = await fetchAllPages<import("./types").Teacher>(`/teachers/`, token, params)
      apiCache.set(cacheKey, { data, timestamp: Date.now() })
      return data
    },

    /** Dropdown/select helper — single page, no multi-page walk. */
    listTeachersForSelect: async (forceRefresh = false) => {
      const cacheKey = `${token}:/teachers/:select`
      if (!forceRefresh) {
        const cached = apiCache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < DEFAULT_TTL_MS) {
          return cached.data as import("./types").Teacher[]
        }
      }
      const page = await fetchPage<import("./types").Teacher>(`/teachers/`, token, {
        page: 1,
        page_size: 200,
      })
      apiCache.set(cacheKey, { data: page.results, timestamp: Date.now() })
      return page.results
    },

    listTeachersPage: (params?: Record<string, string | number | undefined | null>) =>
      fetchPage<import("./types").Teacher>(`/teachers/`, token, params),

    getTeacher: (id: number) =>
      request<import("./types").Teacher>(`/teachers/${id}/`, token),

    getTeacherAttendanceSummary: (id: number, range: import("./types").AnalyticsRange) =>
      request<import("./types").TeacherAttendanceSummary>(
        `/teachers/${id}/attendance-summary/?range=${encodeURIComponent(range)}`,
        token
      ),

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
      fetchAllPages<import("./types").Session>(`/sessions/`, token, params),

    listSessionsPage: (params?: Record<string, string | number | undefined | null>) =>
      fetchPage<import("./types").Session>(`/sessions/`, token, params),

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

    patchSession: (id: number, data: Partial<import("./types").SessionPayload>) =>
      request<import("./types").Session>(`/sessions/${id}/`, token, {
        method: "PATCH",
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
      fetchAllPages<import("./types").SessionAttendance>(`/session-attendances/`, token, params),

    listSessionAttendancesPage: (params?: Record<string, string | number | undefined | null>) =>
      fetchPage<import("./types").SessionAttendance>(`/session-attendances/`, token, params),

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
      fetchAllPages<import("./types").AdHocSession>(`/adhoc-sessions/`, token, params),

    listAdHocSessionsPage: (params?: Record<string, string | number | undefined | null>) =>
      fetchPage<import("./types").AdHocSession>(`/adhoc-sessions/`, token, params),

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
      fetchAllPages<import("./types").AdHocSessionAttendance>(`/adhoc-session-attendances/`, token, params),

    listAdHocSessionAttendancesPage: (params?: Record<string, string | number | undefined | null>) =>
      fetchPage<import("./types").AdHocSessionAttendance>(`/adhoc-session-attendances/`, token, params),

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
        sessions: import("./types").AttendanceMatrixSession[]
        students: import("./types").AttendanceMatrixStudent[]
        attendances: import("./types").SessionAttendance[]
      }>(`/attendance/matrix/${buildQueryString(params)}`, token),

    getAdHocAttendanceMatrix: (params?: Record<string, string | number | undefined | null>) =>
      request<{
        sessions: import("./types").AttendanceMatrixSession[]
        students: import("./types").AttendanceMatrixStudent[]
        attendances: import("./types").AdHocSessionAttendance[]
      }>(`/adhoc-attendance/matrix/${buildQueryString(params)}`, token),

    // --- Users ---
    listUsers: (params?: Record<string, string | number | undefined | null>) =>
      fetchAllPages<import("./types").User>(`/users/`, token, params),

    listUsersPage: (params?: Record<string, string | number | undefined | null>) =>
      fetchPage<import("./types").User>(`/users/`, token, params),

    getMe: () => request<import("./types").User>(`/me/`, token),

    getMyStudent: () => request<import("./types").Student>(`/me/student/`, token),

    getMyAttendanceSummary: (range: import("./types").StudentAnalyticsRange) =>
      request<import("./types").StudentAttendanceSummary>(
        `/me/attendance-summary/?range=${encodeURIComponent(range)}`,
        token
      ),

    updateUser: (
      id: number,
      data: Partial<Pick<import("./types").User, "role" | "is_active" | "email" | "username">>
    ) =>
      request<import("./types").User>(`/users/${id}/`, token, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    // --- Stats ---
    getStats: () =>
      request<import("./types").Stats>(`/stats/`, token),
  }
}
