import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AIEvaluation } from '@/lib/supabase/types'
import { readNdjsonStream } from '@/lib/api/stream'

export function useSubmitInterview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      question_id: string
      user_answer: string
      language?: string
    }) => {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'AI evaluation failed')
      }
      return readNdjsonStream<AIEvaluation>(res)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analytics'] })
      qc.invalidateQueries({ queryKey: ['evaluations'] })
    },
  })
}
