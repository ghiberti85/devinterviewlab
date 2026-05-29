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

export function useGenerateRoadmapQuestions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (roadmapId: string) => {
      const res = await fetch(`/api/roadmaps/${roadmapId}/generate-questions`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to generate questions')
      return res.json() as Promise<{ count: number }>
    },
    onSuccess: (_, roadmapId) => {
      qc.invalidateQueries({ queryKey: ['roadmap-questions', roadmapId] })
    },
  })
}
