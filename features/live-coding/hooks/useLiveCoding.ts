'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CodingSession, CodeEvaluationFeedback } from '@/lib/supabase/types'
export type { CodingSession, CodeEvaluationFeedback }

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

export function useRequestHint() {
  return useMutation({
    mutationFn: async (body: {
      problem_title: string
      problem_description?: string
      code: string
      language: string
      ui_language?: string
    }): Promise<{ hint: string }> => {
      const res = await fetch('/api/coding/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Hint request failed')
      }
      return res.json()
    },
  })
}

export type ProblemDifficulty = 'easy' | 'medium' | 'hard'

export function useGenerateProblem() {
  return useMutation({
    mutationFn: async (body: {
      difficulty: ProblemDifficulty
      topic?: string
      coding_language?: string
      ui_language?: string
    }): Promise<{ title: string; description: string }> => {
      const res = await fetch('/api/coding/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Problem generation failed')
      }
      return res.json()
    },
  })
}

export function useSaveProblem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      problem_title: string
      problem_description?: string
      language?: string
    }): Promise<CodingSession> => {
      const res = await fetch('/api/coding/save-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Save problem failed')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coding-sessions'] })
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
      hints_requested: number
      hints_shown: number
      idle_pauses: number
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
