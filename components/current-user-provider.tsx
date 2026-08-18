"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { useQueryClient } from "@tanstack/react-query"
import type { User } from "@/lib/types"
import type { Role } from "@/lib/roles"
import { apiQueryKeys, useMeQuery } from "@/hooks/use-api-queries"

type CurrentUserContextValue = {
  user: User | null
  role: Role | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const CurrentUserContext = React.createContext<CurrentUserContextValue | null>(null)

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const { userId, isSignedIn, isLoaded } = useAuth()
  const queryClient = useQueryClient()
  const meQuery = useMeQuery(isLoaded && !!isSignedIn, userId)

  const prevUserIdRef = React.useRef<string | null | undefined>(undefined)

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

  const refresh = React.useCallback(async () => {
    if (!isSignedIn || !userId) {
      queryClient.removeQueries({ queryKey: apiQueryKeys.me(userId) })
      return
    }
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.me(userId) })
  }, [isSignedIn, userId, queryClient])

  const accountLoading =
    !isLoaded || (isSignedIn && (!userId || meQuery.isPending))

  const value = React.useMemo(
    () => ({
      user: meQuery.data ?? null,
      role: (meQuery.data?.role as Role | undefined) ?? null,
      loading: accountLoading,
      error: meQuery.error
        ? meQuery.error instanceof Error
          ? meQuery.error.message
          : "Failed to load profile"
        : null,
      refresh,
    }),
    [meQuery.data, meQuery.isPending, meQuery.error, accountLoading, refresh]
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
