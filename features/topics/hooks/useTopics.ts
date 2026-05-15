'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Topic } from '@/lib/supabase/types'

export function useTopics(language: string) {
  return useQuery<Topic[]>({
    queryKey: ['topics', language],
    queryFn: async () => {
      const res = await fetch(`/api/topics?language=${language}`)
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
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['topics', data.language] }),
  })
}

export function useTranslateTopic() {
  const qc = useQueryClient()
  return useMutation<Topic, Error, { id: string; currentLanguage: string }>({
    mutationFn: async ({ id }) => {
      const res = await fetch(`/api/topics/${id}/translate`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to translate topic')
      }
      return res.json()
    },
    onSuccess: (data, { currentLanguage }) => {
      const targetLang = currentLanguage === 'en' ? 'pt' : 'en'
      // Refresh target language list so the translation appears there
      qc.invalidateQueries({ queryKey: ['topics', targetLang] })
      // Refresh current list to update has_translation flag
      qc.invalidateQueries({ queryKey: ['topics', currentLanguage] })
    },
  })
}

export function useDeleteTopic() {
  const qc = useQueryClient()
  return useMutation<void, Error, { id: string; language: string }>({
    mutationFn: async ({ id }) => {
      const res = await fetch(`/api/topics/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete topic')
    },
    onSuccess: (_, { language }) => qc.invalidateQueries({ queryKey: ['topics', language] }),
  })
}
