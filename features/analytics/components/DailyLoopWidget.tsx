'use client'

import Link from 'next/link'
import { useDailyLoop } from '@/features/analytics/hooks/useDailyLoop'
import { useT } from '@/lib/i18n/useT'
import { Flame, Brain, Layers, Code2 } from 'lucide-react'

export function DailyLoopWidget() {
  const { data, isLoading } = useDailyLoop()
  const t = useT()
  const dl = t.dashboard.dailyLoop

  if (isLoading) {
    return (
      <div className="border rounded-xl p-5 bg-card animate-pulse">
        <div className="h-4 bg-muted rounded w-40 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="border rounded-xl p-5 bg-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-sm">{dl.title}</h2>
        {data.todayActive && (
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">{dl.todayDone}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Streak */}
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <div className="p-1.5 rounded-md bg-orange-100 dark:bg-orange-900/30">
            <Flame size={16} className="text-orange-500" />
          </div>
          <div>
            <div className="text-lg font-bold tabular-nums leading-tight">
              {data.streak}
            </div>
            <div className="text-xs text-muted-foreground">
              {data.streak > 0 ? dl.streak(data.streak) : dl.streakZero}
            </div>
          </div>
        </div>

        {/* Weak concept */}
        <Link
          href="/concept-graph"
          className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
        >
          <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
            <Brain size={16} className="text-purple-500" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{dl.weakConcept}</div>
            <div className="text-sm font-medium truncate">
              {data.weakestConcept
                ? `${data.weakestConcept.name} (${data.weakestConcept.score})`
                : dl.noConcepts}
            </div>
          </div>
        </Link>

        {/* Due flashcards */}
        <Link
          href="/practice?mode=spaced"
          className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
        >
          <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
            <Layers size={16} className="text-blue-500" />
          </div>
          <div>
            <div className="text-lg font-bold tabular-nums leading-tight">
              {data.dueFlashcardsCount}
            </div>
            <div className="text-xs text-muted-foreground">
              {data.dueFlashcardsCount > 0 ? dl.dueCards(data.dueFlashcardsCount) : dl.noCards}
            </div>
          </div>
        </Link>

        {/* Live coding shortcut */}
        <Link
          href="/live-coding"
          className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
        >
          <div className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/30">
            <Code2 size={16} className="text-green-500" />
          </div>
          <div>
            <div className="text-sm font-medium">{dl.startCoding}</div>
            <div className="text-xs text-muted-foreground">Live Coding</div>
          </div>
        </Link>
      </div>
    </div>
  )
}
