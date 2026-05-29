'use client'

import { useState, useEffect, useRef } from 'react'
import { useT } from '@/lib/i18n/useT'
import { useSettingsStore } from '@/store/settings.store'
import { Layers, BookMarked, Network, CheckCircle, RotateCcw, Loader2, ChevronDown, HelpCircle } from 'lucide-react'

// Flashcard practice
import { usePracticeQuestions, useSubmitSession } from '@/features/practice/hooks/usePractice'
import { Flashcard } from '@/features/practice/components/Flashcard'
import { useSessionStore } from '@/store/session.store'
import type { SessionType } from '@/lib/supabase/types'

// Flash Topics
import { useTopics, useGenerateTopic, useTranslateTopic, useDeleteTopic, useSyncTopics } from '@/features/topics/hooks/useTopics'
import { TopicCard } from '@/features/topics/components/TopicCard'
import { TopicGenerator } from '@/features/topics/components/TopicGenerator'
// Concepts
import { useConcepts } from '@/features/concepts/hooks/useConcepts'
import Link from 'next/link'
// Roadmap questions
import { useRoadmaps } from '@/features/roadmaps/hooks/useRoadmaps'
import { useRoadmapQuestions } from '@/features/roadmaps/hooks/useRoadmapQuestions'

type Tab = 'topics' | 'flashcards' | 'concepts' | 'questions'
type FlashMode = 'random' | 'spaced'

