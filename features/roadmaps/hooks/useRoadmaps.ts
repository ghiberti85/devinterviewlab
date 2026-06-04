'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { readNdjsonStream } from '@/lib/api/stream'
import type { StudyRoadmap, RoadmapTopicProgress } from '@/lib/supabase/types'

export function useRoadmaps() {
  return useQuery<StudyRoadmap[]>({
    queryKey: ['roadmaps'],
    queryFn: async () => {
      const res = await fetch('/api/roadmaps')
      if (!res.ok) throw new Error('Failed to load roadmaps')
      return res.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useRoadmap(id: string) {
  return useQuery<StudyRoadmap>({
    queryKey: ['roadmap', id],
    queryFn: async () => {
      const res = await fetch(`/api/roadmaps/${id}`)
      if (!res.ok) throw new Error('Roadmap not found')
      return res.json()
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateRoadmap() {
  const queryClient = useQueryClient()
  return useMutation<StudyRoadmap, Error, { job_description?: string; cv_text?: string; language?: string }>({
    mutationFn: async (body) => {
      const res = await fetch('/api/roadmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok && res.headers.get('content-type')?.includes('json')) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to create roadmap')
      }
      return readNdjsonStream<StudyRoadmap>(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] })
    },
  })
}

export function useDeleteRoadmap() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const res = await fetch(`/api/roadmaps/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to delete roadmap')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] })
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      queryClient.invalidateQueries({ queryKey: ['roadmap-questions'] })
    },
  })
}

export function useUpdateTopicProgress(roadmapId: string) {
  const queryClient = useQueryClient()
  return useMutation<RoadmapTopicProgress, Error, { topic_name: string; increment?: number }>({
    mutationFn: async (body) => {
      const res = await fetch(`/api/roadmaps/${roadmapId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to update progress')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] })
      queryClient.invalidateQueries({ queryKey: ['roadmap', roadmapId] })
    },
  })
}
