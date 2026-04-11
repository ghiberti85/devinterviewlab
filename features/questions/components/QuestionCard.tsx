'use client'

import Link from 'next/link'
import { Trash2, Edit, Brain } from 'lucide-react'
import { DifficultyBadge } from '@/components/DifficultyBadge'
import { useDeleteQuestion } from '../hooks/useQuestions'
import { useSettingsStore } from '@/store/settings.store'
import type { Question } from '@/lib/supabase/types'

// Category names that should be translated
const CATEGORY_PT: Record<string, string> = {
  'Behavioral': 'Comportamental',
  'Algorithms': 'Algoritmos',
  'System Design': 'Design de Sistemas',
  'JavaScript': 'JavaScript',
  'TypeScript': 'TypeScript',
  'React': 'React',
  'Node.js': 'Node.js',
  'CSS': 'CSS',
}

interface Props {
  question: Question
  onEdit?: (q: Question) => void
}

export function QuestionCard({ question, onEdit }: Props) {
  const del = useDeleteQuestion()
  const { language } = useSettingsStore()

  const q = question as any

  function translateCategory(name: string) {
    if (language === 'pt' && CATEGORY_PT[name]) return CATEGORY_PT[name]
    return name
  }

  return (
    <div className="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <DifficultyBadge difficulty={question.difficulty} />
            {question.is_behavioral && (
              <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full">
                {language === 'pt' ? 'Comportamental' : 'Behavioral'}
              </span>
            )}
            {q.categories && (
              <span className="text-xs text-muted-foreground">
                {translateCategory(q.categories.name)}
              </span>
            )}
            {q.language && q.language !== 'en' && (
              <span className="text-xs border px-1.5 py-0.5 rounded text-muted-foreground">
                {q.language === 'pt' ? '🇧🇷' : q.language}
              </span>
            )}
          </div>

          <Link href={`/questions/${question.id}`}>
            <h3 className="font-medium text-sm hover:text-primary transition-colors line-clamp-2">
              {question.title}
            </h3>
          </Link>

          {q.question_tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {q.question_tags.slice(0, 4).map((qt: any) => (
                <span
                  key={qt.tags.id}
                  className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded"
                >
                  {qt.tags.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Link
            href={`/interview?question=${question.id}`}
            className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title={language === 'pt' ? 'Praticar com IA' : 'Practice with AI'}
          >
            <Brain size={15} />
          </Link>
          <button
            onClick={() => onEdit?.(question)}
            className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <Edit size={15} />
          </button>
          <button
            onClick={() => del.mutate(question.id)}
            className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
