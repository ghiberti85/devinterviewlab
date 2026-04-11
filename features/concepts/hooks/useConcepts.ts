import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Concept, ConceptRelation, RelationType } from '@/lib/supabase/types'

export function useConcepts() {
  return useQuery({
    queryKey: ['concepts'],
    queryFn: async () => {
      const res = await fetch('/api/concepts')
      if (!res.ok) throw new Error('Failed to fetch concepts')
      return res.json() as Promise<{ nodes: Concept[]; edges: ConceptRelation[] }>
    },
  })
}

export function useCreateConcept() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; description?: string }) => {
      const res = await fetch('/api/concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to create concept')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['concepts'] }),
  })
}

export function useCreateRelation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { source_id: string; target_id: string; relation_type: RelationType }) => {
      const res = await fetch('/api/concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to create relation')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['concepts'] }),
  })
}

export function useDeleteConcept() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/concepts/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['concepts'] }),
  })
}