function FlashcardsTab() {
  const t = useT()
  const [mode, setMode] = useState<FlashMode>('spaced')
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [results, setResults] = useState<{ conf: number }[]>([])

  const { data: questions, isLoading, refetch } = usePracticeQuestions(mode)
  const submit = useSubmitSession()
  const { elapsedSec, startSession, tick, reset } = useSessionStore()

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (started && !done) {
      timerRef.current = setInterval(tick, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [started, done])

  async function handleRate(confidence: 1 | 2 | 3 | 4 | 5) {
    if (!questions) return
    const q = questions[index]
    if (!q) return
    await submit.mutateAsync({ question_id: q.id, session_type: 'flashcard' as SessionType, confidence, duration_sec: elapsedSec })
    setResults(prev => [...prev, { conf: confidence }])
    if (index + 1 >= questions.length) {
      setDone(true)
      if (timerRef.current) clearInterval(timerRef.current)
    } else {
      setIndex(i => i + 1)
    }
  }

  function handleSkip() {
    if (!questions) return
    if (index + 1 >= questions.length) {
      setDone(true)
      if (timerRef.current) clearInterval(timerRef.current)
    } else {
      setIndex(i => i + 1)
    }
  }

  function handleStart() {
    setStarted(true); setIndex(0); setDone(false); setResults([])
    startSession('flashcard')
  }

  function handleRestart() {
    reset(); refetch()
    setStarted(false); setIndex(0); setDone(false); setResults([])
  }

  const avgConf = results.length
    ? (results.reduce((a, b) => a + b.conf, 0) / results.length).toFixed(1)
    : '–'

  if (!started) {
    return (
      <div className="max-w-md mx-auto space-y-4 py-4">
        <div className="border rounded-xl p-5 bg-card space-y-4">
          <h2 className="font-semibold text-sm">{t.practice.mode}</h2>
          <div className="space-y-2">
            {([
              { value: 'spaced', label: t.practice.spaced, desc: t.practice.spacedDesc },
              { value: 'random', label: t.practice.random, desc: t.practice.randomDesc },
            ] as const).map(opt => (
              <label key={opt.value} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${mode === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-accent'}`}>
                <input type="radio" name="mode" value={opt.value} checked={mode === opt.value} onChange={() => setMode(opt.value)} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
          <button
            onClick={handleStart}
            disabled={isLoading || !questions?.length}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isLoading ? t.practice.loading : questions?.length === 0 ? t.practice.noQuestions : t.practice.questionsCount(questions?.length ?? 0)}
          </button>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto py-6 space-y-4">
        <div className="border rounded-xl p-8 bg-card text-center space-y-4">
          <CheckCircle size={40} className="text-green-500 mx-auto" />
          <h2 className="text-lg font-semibold">{t.practice.doneTitle}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div><div className="text-2xl font-bold">{results.length}</div><div className="text-xs text-muted-foreground">{t.practice.cardsReviewed}</div></div>
            <div><div className="text-2xl font-bold">{avgConf}</div><div className="text-xs text-muted-foreground">{t.practice.avgConfidence}</div></div>
            <div><div className="text-xl font-bold tabular-nums">{Math.floor(elapsedSec / 60)}m {elapsedSec % 60}s</div><div className="text-xs text-muted-foreground">{t.practice.timeSpent}</div></div>
          </div>
        </div>
        <button onClick={handleRestart} className="w-full flex items-center justify-center gap-2 border rounded-lg py-2.5 text-sm hover:bg-accent transition-colors">
          <RotateCcw size={14} /> {t.practice.newSession}
        </button>
      </div>
    )
  }

  const currentQ = questions?.[index]
  return (
    <div className="py-2">
      {started && (
        <div className="text-xs text-muted-foreground text-right tabular-nums mb-2">
          {Math.floor(elapsedSec / 60).toString().padStart(2, '0')}:{(elapsedSec % 60).toString().padStart(2, '0')}
        </div>
      )}
      <div className="w-full h-1 bg-muted rounded-full mb-4">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(index / (questions?.length ?? 1)) * 100}%` }} />
      </div>
      {currentQ && (
        <Flashcard question={currentQ} index={index} total={questions?.length ?? 0} onRate={handleRate} onSkip={handleSkip} isSubmitting={submit.isPending} />
      )}
    </div>
  )
}

function TopicsTab() {
  const t = useT()
  const { language } = useSettingsStore()
  const { data: pairs, isLoading } = useTopics(language as string)
  const syncTopics = useSyncTopics()
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  async function handleSync() {
    setSyncMsg(null)
    try {
      const result = await syncTopics.mutateAsync()
      setSyncMsg(t.topics.syncDone(result.questions_created, result.concepts_created))
    } catch {
      setSyncMsg(t.topics.syncError)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <TopicGenerator />
      </div>

      {/* Sync button — only shown when there are existing topics */}
      {!isLoading && pairs && pairs.length > 0 && (
        <div className="flex items-center justify-end gap-3">
          {syncMsg && <p className="text-xs text-muted-foreground">{syncMsg}</p>}
          <button
            onClick={handleSync}
            disabled={syncTopics.isPending}
            className="flex items-center gap-1.5 text-xs border px-3 py-2 rounded-md hover:bg-accent disabled:opacity-50 transition-colors min-h-[36px]"
          >
            {syncTopics.isPending
              ? <><Loader2 size={11} className="animate-spin mr-1" />{t.topics.syncing}</>
              : t.topics.syncAll}
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      )}
      {!isLoading && (!pairs || pairs.length === 0) && (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <BookMarked size={40} className="opacity-30" />
          <p className="text-sm">{t.topics.empty}</p>
        </div>
      )}
      {!isLoading && pairs && pairs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pairs.map(pair => <TopicCard key={pair.rootId} pair={pair} />)}
        </div>
      )}
    </div>
  )
}

function ConceptsTab() {
  const t = useT()
  const { data, isLoading } = useConcepts()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const nodes = data?.nodes ?? []
  const edges = data?.edges ?? []

  // Group child concepts by their root (part_of target)
  const rootIds = new Set(edges.filter(e => e.relation_type === 'part_of').map(e => e.target_id))
  const childOf = new Map<string, string>() // childId → parentId
  edges.filter(e => e.relation_type === 'part_of').forEach(e => childOf.set(e.source_id, e.target_id))

  // Root nodes = those that are targets of part_of, or have no parent
  const roots = nodes.filter(n => rootIds.has(n.id) || !childOf.has(n.id))
  // Children grouped by parent id
  const childrenByParent = new Map<string, typeof nodes>()
  nodes.filter(n => childOf.has(n.id)).forEach(n => {
    const pid = childOf.get(n.id)!
    childrenByParent.set(pid, [...(childrenByParent.get(pid) ?? []), n])
  })

  function scoreColor(score: number) {
    if (score >= 70) return 'bg-green-500'
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t.plan.conceptsDesc}</p>

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-xl h-24 animate-pulse bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && nodes.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Network size={40} className="opacity-30" />
          <p className="text-sm text-center">{t.review.noConceptsYet}</p>
        </div>
      )}

      {!isLoading && roots.length > 0 && (
        <div className="space-y-3">
          {roots.map(root => {
            const children = childrenByParent.get(root.id) ?? []
            const expanded = expandedIds.has(root.id)
            return (
              <div key={root.id} className="border rounded-xl p-4 bg-card space-y-3">
                {/* Root concept — clickable header to expand */}
                <button
                  onClick={() => toggleExpand(root.id)}
                  className="w-full flex items-start justify-between gap-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${scoreColor(root.score)}`} />
                      <span className="font-semibold text-sm">{root.name}</span>
                      <span className="text-xs tabular-nums text-muted-foreground ml-auto shrink-0">{root.score}/100</span>
                    </div>
                    {root.description && !expanded && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{root.description}</p>
                    )}
                  </div>
                  <ChevronDown size={14} className={`shrink-0 text-muted-foreground transition-transform mt-0.5 ${expanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Expanded description */}
                {expanded && root.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{root.description}</p>
                )}

                {/* Child concepts (tags) */}
                {children.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t">
                    {children.map(child => (
                      <span
                        key={child.id}
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-muted/50"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${scoreColor(child.score)}`} />
                        {child.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}

function QuestionsTab() {
  const t = useT()
  const { data: roadmaps, isLoading: roadmapsLoading } = useRoadmaps()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const allRoadmaps = roadmaps ?? []
  const currentId = selectedId ?? allRoadmaps[0]?.id ?? null
  const { data: questions, isLoading: qLoading } = useRoadmapQuestions(currentId)

  const topics = questions
    ? Array.from(new Set(questions.map(q => q.topic_name)))
    : []

  const filtered = questions
    ? (selectedTopic === 'all' ? questions : questions.filter(q => q.topic_name === selectedTopic))
    : []

  function toggleAnswer(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (roadmapsLoading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
  }

  if (allRoadmaps.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <HelpCircle size={40} className="opacity-30" />
        <p className="text-sm">{t.review.noRoadmaps}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Roadmap selector */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={currentId ?? ''}
          onChange={e => { setSelectedId(e.target.value); setSelectedTopic('all') }}
          className="text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary flex-1 max-w-xs"
        >
          {allRoadmaps.map(r => (
            <option key={r.id} value={r.id}>
              {r.job_title ?? t.roadmap.cvOnly} — {new Date(r.created_at).toLocaleDateString()}
            </option>
          ))}
        </select>

        {/* Topic filter */}
        {topics.length > 0 && (
          <select
            value={selectedTopic}
            onChange={e => setSelectedTopic(e.target.value)}
            className="text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary flex-1 max-w-xs"
          >
            <option value="all">{t.review.allTopics}</option>
            {topics.map(tp => <option key={tp} value={tp}>{tp}</option>)}
          </select>
        )}
      </div>

      {qLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {!qLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <HelpCircle size={40} className="opacity-30" />
          <p className="text-sm text-center">{t.roadmap.noQuestions}</p>
        </div>
      )}

      {!qLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(q => {
            const open = expandedIds.has(q.id)
            return (
              <div key={q.id} className="border rounded-xl p-4 bg-card space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">{q.phase_name}</span>
                      <span className="text-[10px] text-muted-foreground">{q.topic_name}</span>
                    </div>
                    <p className="text-sm font-medium leading-snug">{q.question}</p>
                  </div>
                  <button
                    onClick={() => toggleAnswer(q.id)}
                    className="shrink-0 text-xs text-primary hover:underline mt-1"
                  >
                    {open ? t.review.hideAnswer : t.review.showAnswer}
                  </button>
                </div>
                {open && (
                  <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3 leading-relaxed whitespace-pre-wrap">
                    {q.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function RevisarPage() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('topics')

  const tabs = [
    { id: 'topics'     as Tab, icon: BookMarked,  label: t.review.topicsTab },
    { id: 'questions'  as Tab, icon: HelpCircle,  label: t.review.questionsTab },
    { id: 'concepts'   as Tab, icon: Network,     label: t.review.conceptsTab },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t.nav.review}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.review.subtitle}</p>
      </div>

      {/* Tab selector — full width on mobile so tabs don't overflow */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-full sm:w-fit">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[40px] ${
              tab === id
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={14} className="shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {tab === 'topics'    && <TopicsTab />}
      {tab === 'questions' && <QuestionsTab />}
      {tab === 'concepts'  && <ConceptsTab />}
    </div>
  )
}
