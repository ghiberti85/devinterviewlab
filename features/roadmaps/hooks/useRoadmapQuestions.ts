'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { RoadmapQuestion } from '@/lib/supabase/types'

export function useRoadmapQuestions(roadmapId: string | null) {
  return useQuery({
    queryKey: ['roadmap-questions', roadmapId],
    queryFn: async () => {
      if (!roadmapId) return []
      const res = await fetch(`/api/roadmaps/${roadmapId}/generate-questions`)
      if (!res.ok) throw new Error('Failed to fetch questions')
      return res.json() as Promise<RoadmapQuestion[]>
    },
    enabled: !!roadmapId,
  })
}

export function useDeleteRoadmapQuestion(roadmapId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (questionId: string) => {
      const res = await fetch(`/api/roadmaps/${roadmapId}/questions/${questionId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete question')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap-questions', roadmapId] }),
  })
}

export function useClearRoadmapQuestions(roadmapId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/roadmaps/${roadmapId}/generate-questions`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to clear questions')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap-questions', roadmapId] }),
  })
}

export function useBulkDeleteRoadmapQuestions(roadmapId: string) {
  const qc = useQueryClient()
  return useMutation<{ deleted: number }, Error, { ids: string[] }>({
    mutationFn: async ({ ids }) => {
      const res = await fetch(`/api/roadmaps/${roadmapId}/questions/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error('Failed to bulk delete questions')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap-questions', roadmapId] }),
  })
}

// Generates questions for one topic in both EN and PT.
// Server handles language and dedup — client only needs topicName + phaseName.
export function useGenerateTopicQuestions(roadmapId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { topicName: string; phaseName: string; questionType?: 'theoretical' | 'live_coding' }) => {
      const res = await fetch(`/api/roadmaps/${roadmapId}/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to generate questions')
      return res.json() as Promise<{ count: number }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap-questions', roadmapId] }),
  })
}
