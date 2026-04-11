'use client'

import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/store/settings.store'
import type { Difficulty } from '@/lib/supabase/types'

const STYLES: Record<Difficulty, string> = {
  easy:   'bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  hard:   'bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-400',
}

const LABELS: Record<string, Record<Difficulty, string>> = {
  en: { easy: 'Easy',  medium: 'Medium', hard: 'Hard' },
  pt: { easy: 'Fácil', medium: 'Médio',  hard: 'Difícil' },
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const { language } = useSettingsStore()
  const label = (LABELS[language] ?? LABELS.en)[difficulty]

  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STYLES[difficulty])}>
      {label}
    </span>
  )
}
