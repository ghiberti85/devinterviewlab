'use client'

import { CheckCircle } from 'lucide-react'
import { useT } from '@/lib/i18n/useT'
import type { RoadmapPhase, RoadmapTopicProgress } from '@/lib/supabase/types'

interface Props {
  phases: RoadmapPhase[]
  progress: RoadmapTopicProgress[]
  onPractice: (topicName: string) => void
  onIncrementProgress: (topicName: string) => void
}

const PRIORITY_LABELS: Record<number, string> = { 1: 'P1', 2: 'P2', 3: 'P3' }
const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  2: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  3: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
}

export function RoadmapTimeline({ phases, progress, onPractice, onIncrementProgress }: Props) {
  const t = useT()

  function getProgress(topicName: string): RoadmapTopicProgress | undefined {
    return progress.find((p) => p.topic_name === topicName)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {phases.map((phase) => (
        <div key={phase.label} className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            {phase.label}
          </h3>
          <div className="space-y-3">
            {phase.topics.map((topic) => {
              const prog = getProgress(topic.name)
              const done = prog?.questions_done ?? 0
              const goal = prog?.questions_goal ?? topic.question_count ?? 5
              const isComplete = done >= goal
              const pct = goal > 0 ? Math.min((done / goal) * 100, 100) : 0

              return (
                <div
                  key={topic.name}
                  className={`rounded-md border p-3 space-y-2 ${isComplete ? 'border-green-500/50 bg-green-50 dark:bg-green-900/10' : 'bg-background'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isComplete && <CheckCircle size={14} className="text-green-500 shrink-0" />}
                      <span className="text-sm font-medium truncate">{topic.name}</span>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold rounded px-1.5 py-0.5 ${PRIORITY_COLORS[topic.priority] ?? PRIORITY_COLORS[3]}`}>
                      {PRIORITY_LABELS[topic.priority] ?? 'P3'}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{t.roadmap.progress}</span>
                      <span>{done}/{goal}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-primary'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {!isComplete && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onPractice(topic.name)}
                        className="flex-1 text-xs rounded border px-2 py-1 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                      >
                        {t.roadmap.practice}
                      </button>
                      <button
                        onClick={() => onIncrementProgress(topic.name)}
                        className="text-xs rounded border px-2 py-1 hover:bg-accent transition-colors"
                        title={t.roadmap.markDone}
                      >
                        {t.roadmap.markDone}
                      </button>
                    </div>
                  )}
                  {isComplete && (
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">{t.roadmap.completed} ✓</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
