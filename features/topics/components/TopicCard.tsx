'use client'
import { useState } from 'react'
import { ChevronDown, Trash2, Code2, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Topic } from '@/lib/supabase/types'
import { useDeleteTopic } from '../hooks/useTopics'
import { useT } from '@/lib/i18n/useT'

export function TopicCard({ topic }: { topic: Topic }) {
  const t = useT()
  const [openQA, setOpenQA] = useState<number | null>(null)
  const [showCode, setShowCode] = useState(false)
  const deleteTopic = useDeleteTopic()

  const difficultyColor = {
    easy: 'text-green-600 bg-green-50',
    medium: 'text-yellow-700 bg-yellow-50',
    hard: 'text-red-600 bg-red-50',
  }[topic.difficulty] ?? 'text-muted-foreground bg-muted'

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', difficultyColor)}>
              {topic.difficulty}
            </span>
            {topic.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
          <h3 className="font-semibold mt-1 text-sm">{topic.title}</h3>
        </div>
        <button
          onClick={() => deleteTopic.mutate(topic.id)}
          className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
          title={t.topics.delete}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Summary */}
      <p className="text-sm text-muted-foreground leading-relaxed">{topic.summary}</p>

      {/* When to use */}
      {topic.when_to_use && (
        <div className="text-sm border-l-2 border-primary/30 pl-3 text-muted-foreground">
          <span className="font-medium text-foreground">{t.topics.whenToUse}:</span>{' '}
          {topic.when_to_use}
        </div>
      )}

      {/* Code snippet toggle */}
      {topic.code_snippet && (
        <div>
          <button
            onClick={() => setShowCode(v => !v)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Code2 size={12} />
            {showCode ? t.topics.hideCode : t.topics.showCode}
          </button>
          {showCode && (
            <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
              <code>{topic.code_snippet}</code>
            </pre>
          )}
        </div>
      )}

      {/* Quick Q&A */}
      {topic.quick_qa.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Zap size={12} />
            {t.topics.quickQA} ({topic.quick_qa.length})
          </div>
          {topic.quick_qa.map((item, i) => (
            <div key={i} className="border rounded overflow-hidden">
              <button
                className="w-full text-left text-xs px-3 py-2 flex items-center justify-between gap-2 hover:bg-muted/50 transition-colors"
                onClick={() => setOpenQA(openQA === i ? null : i)}
              >
                <span className="font-medium">{item.q}</span>
                <ChevronDown size={12} className={cn('shrink-0 transition-transform', openQA === i && 'rotate-180')} />
              </button>
              {openQA === i && (
                <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 border-t leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
