'use client'
import { memo, useState, useRef, useEffect } from 'react'
import { Code2, Languages, Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TopicPair } from '@/lib/supabase/types'
import { useTranslateTopic } from '../hooks/useTopics'
import { useT } from '@/lib/i18n/useT'
import { useSettingsStore } from '@/store/settings.store'

const MAX_VISIBLE_TAGS = 2

function TagsRow({ tags }: { tags: string[] }) {
  const [popupOpen, setPopupOpen] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)
  const visible = tags.slice(0, MAX_VISIBLE_TAGS)
  const hidden = tags.slice(MAX_VISIBLE_TAGS)

  useEffect(() => {
    if (!popupOpen) return
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopupOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [popupOpen])

  return (
    <>
      {visible.map(tag => (
        <span key={tag} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
          {tag}
        </span>
      ))}
      {hidden.length > 0 && (
        <div className="relative shrink-0" ref={popupRef}>
          <button
            onClick={e => { e.stopPropagation(); setPopupOpen(v => !v) }}
            className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full hover:bg-muted/80 transition-colors whitespace-nowrap"
          >
            +{hidden.length}
          </button>
          {popupOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 bg-popover border rounded-lg shadow-lg p-2 flex flex-wrap gap-1.5 min-w-max max-w-[240px]">
              {hidden.map(tag => (
                <span key={tag} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full whitespace-nowrap">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

function AccordionSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t pt-3 first:border-t-0 first:pt-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full text-left group"
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide group-hover:text-foreground transition-colors">
          {title}
        </p>
        <ChevronDown size={13} className={cn('text-muted-foreground transition-transform shrink-0', open && 'rotate-180')} />
      </button>
      {open && <div className="mt-2 min-w-0 overflow-hidden">{children}</div>}
    </div>
  )
}

export const TopicCard = memo(function TopicCard({ pair }: { pair: TopicPair }) {
  const t = useT()
  const { language } = useSettingsStore()
  const [showCode, setShowCode] = useState(false)
  const translateTopic = useTranslateTopic()

  if (!pair.current && !pair.other) return null

  // Guarantee: never render topic content in a language other than the active
  // UI language, not even briefly. If the version in `language` doesn't exist
  // yet, show a neutral placeholder (no foreign text) with a manual translate
  // action — the server also self-heals this gap in the background (see
  // GET /api/topics), so this state is expected to be transient.
  if (!pair.current) {
    const source = pair.other!
    return (
      <div className="border border-dashed rounded-lg p-4 space-y-2 bg-card min-w-0 w-full">
        <p className="text-sm text-muted-foreground italic">{t.topics.notTranslatedYet}</p>
        <button
          onClick={() => translateTopic.mutate({ id: source.id, currentLanguage: language as string })}
          disabled={translateTopic.isPending}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
        >
          {translateTopic.isPending
            ? <Loader2 size={13} className="animate-spin" />
            : <Languages size={13} />
          }
          {t.topics.translateTo(language === 'en' ? 'EN' : 'PT')}
        </button>
      </div>
    )
  }

  const topic = pair.current
  const targetLangLabel = language === 'en' ? 'PT' : 'EN'

  const difficultyColor = {
    easy: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
    medium: 'text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400',
    hard: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
  }[topic.difficulty] ?? 'text-muted-foreground bg-muted'

  function handleTranslate() {
    translateTopic.mutate({ id: topic.id, currentLanguage: language as string })
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card min-w-0 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap', difficultyColor)}>
              {topic.difficulty}
            </span>
            <TagsRow tags={topic.tags} />
          </div>
          <h3 className="font-semibold mt-1.5 text-sm">{topic.title}</h3>
        </div>
        {!pair.other && (
          <button
            onClick={handleTranslate}
            disabled={translateTopic.isPending}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-1.5 py-1 rounded hover:bg-muted disabled:opacity-50 shrink-0"
            title={t.topics.translateTo(targetLangLabel)}
          >
            {translateTopic.isPending
              ? <Loader2 size={13} className="animate-spin" />
              : <Languages size={13} />
            }
            <span>{targetLangLabel}</span>
          </button>
        )}
      </div>

      {/* Teoria — open by default */}
      <AccordionSection title={t.topics.theory ?? 'Theory'} defaultOpen>
        <p className="text-sm text-muted-foreground leading-relaxed break-words">{topic.summary}</p>
      </AccordionSection>

      {/* Quando usar */}
      {topic.when_to_use && (
        <AccordionSection title={t.topics.whenToUse} defaultOpen>
          <p className="text-sm text-muted-foreground leading-relaxed break-words">{topic.when_to_use}</p>
        </AccordionSection>
      )}

      {/* Prós & Contras */}
      {(topic.pros?.length > 0 || topic.cons?.length > 0) && (
        <AccordionSection title={`${t.topics.pros ?? 'Pros'} & ${t.topics.cons ?? 'Cons'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topic.pros?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
                  {t.topics.pros ?? 'Pros'}
                </p>
                <ul className="space-y-1">
                  {topic.pros.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-green-600 dark:text-green-400 shrink-0 mt-0.5">+</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {topic.cons?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">
                  {t.topics.cons ?? 'Cons'}
                </p>
                <ul className="space-y-1">
                  {topic.cons.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-red-500 dark:text-red-400 shrink-0 mt-0.5">−</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </AccordionSection>
      )}

      {/* Examples (code snippet) */}
      {topic.code_snippet && (
        <div className="border-t pt-3">
          <button
            onClick={() => setShowCode(v => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors w-full justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Code2 size={12} />
              {t.topics.examples ?? t.topics.showCode}
            </span>
            <ChevronDown size={11} className={cn('transition-transform', showCode && 'rotate-180')} />
          </button>
          {showCode && (
            <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto leading-relaxed">
              <code>{topic.code_snippet}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  )
})
