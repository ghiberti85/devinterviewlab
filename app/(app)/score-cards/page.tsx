'use client'

import Link from 'next/link'
import { BarChart2 } from 'lucide-react'
import { useScoreCards } from '@/features/score-cards/hooks/useScoreCards'
import { ScoreCardList } from '@/features/score-cards/components/ScoreCardList'
import { useT } from '@/lib/i18n/useT'

export default function ScoreCardsPage() {
  const t = useT()
  const { data: scoreCards, isLoading } = useScoreCards()

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <BarChart2 size={20} className="text-primary" />
            {t.scoreCard.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t.scoreCard.subtitle}</p>
        </div>
        <div className="text-xs text-muted-foreground border rounded-lg px-3 py-2 max-w-xs">
          {t.scoreCard.generateHint}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="border rounded-xl bg-card p-4 animate-pulse h-16" />
          ))}
        </div>
      )}

      {!isLoading && (!scoreCards || scoreCards.length === 0) && (
        <div className="border rounded-xl bg-card p-8 text-center space-y-3">
          <BarChart2 size={32} className="text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">{t.scoreCard.noCards}</p>
          <Link
            href="/interview"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:opacity-90 transition-opacity"
          >
            {t.scoreCard.goToInterview}
          </Link>
        </div>
      )}

      {!isLoading && scoreCards && scoreCards.length > 0 && (
        <ScoreCardList scoreCards={scoreCards} />
      )}
    </div>
  )
}
