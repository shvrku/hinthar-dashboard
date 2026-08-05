"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { createApi } from "@/lib/api"
import type { User } from "@/lib/types"
import type { Role } from "@/lib/roles"

type CurrentUserContextValue = {
  user: User | null
  role: Role | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const CurrentUserContext = React.createContext<CurrentUserContextValue | null>(null)

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!isSignedIn) {
      setUser(null)
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) {
        setUser(null)
        setError("No session token")
        return
      }
      const api = createApi(token)
      const me = await api.getMe()
      setUser(me)
    } catch (err) {
      setUser(null)
      setError(err instanceof Error ? err.message : "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }, [isSignedIn, getToken])

  React.useEffect(() => {
    if (!isLoaded) return
    void refresh()
  }, [isLoaded, refresh])

  const value = React.useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      loading: !isLoaded || loading,
      error,
      refresh,
    }),
    [user, loading, error, refresh, isLoaded]
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
