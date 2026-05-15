'use client'

import { RadarChart } from './RadarChart'
import { useT } from '@/lib/i18n/useT'
import type { ScoreCard } from '@/lib/supabase/types'

interface Props {
  scoreCard: ScoreCard
}

export function ScoreCardView({ scoreCard }: Props) {
  const t = useT()

  const scoreColor =
    scoreCard.overall_score >= 75
      ? 'text-green-600 dark:text-green-400'
      : scoreCard.overall_score >= 50
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-red-600 dark:text-red-400'

  const formattedDate = new Date(scoreCard.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div id="score-card-export" className="space-y-6 p-4 bg-background rounded-xl">
      {/* Header */}
      <div className="text-center space-y-1">
        {scoreCard.session_label && (
          <p className="text-sm text-muted-foreground font-medium">{scoreCard.session_label}</p>
        )}
        <p className="text-xs text-muted-foreground">{formattedDate}</p>
      </div>

      {/* Radar + Overall score */}
      <div className="flex flex-col items-center gap-4">
        <RadarChart data={scoreCard.radar} size={240} />
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            {t.scoreCard.overall}
          </p>
          <span className={`text-5xl font-bold tabular-nums ${scoreColor}`}>
            {Math.round(scoreCard.overall_score)}
          </span>
          <span className="text-lg text-muted-foreground ml-1">/100</span>
        </div>
      </div>

      {/* Strengths */}
      {scoreCard.strengths.length > 0 && (
        <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4">
          <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
            {t.scoreCard.strengths}
          </p>
          <ul className="space-y-1">
            {scoreCard.strengths.map((s, i) => (
              <li key={i} className="text-sm text-green-800 dark:text-green-300 flex gap-2">
                <span>✓</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gaps */}
      {scoreCard.gaps.length > 0 && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
            {t.scoreCard.gaps}
          </p>
          <ul className="space-y-1">
            {scoreCard.gaps.map((g, i) => (
              <li key={i} className="text-sm text-red-800 dark:text-red-300 flex gap-2">
                <span>✗</span> {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendation */}
      {scoreCard.recommendation && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">
            {t.scoreCard.recommendation}
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
            {scoreCard.recommendation}
          </p>
        </div>
      )}
    </div>
  )
}
