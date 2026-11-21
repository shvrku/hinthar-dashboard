"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { useQueryClient } from "@tanstack/react-query"
import type { User } from "@/lib/types"
import type { Role } from "@/lib/roles"
import { apiQueryKeys, useMeQuery } from "@/hooks/use-api-queries"
import { sysLog } from "@/lib/sys-log"

type CurrentUserContextValue = {
  user: User | null
  role: Role | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const ME_LOADING_TIMEOUT_MS = 8000
const ME_TIMEOUT_MESSAGE =
  "Timed out after 8 seconds while loading your account profile (/api/v1/me/). Verify the backend server is reachable and CORS allows localhost:3001."

const CurrentUserContext = React.createContext<CurrentUserContextValue | null>(null)

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const { userId, isSignedIn, isLoaded } = useAuth()
  const queryClient = useQueryClient()
  const meQuery = useMeQuery(isLoaded && !!isSignedIn, userId)
  const [timedOut, setTimedOut] = React.useState(false)

  const prevUserIdRef = React.useRef<string | null | undefined>(undefined)
  const loggedClerkRef = React.useRef(false)
  const loggedRoleRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!isLoaded || loggedClerkRef.current) return
    loggedClerkRef.current = true
    sysLog.add({
      level: "AUTH",
      title: isSignedIn ? "Clerk session verified" : "Clerk loaded (signed out)",
      detail: userId ? `uid: ${userId}` : undefined,
    })
  }, [isLoaded, isSignedIn, userId])

  React.useEffect(() => {
    const role = meQuery.data?.role
    if (!role || loggedRoleRef.current === role) return
    loggedRoleRef.current = role
    sysLog.add({
      level: "AUTH",
      title: `Profile resolved (${role})`,
      detail: meQuery.data?.email || undefined,
    })
  }, [meQuery.data])

  // Clerk identity changed (sign-in, sign-out, account switch) — drop stale API cache.
  React.useEffect(() => {
    if (!isLoaded) return
    const nextUserId = userId ?? null
    const prevUserId = prevUserIdRef.current
    if (prevUserId !== undefined && prevUserId !== nextUserId) {
      queryClient.clear()
    }
    prevUserIdRef.current = nextUserId
  }, [userId, isLoaded, queryClient])

  const rawAccountLoading =
    !isLoaded || (isSignedIn && (!userId || meQuery.isPending))

  React.useEffect(() => {
    if (!rawAccountLoading || meQuery.data || meQuery.error) {
      return
    }
    const timer = window.setTimeout(() => {
      setTimedOut(true)
    }, ME_LOADING_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [rawAccountLoading, meQuery.data, meQuery.error])

  const refresh = React.useCallback(async () => {
    setTimedOut(false)
    if (!isSignedIn || !userId) {
      queryClient.removeQueries({ queryKey: apiQueryKeys.me(userId) })
      return
    }
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.me(userId) })
    await queryClient.refetchQueries({ queryKey: apiQueryKeys.me(userId) })
  }, [isSignedIn, userId, queryClient])

  const hasTimedOut = timedOut && rawAccountLoading && !meQuery.data && !meQuery.error
  const accountLoading = rawAccountLoading && !hasTimedOut
  const errorMessage = meQuery.error
    ? meQuery.error instanceof Error
      ? meQuery.error.message
      : "Failed to load profile"
    : hasTimedOut
      ? ME_TIMEOUT_MESSAGE
      : null

  const value = React.useMemo(
    () => ({
      user: meQuery.data ?? null,
      role: (meQuery.data?.role as Role | undefined) ?? null,
      loading: accountLoading,
      error: errorMessage,
      refresh,
    }),
    [meQuery.data, accountLoading, errorMessage, refresh]
  )

  return (
    <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
  )
}

export function useCurrentUser() {
  const ctx = React.useContext(CurrentUserContext)
  if (!ctx) {
    throw new Error("useCurrentUser must be used within CurrentUserProvider")
  }
  return ctx
}
