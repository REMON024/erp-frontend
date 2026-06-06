import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,                  // always refetch on mount
      gcTime:    1000 * 60 * 5,     // keep unused cache for 5 min
      retry: 1,
      refetchOnWindowFocus: true,   // refresh when user returns to tab
      refetchOnMount: true,
    },
    mutations: {
      retry: 0,
    },
  },
})
