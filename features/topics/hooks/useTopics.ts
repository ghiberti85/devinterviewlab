'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Topic, TopicPair } from '@/lib/supabase/types'

// Groups a flat list of topics (both languages) into ordered pairs.
// Each pair has the version in `language` (current) and the other language (other).
// Order is determined by the root topic's created_at so both language views
// always show the same sequence.
function groupIntoPairs(topics: Topic[], language: string): TopicPair[] {
  const map = new Map<string, TopicPair>()

  for (const topic of topics) {
    const rootId = topic.translated_from ?? topic.id

    if (!map.has(rootId)) {
      map.set(rootId, {
        rootId,
        rootCreatedAt: topic.created_at,
        current: null,
        other: null,
      })
    }

    const pair = map.get(rootId)!

    // Track the earliest created_at for stable ordering
    if (topic.created_at < pair.rootCreatedAt) {
      pair.rootCreatedAt = topic.created_at
    }

    if (topic.language === language) {
      pair.current = topic
    } else {
      pair.other = topic
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => a.rootCreatedAt.localeCompare(b.rootCreatedAt)
  )
}

export function useTopics(language: string) {
  return useQuery<TopicPair[]>({
    queryKey: ['topics', language],
    queryFn: async () => {
      const res = await fetch('/api/topics')
      if (!res.ok) throw new Error('Failed to fetch topics')
      const all: Topic[] = await res.json()
      return groupIntoPairs(all, language)
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
    // Invalidate topics + questions (quick_qa) + concepts (tags → graph)
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topics'] })
      qc.invalidateQueries({ queryKey: ['questions'] })
      qc.invalidateQueries({ queryKey: ['practice'] })
      qc.invalidateQueries({ queryKey: ['concepts'] })
    },
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
    // Refresh both views so the pair updates immediately
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topics'] })
    },
  })
}

export function useDeleteTopic() {
  const qc = useQueryClient()
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const res = await fetch(`/api/topics/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete topic')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topics'] }),
  })
}
