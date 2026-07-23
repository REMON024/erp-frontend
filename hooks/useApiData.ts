import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface Options<T> {
  url: string
  params?: Record<string, unknown>
  // Override the query key; defaults to [url, params]
  queryKey?: unknown[]
  enabled?: boolean
  select?: (data: T) => T
}

export function useApiData<T>({ url, params, queryKey, enabled, select }: Options<T>) {
  return useQuery<T>({
    queryKey: queryKey ?? [url, params],
    queryFn: async () => {
      const res = await api.get<T>(url, { params })
      // Many endpoints return { data: [] }; unwrap transparently
      return (res.data as any)?.data ?? res.data
    },
    enabled,
    select,
  })
}
