'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Brain, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react'
import { useQuestion, useQuestionEvaluations } from '@/features/questions/hooks/useQuestions'
import { DifficultyBadge } from '@/components/DifficultyBadge'
import { useState } from 'react'
import type { AIEvaluation } from '@/lib/supabase/types'

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    : score >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full tabular-nums ${color}`}>
      {Math.round(score)}/100
    </span>
  )
}

function EvaluationRow({ ev }: { ev: AIEvaluation }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <ScoreBadge score={ev.score} />
          <span className="text-xs text-muted-foreground">
            {new Date(ev.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </span>
          {ev.feedback?.strengths?.length > 0 && (
            <span className="text-xs text-green-600 dark:text-green-400">
              {ev.feedback.strengths.length} strength{ev.feedback.strengths.length !== 1 ? 's' : ''}
            </span>
          )}
          {ev.feedback?.gaps?.length > 0 && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {ev.feedback.gaps.length} gap{ev.feedback.gaps.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t px-4 py-3 bg-muted/20 space-y-3 text-sm">
          {/* Score breakdown */}
          {ev.feedback?.score_breakdown && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {Object.entries(ev.feedback.score_breakdown).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground capitalize text-xs">{k}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1 rounded-full bg-border overflow-hidden">
                      <div
                        className={`h-full rounded-full ${v >= 75 ? 'bg-green-500' : v >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${v}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums w-5 text-right">{v}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Your answer */}
          {ev.user_answer && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Your answer</p>
              <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">{ev.user_answer}</p>
            </div>
          )}

          {ev.feedback?.strengths?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Strengths</p>
              <ul className="space-y-0.5">
                {ev.feedback.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-green-500">•</span>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {ev.feedback?.gaps?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Gaps</p>
              <ul className="space-y-0.5">
                {ev.feedback.gaps.map((g, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-red-500">•</span>{g}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function QuestionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: question, isLoading } = useQuestion(id)
  const { data: evaluations = [] } = useQuestionEvaluations(id)

  if (isLoading) return (
    <div className="animate-pulse space-y-4 max-w-3xl">
      <div className="h-6 bg-muted rounded w-1/2" />
      <div className="h-32 bg-muted rounded" />
    </div>
  )

  if (!question) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Question not found.</p>
      <Link href="/questions" className="text-primary hover:underline text-sm mt-2 inline-block">← Back</Link>
    </div>
  )

  // Score trend
  const avgScore = evaluations.length
    ? Math.round(evaluations.reduce((a, e) => a + e.score, 0) / evaluations.length)
    : null

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/questions" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold flex-1">{question.title}</h1>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <DifficultyBadge difficulty={question.difficulty} />
        {question.is_behavioral && (
          <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full">Behavioral</span>
        )}
        {(question as any).language && (question as any).language !== 'en' && (
          <span className="text-xs border px-2 py-0.5 rounded-full">
            {(question as any).language === 'pt' ? '🇧🇷 PT' : (question as any).language === 'es' ? '🇪🇸 ES' : (question as any).language}
          </span>
        )}
        {(question as any).categories && (
          <span className="text-xs text-muted-foreground border px-2 py-0.5 rounded-full">
            {(question as any).categories.name}
          </span>
        )}
      </div>

      {question.body && (
        <div className="border rounded-xl p-5 bg-card">
          <h2 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Context</h2>
          <pre className="text-sm whitespace-pre-wrap font-sans">{question.body}</pre>
        </div>
      )}

      {question.ideal_answer && (
        <div className="border rounded-xl p-5 bg-card">
          <h2 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Ideal answer</h2>
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{question.ideal_answer}</pre>
        </div>
      )}

      {/* Answer history */}
      <div className="border rounded-xl p-5 bg-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">
            Answer history
            {evaluations.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                {evaluations.length} attempt{evaluations.length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          {avgScore !== null && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Avg score: <ScoreBadge score={avgScore} />
            </div>
          )}
        </div>

        {evaluations.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <p>No AI evaluations yet for this question.</p>
            <Link href={`/interview?question=${question.id}`} className="text-primary hover:underline mt-1 inline-block">
              Practice with AI coach →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {evaluations.map(ev => (
              <EvaluationRow key={ev.id} ev={ev} />
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Link
          href={`/interview?question=${question.id}`}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity"
        >
          <Brain size={15} /> Practice with AI coach
        </Link>
        <Link
          href="/practice"
          className="flex items-center gap-2 border px-5 py-2.5 rounded-lg text-sm hover:bg-accent transition-colors"
        >
          <Dumbbell size={15} /> Flashcard mode
        </Link>
      </div>
    </div>
  )
}
