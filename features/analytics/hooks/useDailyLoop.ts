import { useQuery } from '@tanstack/react-query'
import type { DailyLoopData } from '@/lib/supabase/types'

export function useDailyLoop() {
  return useQuery<DailyLoopData>({
    queryKey: ['daily-loop'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/daily-loop')
      if (!res.ok) throw new Error('Failed to fetch daily loop')
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // re-fetch after 5 min
  })
}
