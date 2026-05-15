'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { ScoreCardView } from './ScoreCardView'
import { ExportPdfButton } from './ExportPdfButton'
import { useDeleteScoreCard } from '../hooks/useScoreCards'
import { useT } from '@/lib/i18n/useT'
import type { ScoreCard } from '@/lib/supabase/types'

interface Props {
  scoreCards: ScoreCard[]
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
      : score >= 50
        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
  return (
    <span className={`text-sm font-bold px-2 py-0.5 rounded-full tabular-nums ${color}`}>
      {Math.round(score)}/100
    </span>
  )
}

export function ScoreCardList({ scoreCards }: Props) {
  const t = useT()
  const deleteCard = useDeleteScoreCard()
  const [viewingId, setViewingId] = useState<string | null>(null)

  const viewing = scoreCards.find(sc => sc.id === viewingId) ?? null

  return (
    <>
      <div className="space-y-3">
        {scoreCards.map(sc => (
          <div
            key={sc.id}
            className="border rounded-xl bg-card p-4 flex items-center justify-between gap-4 flex-wrap"
          >
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-medium truncate">
                {sc.session_label ?? 'Session'}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(sc.created_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ScoreBadge score={sc.overall_score} />
              <button
                onClick={() => setViewingId(sc.id)}
                className="border px-3 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
              >
                {t.scoreCard.view}
              </button>
              <button
                onClick={() => deleteCard.mutate(sc.id)}
                disabled={deleteCard.isPending}
                className="border px-3 py-1.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                {t.scoreCard.delete}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog.Root open={!!viewingId} onOpenChange={open => { if (!open) setViewingId(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-background rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-0">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background">
              <Dialog.Title className="text-sm font-semibold">
                {viewing?.session_label ?? 'Score Card'}
              </Dialog.Title>
              <div className="flex items-center gap-2">
                <ExportPdfButton />
                <Dialog.Close asChild>
                  <button className="p-1.5 rounded-md hover:bg-accent transition-colors">
                    <X size={16} />
                  </button>
                </Dialog.Close>
              </div>
            </div>
            <div className="p-4">
              {viewing && <ScoreCardView scoreCard={viewing} />}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
