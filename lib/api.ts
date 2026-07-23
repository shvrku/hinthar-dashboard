export class ApiError extends Error {
  constructor(public status: number, public userMessage: string) {
    super(userMessage)
    this.name = "ApiError"
  }
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_ORIGIN ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"
).replace(/\/+$/, "") + "/api/v1"

function buildQueryString(params?: Record<string, string | number | undefined | null>): string {
  if (!params) return ""
  const query = new URLSearchParams()
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "" && val !== "all") {
      query.append(key, String(val))
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
            // Concatenate field validation errors
            const msgs: string[] = []
            for (const [key, val] of Object.entries(json)) {
              const strVal = Array.isArray(val) ? val.join(", ") : String(val)
              msgs.push(`${key}: ${strVal}`)
            }
            if (msgs.length > 0) {
              detail = msgs.join("; ")
            }
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
    let combinedResults = [...(data as { results: unknown[] }).results]
    let nextUrl = (data as { next?: string | null }).next

    // Automatically follow pagination `next` links to retrieve all items matching the query
    while (nextUrl) {
      try {
        let nextPath: string
        if (nextUrl.startsWith("http://") || nextUrl.startsWith("https://")) {
          const parsedUrl = new URL(nextUrl)
          nextPath = parsedUrl.pathname.replace(/^\/api\/v1/, "") + parsedUrl.search
        } else {
          nextPath = nextUrl.startsWith("/") ? nextUrl.replace(/^\/api\/v1/, "") : `/${nextUrl}`
        }

        const nextRes = await fetch(`${API_BASE}${nextPath}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...options.headers,
          },
        })
        if (!nextRes.ok) break
        const nextData = await nextRes.json()
        if (nextData && Array.isArray(nextData.results)) {
          combinedResults = combinedResults.concat(nextData.results)
          nextUrl = nextData.next
        } else {
          break
        }
      } catch {
        break
      }
    }
    return combinedResults as unknown as T
  }
  return data as T
}

export function createApi(token: string) {
  return {
    // --- Classes ---
    listClasses: (params?: Record<string, string | number | undefined | null>) =>
      request<import("./types").Class[]>(`/classes/${buildQueryString(params)}`, token),

    getClass: (id: number) =>
      request<import("./types").Class>(`/classes/${id}/`, token),

    createClass: (data: import("./types").ClassPayload) =>
      request<import("./types").Class>(`/classes/`, token, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateClass: (id: number, data: import("./types").ClassPayload) =>
      request<import("./types").Class>(`/classes/${id}/`, token, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    deleteClass: (id: number) =>
      request<void>(`/classes/${id}/`, token, { method: "DELETE" }),

    bulkDeleteClasses: (ids: number[]) =>
      request<{ deleted_count: number; deleted_ids: number[] }>(`/classes/bulk_delete/`, token, {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }),

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
    listSubjects: (params?: Record<string, string | number | undefined | null>) =>
      request<import("./types").Subject[]>(`/subjects/${buildQueryString(params)}`, token),

    getSubject: (id: number) =>
      request<import("./types").Subject>(`/subjects/${id}/`, token),

    createSubject: (data: import("./types").SubjectPayload) =>
      request<import("./types").Subject>(`/subjects/`, token, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateSubject: (id: number, data: import("./types").SubjectPayload) =>
      request<import("./types").Subject>(`/subjects/${id}/`, token, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    deleteSubject: (id: number) =>
      request<void>(`/subjects/${id}/`, token, { method: "DELETE" }),

    bulkDeleteSubjects: (ids: number[]) =>
      request<{ deleted_count: number; deleted_ids: number[] }>(`/subjects/bulk_delete/`, token, {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }),

    // --- Timetable Slots ---
    listTimetableSlots: (params?: Record<string, string | number | undefined | null>) =>
      request<import("./types").TimetableSlot[]>(`/timetable-slots/${buildQueryString(params)}`, token),

    getTimetableSlot: (id: number) =>
      request<import("./types").TimetableSlot>(`/timetable-slots/${id}/`, token),

    createTimetableSlot: (data: import("./types").TimetableSlotPayload) =>
      request<import("./types").TimetableSlot>(`/timetable-slots/`, token, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateTimetableSlot: (id: number, data: import("./types").TimetableSlotPayload) =>
      request<import("./types").TimetableSlot>(`/timetable-slots/${id}/`, token, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    deleteTimetableSlot: (id: number) =>
      request<void>(`/timetable-slots/${id}/`, token, { method: "DELETE" }),

    // --- Teachers ---
    listTeachers: (params?: Record<string, string | number | undefined | null>) =>
      request<import("./types").Teacher[]>(`/teachers/${buildQueryString(params)}`, token),

    getTeacher: (id: number) =>
      request<import("./types").Teacher>(`/teachers/${id}/`, token),

    createTeacher: (data: import("./types").TeacherPayload) =>
      request<import("./types").Teacher>(`/teachers/`, token, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateTeacher: (id: number, data: import("./types").TeacherPayload) =>
      request<import("./types").Teacher>(`/teachers/${id}/`, token, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    deleteTeacher: (id: number) =>
      request<void>(`/teachers/${id}/`, token, { method: "DELETE" }),

    bulkDeleteTeachers: (ids: number[]) =>
      request<{ deleted_count: number; deleted_ids: number[] }>(`/teachers/bulk_delete/`, token, {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }),

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
      request<{ created_count: number; sessions: import("./types").Session[] }>(
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

    // --- Users ---
    listUsers: (params?: Record<string, string | number | undefined | null>) =>
      request<import("./types").User[]>(`/users/${buildQueryString(params)}`, token),

    // --- Dashboard Stats ---
    getStats: () =>
      request<import("./types").Stats>(`/dashboard/stats/`, token),
  }
}
