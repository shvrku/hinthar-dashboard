"use client"

import { useAuth } from "@clerk/nextjs"
import { useQuery } from "@tanstack/react-query"
import { createApi } from "@/lib/api"

/** Shared query keys — keep stable for cache hits across pages. */
export const apiQueryKeys = {
  me: (clerkUserId?: string | null) => ["me", clerkUserId ?? ""] as const,
  classes: (params?: string) => ["classes", params ?? ""] as const,
  subjects: (params?: string) => ["subjects", params ?? ""] as const,
  teachersSelect: ["teachers", "select"] as const,
  timetableSlots: (params?: string) => ["timetable-slots", params ?? ""] as const,
  stats: ["stats"] as const,
}

export function useApiToken() {
  const { getToken, isSignedIn, isLoaded } = useAuth()
  return { getToken, isSignedIn: !!isSignedIn, isLoaded }
}

export function useMeQuery(enabled = true, clerkUserId?: string | null) {
  const { getToken, isSignedIn, isLoaded } = useApiToken()
  return useQuery({
    queryKey: apiQueryKeys.me(clerkUserId),
    enabled: enabled && isLoaded && isSignedIn && !!clerkUserId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error("No session token")
      return createApi(token).getMe()
    },
  })
}

export function useClassesQuery(enabled = true) {
  const { getToken, isSignedIn, isLoaded } = useApiToken()
  return useQuery({
    queryKey: apiQueryKeys.classes(),
    enabled: enabled && isLoaded && isSignedIn,
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error("No session token")
      return createApi(token).listClasses()
    },
  })
}

export function useSubjectsQuery(enabled = true) {
  const { getToken, isSignedIn, isLoaded } = useApiToken()
  return useQuery({
    queryKey: apiQueryKeys.subjects(),
    enabled: enabled && isLoaded && isSignedIn,
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error("No session token")
      return createApi(token).listSubjects()
    },
  })
}

/** One page (up to 200) for dropdowns — avoids fetchAllPages walks. */
export function useTeachersSelectQuery(enabled = true) {
  const { getToken, isSignedIn, isLoaded } = useApiToken()
  return useQuery({
    queryKey: apiQueryKeys.teachersSelect,
    enabled: enabled && isLoaded && isSignedIn,
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error("No session token")
      return createApi(token).listTeachersForSelect()
    },
  })
}

export function useTimetableSlotsQuery(classId?: number | string | null, enabled = true) {
  const { getToken, isSignedIn, isLoaded } = useApiToken()
  const id = classId != null && classId !== "" ? String(classId) : ""
  return useQuery({
    queryKey: apiQueryKeys.timetableSlots(id),
    enabled: enabled && isLoaded && isSignedIn && Boolean(id),
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error("No session token")
      return createApi(token).listTimetableSlots({ class_id: id })
    },
  })
}

export function useStatsQuery(enabled = true) {
  const { getToken, isSignedIn, isLoaded } = useApiToken()
  return useQuery({
    queryKey: apiQueryKeys.stats,
    enabled: enabled && isLoaded && isSignedIn,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error("No session token")
      return createApi(token).getStats()
    },
  })
}
