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
  const { isSignedIn, isLoaded } = useAuth()
  const queryClient = useQueryClient()
  const meQuery = useMeQuery(isLoaded && !!isSignedIn)

  const refresh = React.useCallback(async () => {
    if (!isSignedIn) {
      queryClient.removeQueries({ queryKey: apiQueryKeys.me })
      return
    }
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.me })
  }, [isSignedIn, queryClient])

  const value = React.useMemo(
    () => ({
      user: meQuery.data ?? null,
      role: (meQuery.data?.role as Role | undefined) ?? null,
      loading: !isLoaded || (!!isSignedIn && meQuery.isLoading),
      error: meQuery.error
        ? meQuery.error instanceof Error
          ? meQuery.error.message
          : "Failed to load profile"
        : null,
      refresh,
    }),
    [meQuery.data, meQuery.isLoading, meQuery.error, refresh, isLoaded, isSignedIn]
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
