"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { sysLog } from "@/lib/sys-log"

function formatQueryKey(queryKey: readonly unknown[]): string {
  return queryKey
    .map((part) => (typeof part === "string" || typeof part === "number" ? String(part) : JSON.stringify(part)))
    .join(" / ")
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cut remount refetches while navigating the dashboard.
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  })
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(makeQueryClient)

  React.useEffect(() => {
    const unsubQuery = client.getQueryCache().subscribe((event) => {
      if (event.type !== "updated") return
      const key = formatQueryKey(event.query.queryKey)
      if (event.action.type === "fetch") {
        const isRefetch = event.query.state.data !== undefined
        sysLog.add({
          level: isRefetch ? "QUERY" : "LOAD",
          title: isRefetch ? `bg-refetch: ${key}` : `query-load: ${key}`,
        })
      } else if (event.action.type === "invalidate") {
        sysLog.add({
          level: "QUERY",
          title: `invalidate: ${key}`,
        })
      } else if (event.action.type === "error") {
        const msg =
          event.action.error instanceof Error ? event.action.error.message : "Query error"
        sysLog.add({
          level: "ERR",
          title: `query-err: ${key}`,
          detail: msg,
        })
      }
    })

    const unsubMutation = client.getMutationCache().subscribe((event) => {
      if (event.type !== "updated") return
      const key = event.mutation.options.mutationKey
        ? formatQueryKey(event.mutation.options.mutationKey)
        : "mutation"
      if (event.action.type === "pending") {
        sysLog.add({
          level: "QUERY",
          title: `mutating: ${key}`,
        })
      } else if (event.action.type === "error") {
        const msg =
          event.action.error instanceof Error ? event.action.error.message : "Mutation error"
        sysLog.add({
          level: "ERR",
          title: `mutation-err: ${key}`,
          detail: msg,
        })
      }
    })

    return () => {
      unsubQuery()
      unsubMutation()
    }
  }, [client])

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
