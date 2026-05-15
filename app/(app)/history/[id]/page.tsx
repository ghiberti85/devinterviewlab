'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { AIFeedbackPanel } from '@/features/interview/components/AIFeedbackPanel'
import { useT } from '@/lib/i18n/useT'
import type { AIEvaluation } from '@/lib/supabase/types'
import { ArrowLeft, Mic, FileText } from 'lucide-react'

function useEvaluation(id: string) {
  return useQuery<AIEvaluation>({
    queryKey: ['evaluation', id],
    queryFn: async () => {
      const res = await fetch(`/api/evaluations/${id}`)
      if (!res.ok) throw new Error('Not found')
      return res.json()
    },
    staleTime: 5 * 60_000,
  })
}

export default function ReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useT()
  const h = t.evaluationHistory
  const { data: ev, isLoading, isError } = useEvaluation(id)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 rounded bg-muted animate-pulse" />
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    )
  }

  if (isError || !ev) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-muted-foreground">{t.common.error}</p>
        <Link href="/history" className="text-sm text-primary hover:underline">
          {h.backToHistory}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/history"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> {h.backToHistory}
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold">{h.replayTitle}</h1>
        {ev.questions?.title && (
          <p className="text-muted-foreground mt-1 text-sm">{ev.questions.title}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {h.answeredOn} {new Date(ev.created_at).toLocaleString('pt-BR')}
        </p>
      </div>

      {/* Answer panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Typed / final answer */}
        <div className="border rounded-xl p-5 bg-card space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <FileText size={14} className="text-blue-500" />
            {h.yourAnswer}
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {ev.user_answer}
          </p>
        </div>

        {/* Voice transcript */}
        <div className="border rounded-xl p-5 bg-card space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Mic size={14} className="text-purple-500" />
            {h.voiceTranscript}
          </h2>
          {ev.transcript ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {ev.transcript}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">{h.noTranscript}</p>
          )}
        </div>
      </div>

      {/* AI Feedback */}
      <AIFeedbackPanel evaluation={ev} title={ev.questions?.title} />
    </div>
  )
}
