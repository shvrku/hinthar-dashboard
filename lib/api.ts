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
    const detailText = this.detail ? `: ${this.detail}` : ""

    if (this.status === 401) {
      return this.detail
        ? `[401] Unauthorized${detailText}`
        : "[401] Your session has expired. Please sign in again."
    }
    if (this.status === 403) {
      return this.detail
        ? `[403] Permission Denied${detailText}`
        : "[403] You don't have permission to perform this action."
    }
    if (this.status === 404) {
      return this.detail
        ? `[404] Not Found${detailText}`
        : "[404] The requested resource was not found."
    }
    if (this.status === 409) {
      return `[409] ${this.detail || "Conflict — the student may already be checked in today."}`
    }
    if (this.status === 502) {
      return `[502] ${this.detail || "Failed to reach the API server. It may be down or restarting."}`
    }
    if (this.status === 0) {
      return this.detail || "[Network] Unable to connect to the server."
    }
    if (this.status >= 500) {
      return this.detail
        ? `[${this.status}] Server Error${detailText}`
        : `[${this.status}] The server encountered an error. Please try again later.`
    }
    return `[${this.status}] ${this.detail || "An unexpected error occurred."}`
  }
}

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
  } catch (err) {
    // Network-level failures: CORS, DNS, unreachable server, etc.
    const message =
      err instanceof TypeError
        ? "Failed to reach the server. Please check your internet connection and try again."
        : err instanceof Error
          ? err.message
          : "An unexpected network error occurred."
    throw new ApiError(0, message)
  }

  if (!res.ok) {
    const raw = await res.text().catch(() => "")
    let detail = res.statusText
    if (raw) {
      try {
        const body = JSON.parse(raw)
        // Try common response formats
        if (typeof body === "string") {
          detail = body
        } else {
          detail =
            (body as { detail?: string }).detail ??
            (body as { message?: string }).message ??
            (body as { error?: string }).error ??
            (body as { non_field_errors?: string[] }).non_field_errors?.join("; ") ??
            detail
        }
      } catch {
        detail = raw // use raw text if not JSON
      }
    }
    throw new ApiError(res.status, detail)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
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

    createClassStudent: (classId: number, studentId: number) =>
      request<import("./types").ClassStudent>(`/class-students/`, token, {
        method: "POST",
        body: JSON.stringify({ class_obj_id: classId, student_id: studentId }),
      }),

    deleteClassStudent: (id: number) =>
      request<void>(`/class-students/${id}/`, token, { method: "DELETE" }),

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

    // --- Users ---
    listUsers: () =>
      request<import("./types").User[]>(`/users/`, token),

    getUser: (id: number) =>
      request<import("./types").User>(`/users/${id}/`, token),

    // --- Stats ---
    getStats: () =>
      request<import("./types").Stats>(`/stats/`, token),

    // --- Me ---
    getMe: () =>
      request<import("./types").User>(`/me/`, token),
  }
}

export type Api = ReturnType<typeof createApi>
