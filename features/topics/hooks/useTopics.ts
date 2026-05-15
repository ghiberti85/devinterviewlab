'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Topic } from '@/lib/supabase/types'

export function useTopics() {
  return useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: async () => {
      const res = await fetch('/api/topics')
      if (!res.ok) throw new Error('Failed to fetch topics')
      return res.json()
    },
  })
}

export function useGenerateTopic() {
  const qc = useQueryClient()
  return useMutation<Topic, Error, { topicName: string; difficulty: string; language: string; categoryId?: string }>({
    mutationFn: async (payload) => {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to generate topic')
      }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topics'] }),
  })
}

export function useDeleteTopic() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/topics/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete topic')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topics'] }),
  })
}
