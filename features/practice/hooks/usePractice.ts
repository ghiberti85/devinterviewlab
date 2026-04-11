import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Question, SessionType } from '@/lib/supabase/types'

export function usePracticeQuestions(mode: 'random' | 'spaced' = 'random', categoryId?: string) {
  const params = new URLSearchParams({ mode })
  if (categoryId) params.set('category_id', categoryId)

  return useQuery({
    queryKey: ['practice', mode, categoryId],
    queryFn: async () => {
      const res = await fetch(`/api/practice?${params}`)
      if (!res.ok) throw new Error('Failed to fetch practice questions')
      return res.json() as Promise<Question[]>
    },
  })
}

export function useSubmitSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      question_id: string
      session_type: SessionType
      confidence: number
      duration_sec: number
    }) => {
      const res = await fetch('/api/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to submit session')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analytics'] })
      qc.invalidateQueries({ queryKey: ['practice'] })
    },
  })
}
