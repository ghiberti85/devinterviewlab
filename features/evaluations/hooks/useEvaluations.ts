'use client'

import { useQuery } from '@tanstack/react-query'
import type { AIEvaluation } from '@/lib/supabase/types'

interface EvaluationsPage {
  data: AIEvaluation[]
  total: number
  page: number
  limit: number
}

export function useEvaluations(page = 1) {
  return useQuery<EvaluationsPage>({
    queryKey: ['evaluations', page],
    queryFn: async () => {
      const res = await fetch(`/api/evaluations?page=${page}`)
      if (!res.ok) throw new Error('Failed to fetch evaluations')
      return res.json()
    },
    staleTime: 60_000,
  })
}
