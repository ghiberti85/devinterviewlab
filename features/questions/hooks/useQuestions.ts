import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Question, Difficulty, AIEvaluation } from '@/lib/supabase/types'

interface QuestionFilters {
  category?: string
  difficulty?: Difficulty
  search?: string
  language?: string
  page?: number
}

export function useQuestions(filters: QuestionFilters = {}) {
  const params = new URLSearchParams()
  if (filters.category)  params.set('category', filters.category)
  if (filters.difficulty) params.set('difficulty', filters.difficulty)
  if (filters.search)    params.set('search', filters.search)
  if (filters.language)  params.set('language', filters.language)
  if (filters.page)      params.set('page', String(filters.page))

  return useQuery({
    queryKey: ['questions', filters],
    queryFn: async () => {
      const res = await fetch(`/api/questions?${params}`)
      if (!res.ok) throw new Error('Failed to fetch questions')
      return res.json() as Promise<{ data: Question[]; total: number; page: number }>
    },
  })
}

export function useQuestion(id: string) {
  return useQuery({
    queryKey: ['questions', id],
    queryFn: async () => {
      const res = await fetch(`/api/questions/${id}`)
      if (!res.ok) throw new Error('Not found')
      return res.json() as Promise<Question>
    },
    enabled: !!id,
  })
}

export function useQuestionEvaluations(questionId: string) {
  return useQuery({
    queryKey: ['evaluations', questionId],
    queryFn: async () => {
      const res = await fetch(`/api/questions/${questionId}/evaluations`)
      if (!res.ok) throw new Error('Failed to fetch evaluations')
      return res.json() as Promise<AIEvaluation[]>
    },
    enabled: !!questionId,
  })
}

export function useCreateQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<Question> & { tag_ids?: string[]; concept_ids?: string[] }) => {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to create')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  })
}

export function useUpdateQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Question> & { id: string; tag_ids?: string[]; concept_ids?: string[] }) => {
      const res = await fetch(`/api/questions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  })
}

export function useDeleteQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/questions/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  })
}

export function useBulkDeleteQuestions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => fetch(`/api/questions/${id}`, { method: 'DELETE' })))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  })
}
