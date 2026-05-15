'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ScoreCard } from '@/lib/supabase/types'

export function useScoreCards() {
  return useQuery<ScoreCard[]>({
    queryKey: ['score-cards'],
    queryFn: async () => {
      const res = await fetch('/api/score-cards')
      if (!res.ok) throw new Error('Failed to fetch score cards')
      return res.json()
    },
    staleTime: 60_000,
  })
}

export function useCreateScoreCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      evaluation_ids: string[]
      session_label?: string
      language?: string
    }): Promise<ScoreCard> => {
      const res = await fetch('/api/score-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to create score card')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['score-cards'] })
    },
  })
}

export function useDeleteScoreCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/score-cards/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to delete score card')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['score-cards'] })
    },
  })
}
