'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CodingSession, CodeEvaluationFeedback } from '@/lib/supabase/types'

export function useCodingSessions() {
  return useQuery<CodingSession[]>({
    queryKey: ['coding-sessions'],
    queryFn: async () => {
      const res = await fetch('/api/coding')
      if (!res.ok) throw new Error('Failed to fetch sessions')
      return res.json()
    },
  })
}

export function useSubmitCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      problem_title: string
      problem_description?: string
      language: string
      code: string
      time_spent_sec: number
      timer_duration_sec: number
      ui_language?: string
    }) => {
      const res = await fetch('/api/coding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Evaluation failed')
      }
      return res.json() as Promise<{
        session: CodingSession
        evaluation: { score: number; feedback: CodeEvaluationFeedback }
      }>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coding-sessions'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}
