'use client'

import { useState } from 'react'
import { RotateCcw, ChevronRight } from 'lucide-react'
import { DifficultyBadge } from '@/components/DifficultyBadge'
import { useT } from '@/lib/i18n/useT'
import type { Question } from '@/lib/supabase/types'

interface Props {
  question: Question
  index: number
  total: number
  onRate: (confidence: 1 | 2 | 3 | 4 | 5) => void
  onSkip?: () => void
  isSubmitting?: boolean
}

export function Flashcard({ question, index, total, onRate, onSkip, isSubmitting }: Props) {
  const [flipped, setFlipped] = useState(false)
  const t = useT()

  const confidenceLabels = t.practice.confidenceLabels
  const CONFIDENCE_COLORS: Record<number, string> = {
    1: 'bg-red-500 hover:bg-red-600',
    2: 'bg-orange-500 hover:bg-orange-600',
    3: 'bg-yellow-500 hover:bg-yellow-600',
    4: 'bg-blue-500 hover:bg-blue-600',
    5: 'bg-green-500 hover:bg-green-600',
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Card */}
      <div
        className="relative border rounded-xl bg-card cursor-pointer select-none min-h-[320px] p-6 flex flex-col transition-shadow hover:shadow-md"
        onClick={() => setFlipped(f => !f)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DifficultyBadge difficulty={question.difficulty} />
            {question.is_behavioral && (
              <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full">
                Behavioral
              </span>
            )}
            <span className="text-xs text-muted-foreground">{index + 1}/{total}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RotateCcw size={12} />
            {flipped ? t.practice.clickToHide : t.practice.clickToReveal}
          </div>
        </div>

        {!flipped ? (
          <div className="flex-1 space-y-3">
            {/* Question label */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t.practice.question}
            </p>
            {/* Full question title */}
            <h2 className="text-base font-semibold leading-relaxed">{question.title}</h2>
            {/* Body / context if present */}
            {question.body && (
              <div className="border-t pt-3 mt-3">
                <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
                  {t.practice.context}
                </p>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                  {question.body}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t.practice.idealAnswer}
            </p>
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
              {question.ideal_answer ?? (
                question.language === 'pt' ? 'Nenhuma resposta ideal cadastrada.' : 'No ideal answer provided.'
              )}
            </pre>
          </div>
        )}
      </div>

      {/* Skip button — always visible before rating */}
      {!flipped && onSkip && (
        <div className="flex justify-end">
          <button
            onClick={onSkip}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2 rounded-md hover:bg-accent"
          >
            {t.practice.skip}
            <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* Confidence rating — only after flip */}
      {flipped && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t.practice.confidence}</p>
            {onSkip && (
              <button
                onClick={onSkip}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-md hover:bg-accent"
              >
                {t.practice.skip}
                <ChevronRight size={12} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {([1, 2, 3, 4, 5] as const).map(n => (
              <button
                key={n}
                onClick={() => onRate(n)}
                disabled={isSubmitting}
                className={`${CONFIDENCE_COLORS[n]} text-white rounded-lg min-h-[52px] text-xs font-medium transition-colors disabled:opacity-50 flex flex-col items-center justify-center gap-0.5 px-1`}
              >
                <span className="text-lg font-bold leading-none">{n}</span>
                <span className="text-[10px] leading-tight opacity-90">{confidenceLabels[n]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
