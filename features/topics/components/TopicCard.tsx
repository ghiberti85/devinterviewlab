'use client'
import { useState } from 'react'
import { ChevronDown, Code2, Zap, Languages, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TopicPair } from '@/lib/supabase/types'
import { useTranslateTopic } from '../hooks/useTopics'
import { useT } from '@/lib/i18n/useT'
import { useSettingsStore } from '@/store/settings.store'

export function TopicCard({ pair }: { pair: TopicPair }) {
  const t = useT()
  const { language } = useSettingsStore()
  const [openQA, setOpenQA] = useState<number | null>(null)
  const [showCode, setShowCode] = useState(false)
  const translateTopic = useTranslateTopic()

  // Show the current-language version; fall back to the other language
  const topic = pair.current ?? pair.other
  if (!topic) return null

  const isFallback = !pair.current && !!pair.other
  const targetLangLabel = language === 'en' ? 'PT' : 'EN'
  const sourceToTranslate = isFallback ? pair.other! : pair.current!

  const difficultyColor = {
    easy: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
    medium: 'text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400',
    hard: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
  }[topic.difficulty] ?? 'text-muted-foreground bg-muted'

  function handleTranslate() {
    translateTopic.mutate({ id: sourceToTranslate.id, currentLanguage: language as string })
  }

  return (
    <div className={cn('border rounded-lg p-4 space-y-3 bg-card', isFallback && 'opacity-70')}>
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
            {/* Badge showing this is shown in the other language as fallback */}
            {isFallback && (
              <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                {topic.language.toUpperCase()}
              </span>
            )}
          </div>
          <h3 className="font-semibold mt-1 text-sm">{topic.title}</h3>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Translate button: shown when pair is missing one language */}
          {(!pair.current || !pair.other) && (
            <button
              onClick={handleTranslate}
              disabled={translateTopic.isPending}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-1.5 py-1 rounded hover:bg-muted disabled:opacity-50"
              title={t.topics.translateTo(isFallback ? (language === 'en' ? 'EN' : 'PT') : targetLangLabel)}
            >
              {translateTopic.isPending
                ? <Loader2 size={13} className="animate-spin" />
                : <Languages size={13} />
              }
              <span>{isFallback ? (language === 'en' ? 'EN' : 'PT') : targetLangLabel}</span>
            </button>
          )}

        </div>
      </div>

      {/* Fallback notice */}
      {isFallback && (
        <p className="text-xs text-yellow-700 dark:text-yellow-400 italic">
          {t.topics.notTranslatedYet}
        </p>
      )}

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
                className="w-full text-left text-xs px-3 py-2.5 min-h-[40px] flex items-center justify-between gap-2 hover:bg-muted/50 transition-colors"
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
