const API_BASE = "/api/v1"

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.name = "ApiError"
    this.status = status
    this.detail = detail
  }

  get userMessage(): string {
    const lowerDetail = (this.detail || "").toLowerCase()
    const isConflict =
      this.status === 409 ||
      (this.status === 400 &&
        (lowerDetail.includes("conflict") ||
          lowerDetail.includes("unique set") ||
          lowerDetail.includes("already") ||
          lowerDetail.includes("overlap") ||
          lowerDetail.includes("teacher") ||
          lowerDetail.includes("timetable") ||
          lowerDetail.includes("slot")))

    if (isConflict) {
      return `There's a timetable conflict: ${this.detail}`
    }

    if (this.status === 400) return `[400] ${this.detail || "Validation error — please check the submitted details."}`
    if (this.status === 401) return "[401] Your session has expired. Please sign in again."
    if (this.status === 403) return "[403] You don't have permission to perform this action."
    if (this.status === 404) return "[404] The requested resource was not found."
    if (this.status === 0) return this.detail || "[Network] Unable to connect to the server."
    if (this.status >= 500) return "[500] The server encountered an error. Please try again later."
    return `[${this.status}] ${this.detail || "An unexpected error occurred."}`
  }
}

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  // Use a variable to track the URL as we paginate
  let currentUrl = `${API_BASE}${path}`
  let accumulatedResults: any[] = []

  while (currentUrl) {
    let res: Response
    try {
      res = await fetch(currentUrl, {
        ...options,
        headers: {
          'Authorization': `Bearer mock_token_admin1`,
          'Content-Type': 'application/json'
        },
      })
    } catch (err) {
      // Network-level failures: CORS blocking, DNS failure, unreachable server, etc.
      const rawMsg = err instanceof Error ? err.message : String(err)
      const message = `Unable to fetch ${currentUrl} (${rawMsg}). (Check CORS headers on backend for your Vercel domain).`
      throw new ApiError(0, message)
    }

    if (!res.ok) {
      const raw = await res.text().catch(() => "")
      let detail = res.statusText
      if (raw) {
        try {
          const body = JSON.parse(raw)
          if (typeof body === "string") {
            detail = body
          } else if (typeof body === "object" && body !== null) {
            if ("detail" in body && typeof body.detail === "string") {
              detail = body.detail
            } else if ("message" in body && typeof body.message === "string") {
              detail = body.message
            } else if ("error" in body && typeof body.error === "string") {
              detail = body.error
            } else {
              // Join field errors from DRF dict / non_field_errors
              const messages: string[] = []
              for (const [, v] of Object.entries(body)) {
                if (Array.isArray(v)) {
                  messages.push(v.join("; "))
                } else if (typeof v === "string") {
                  messages.push(v)
                }
              }
              if (messages.length > 0) {
                detail = messages.join(" | ")
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

    // If the response is paginated, accumulate the results and fetch the next page
    if (
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      "results" in data &&
      Array.isArray((data as any).results)
    ) {
      accumulatedResults = [...accumulatedResults, ...(data as any).results]

      // Check if the backend provided a link to the next page
      if ((data as any).next) {
        // Extract just the query string (e.g. "?page=2") to keep using your relative API_BASE
        const nextUrlString = (data as any).next as string
        const searchIndex = nextUrlString.indexOf("?")
        const queryString = searchIndex !== -1 ? nextUrlString.substring(searchIndex) : ""
        currentUrl = `${API_BASE}${path}${queryString}`
      } else {
        // No more pages, exit loop
        break
      }
    } else {
      // If it's a single object (e.g. getStudent) return it immediately
      return data as T
    }
  }

  // Return the fully accumulated list
  return accumulatedResults as T
}
export function createApi(token: string) {
  return {
    // --- Classes ---
    listClasses: () =>
      request<import("./types").Class[]>(`/classes/`, token),

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

    // --- Students ---
    listStudents: () =>
      request<import("./types").Student[]>(`/students/`, token),

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

    getCheckInToken: (id: number) =>
      request<import("./types").Student>(`/students/${id}/check_in_token/`, token),

    regenerateCheckInToken: (id: number) =>
      request<import("./types").Student>(`/students/${id}/regenerate_check_in_token/`, token, {
        method: "POST",
      }),

    // --- Check-Ins ---
    listCheckIns: () =>
      request<import("./types").CheckIn[]>(`/check-ins/`, token),

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
    listClassStudents: () =>
      request<import("./types").ClassStudent[]>(`/class-students/`, token),

    createClassStudent: (classObjId: number, studentId: number) =>
      request<import("./types").ClassStudent>(`/class-students/`, token, {
        method: "POST",
        body: JSON.stringify({ class_obj_id: classObjId, student_id: studentId }),
      }),

    deleteClassStudent: (id: number) =>
      request<void>(`/class-students/${id}/`, token, { method: "DELETE" }),

    // --- Subjects ---
    listSubjects: () =>
      request<import("./types").Subject[]>(`/subjects/`, token),

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

    // --- Timetable Slots ---
    listTimetableSlots: () =>
      request<import("./types").TimetableSlot[]>(`/timetable-slots/`, token),

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
    listTeachers: () =>
      request<import("./types").Teacher[]>(`/teachers/`, token),

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

    // --- Sessions ---
    listSessions: () =>
      request<import("./types").Session[]>(`/sessions/`, token),

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

    // --- Session Attendances ---
    listSessionAttendances: () =>
      request<import("./types").SessionAttendance[]>(`/session-attendances/`, token),

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

    // --- Ad-Hoc Sessions ---
    listAdHocSessions: () =>
      request<import("./types").AdHocSession[]>(`/adhoc-sessions/`, token),

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

    // --- Ad-Hoc Session Attendances ---
    listAdHocSessionAttendances: () =>
      request<import("./types").AdHocSessionAttendance[]>(`/adhoc-session-attendances/`, token),

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

    // --- Stats ---
    getStats: () =>
      request<import("./types").Stats>(`/stats/`, token),
  }
}

export type Api = ReturnType<typeof createApi>
