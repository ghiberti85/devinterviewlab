import { useQuery } from '@tanstack/react-query'
import type { AnalyticsData } from '@/lib/supabase/types'

export function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await fetch('/api/analytics')
      if (!res.ok) throw new Error('Failed to fetch analytics')
      return res.json() as Promise<AnalyticsData>
    },
    staleTime: 5 * 60 * 1000,
  })
}
