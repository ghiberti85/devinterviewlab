'use client'

import { useState, useEffect, useRef } from 'react'
import { useT } from '@/lib/i18n/useT'
import { useSettingsStore } from '@/store/settings.store'
import { BookMarked, CheckCircle, RotateCcw, Loader2, HelpCircle, BookOpen } from 'lucide-react'

// Flashcard practice
import { usePracticeQuestions, useSubmitSession } from '@/features/practice/hooks/usePractice'
import { Flashcard } from '@/features/practice/components/Flashcard'
import { useSessionStore } from '@/store/session.store'
import type { SessionType } from '@/lib/supabase/types'

// Flash Topics
import { useTopics, useGenerateTopic, useDeleteTopic, useBulkDeleteTopics } from '@/features/topics/hooks/useTopics'
import { TopicCard } from '@/features/topics/components/TopicCard'
import { TopicGenerator } from '@/features/topics/components/TopicGenerator'
// Roadmap questions
import { useRoadmaps } from '@/features/roadmaps/hooks/useRoadmaps'
import { useRoadmapQuestions, useBulkDeleteRoadmapQuestions, useGenerateTopicQuestions } from '@/features/roadmaps/hooks/useRoadmapQuestions'

type Tab = 'topics' | 'flashcards' | 'questions'
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

function useLongPress(onLongPress: () => void, ms = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function start() { timerRef.current = setTimeout(onLongPress, ms) }
  function cancel() { if (timerRef.current) clearTimeout(timerRef.current) }
  return { onTouchStart: start, onTouchEnd: cancel, onTouchMove: cancel }
}

function TopicsTab() {
  const t = useT()
  const { language } = useSettingsStore()
  const { data: pairs, isLoading } = useTopics(language as string)
  const deleteTopic = useDeleteTopic()
  const bulkDelete = useBulkDeleteTopics()
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggleSelect(rootId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(rootId) ? next.delete(rootId) : next.add(rootId)
      return next
    })
  }

  function toggleSelectAll() {
    if (!pairs) return
    if (selected.size === pairs.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(pairs.map(p => p.rootId)))
    }
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelected(new Set())
  }

  async function handleBulkDelete() {
    if (!pairs) return
    const ids = pairs
      .filter(p => selected.has(p.rootId))
      .flatMap(p => [p.current?.id, p.other?.id].filter((id): id is string => !!id))
    if (ids.length === 0) return
    await bulkDelete.mutateAsync({ ids })
    exitSelectMode()
  }

  return (
    <div className="space-y-4">
      <TopicGenerator />

      {!isLoading && pairs && pairs.length > 0 && (
        <div className="flex items-center justify-end gap-3 flex-wrap">
          {selectMode ? (
            <>
              <label className="hidden sm:flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.size === pairs.length}
                  onChange={toggleSelectAll}
                />
                {t.review.selectAll}
              </label>
              <button
                onClick={handleBulkDelete}
                disabled={selected.size === 0 || bulkDelete.isPending}
                className="flex items-center gap-1.5 text-xs bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors min-h-[36px]"
              >
                {bulkDelete.isPending
                  ? <><Loader2 size={11} className="animate-spin mr-1" />{t.review.bulkDeleting}</>
                  : t.review.deleteSelected(selected.size)}
              </button>
              <button
                onClick={exitSelectMode}
                className="flex items-center gap-1.5 text-xs border px-3 py-2 rounded-md hover:bg-accent transition-colors min-h-[36px]"
              >
                {t.review.cancelSelect}
              </button>
            </>
          ) : (
            <button
              onClick={() => setSelectMode(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs border px-3 py-2 rounded-md hover:bg-accent transition-colors min-h-[36px]"
            >
              {t.review.selectMode}
            </button>
          )}
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
          {pairs.map(pair => (
            <TopicCardWithSelect
              key={pair.rootId}
              pair={pair}
              selectMode={selectMode}
              selected={selected.has(pair.rootId)}
              onToggle={() => toggleSelect(pair.rootId)}
              onEnterSelectMode={() => setSelectMode(true)}
              onDelete={() => {
                const ids = [pair.current?.id, pair.other?.id].filter((id): id is string => !!id)
                ids.forEach(id => deleteTopic.mutate({ id }))
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TopicCardWithSelect({
  pair, selectMode, selected, onToggle, onEnterSelectMode, onDelete
}: {
  pair: import('@/lib/supabase/types').TopicPair
  selectMode: boolean
  selected: boolean
  onToggle: () => void
  onEnterSelectMode: () => void
  onDelete: () => void
}) {
  const longPress = useLongPress(() => {
    onEnterSelectMode()
    onToggle()
  })

  return (
    <div
      className={`relative select-none ${selectMode ? 'cursor-pointer' : ''} ${selected ? 'ring-2 ring-primary rounded-lg' : ''}`}
      onClick={selectMode ? onToggle : undefined}
      {...(!selectMode ? longPress : {})}
    >
      {selectMode && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            onClick={e => e.stopPropagation()}
            className="w-4 h-4"
          />
        </div>
      )}
      <TopicCard pair={pair} />
    </div>
  )
}

function LiveCodingAnswer({ answer }: { answer: string }) {
  const t = useT()
  const codeMatch = answer.match(/```[\w]*\n?([\s\S]*?)```/)
  const code = codeMatch ? codeMatch[1].trim() : null
  const afterCode = codeMatch ? answer.slice(answer.indexOf(codeMatch[0]) + codeMatch[0].length).trim() : answer

  const explanationMatch = afterCode.match(/\*\*Explanation[:\s]?\*\*\s*([\s\S]*?)(?=\*\*Alternative|$)/i)
  const alternativesMatch = afterCode.match(/\*\*Alternative approaches[:\s]?\*\*\s*([\s\S]*?)$/i)

  const explanation = explanationMatch ? explanationMatch[1].trim() : null
  const alternatives = alternativesMatch ? alternativesMatch[1].trim() : null
  const fallback = !code && !explanation && !alternatives ? answer : null

  return (
    <div className="space-y-2">
      {code && (
        <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre">
          {code}
        </pre>
      )}
      {explanation && (
        <div className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">{t.roadmap.liveCodingAnswer}: </span>
          {explanation}
        </div>
      )}
      {alternatives && (
        <div className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">{t.roadmap.alternativeApproaches}: </span>
          {alternatives}
        </div>
      )}
      {fallback && (
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{fallback}</div>
      )}
    </div>
  )
}

function QuestionCard({
  q, open, topicLoading, topicDone, selectMode, selected, topicAlreadyExists,
  onToggleAnswer, onToggleSelect, onEnterSelectMode, onGenerateTopic,
}: {
  q: { id: string; topic_name: string; question: string; answer: string; phase_name: string; question_type?: string }
  open: boolean
  topicLoading: boolean
  topicDone: boolean
  selectMode: boolean
  selected: boolean
  topicAlreadyExists: boolean
  onToggleAnswer: () => void
  onToggleSelect: () => void
  onEnterSelectMode: () => void
  onGenerateTopic: () => void
}) {
  const t = useT()
  const longPress = useLongPress(onEnterSelectMode)
  const isLiveCoding = q.question_type === 'live_coding'

  return (
    <div
      className={`border rounded-xl p-4 bg-card space-y-2 select-none ${selectMode ? 'cursor-pointer' : ''}`}
      onClick={selectMode ? onToggleSelect : undefined}
      {...(!selectMode ? longPress : {})}
    >
      <div className="flex items-start justify-between gap-2">
        {selectMode && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            onClick={e => e.stopPropagation()}
            className="w-4 h-4 mt-1 shrink-0"
          />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-muted-foreground">{q.topic_name}</p>
            {isLiveCoding && (
              <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">
                {t.roadmap.liveCoding}
              </span>
            )}
          </div>
          <p className="text-sm font-medium leading-snug">{q.question}</p>
        </div>
        {!selectMode && (
          <button
            onClick={onToggleAnswer}
            className="text-xs text-primary hover:underline mt-1 shrink-0"
          >
            {open ? t.review.hideAnswer : t.review.showAnswer}
          </button>
        )}
      </div>
      {open && !selectMode && (
        <div className="bg-muted/40 rounded-lg p-3">
          {isLiveCoding
            ? <LiveCodingAnswer answer={q.answer} />
            : <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{q.answer}</div>
          }
        </div>
      )}
      {!selectMode && (
        <div className="flex gap-2 pt-1 border-t flex-wrap">
          {topicAlreadyExists || topicDone ? (
            <span className="flex items-center gap-1 text-[10px] text-green-600">
              <CheckCircle size={10} />{t.review.topicAlreadyGenerated}
            </span>
          ) : (
            <button
              onClick={onGenerateTopic}
              disabled={topicLoading}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
            >
              {topicLoading
                ? <><Loader2 size={10} className="animate-spin" />{t.roadmap.generatingTopic}</>
                : <><BookOpen size={10} />{t.review.generateTopicFromQ}</>}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function QuestionsTab() {
  const t = useT()
  const { language } = useSettingsStore()
  const { data: roadmaps, isLoading: roadmapsLoading } = useRoadmaps()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [actionStates, setActionStates] = useState<Record<string, string>>({})
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const allRoadmaps = roadmaps ?? []
  const currentId = selectedId ?? allRoadmaps[0]?.id ?? null
  const { data: questions, isLoading: qLoading } = useRoadmapQuestions(currentId)
  const bulkDelete = useBulkDeleteRoadmapQuestions(currentId ?? '')
  const generateMore = useGenerateTopicQuestions(currentId ?? '')
  const generateTopic = useGenerateTopic()

  const { data: topicPairs } = useTopics(language as string)
  const existingTopicNames = new Set(
    (topicPairs ?? []).map(p => p.current?.title?.toLowerCase()).filter(Boolean) as string[]
  )

  const topics = questions
    ? Array.from(new Set(questions.map(q => q.topic_name)))
    : []

  const filtered = questions
    ? (selectedTopic === 'all' ? questions : questions.filter(q => q.topic_name === selectedTopic))
        .filter(q => q.language === language)
    : []

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(q => q.id)))
    }
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelected(new Set())
  }

  async function handleBulkDelete() {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    await bulkDelete.mutateAsync({ ids })
    exitSelectMode()
  }

  function toggleAnswer(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function setAction(id: string, state: string) {
    setActionStates(prev => ({ ...prev, [id]: state }))
  }

  async function handleGenerateTopic(q: { id: string; topic_name: string; answer: string }) {
    setAction(q.id + '-topic', 'loading')
    try {
      await generateTopic.mutateAsync({
        topicName: q.topic_name,
        difficulty: 'medium',
        language: language as string,
      })
      setAction(q.id + '-topic', 'done')
      setTimeout(() => setAction(q.id + '-topic', ''), 2000)
    } catch {
      setAction(q.id + '-topic', '')
    }
  }

  async function handleGenerateMoreForTopic(topicName: string, phaseName: string) {
    await generateMore.mutateAsync({ topicName, phaseName })
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

      {/* Bulk select controls */}
      {!qLoading && filtered.length > 0 && (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {selectedTopic !== 'all' && (
            <button
              onClick={() => {
                const phaseName = filtered[0]?.phase_name ?? ''
                handleGenerateMoreForTopic(selectedTopic, phaseName)
              }}
              disabled={generateMore.isPending}
              className="text-xs text-primary hover:underline disabled:opacity-50 flex items-center gap-1 mr-auto"
            >
              {generateMore.isPending ? <><Loader2 size={10} className="animate-spin" />{t.roadmap.generatingQuestions}</> : t.roadmap.generateQuestions}
            </button>
          )}
          {selectMode ? (
            <>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                />
                {t.review.selectAll}
              </label>
              <button
                onClick={handleBulkDelete}
                disabled={selected.size === 0 || bulkDelete.isPending}
                className="flex items-center gap-1.5 text-xs bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors min-h-[36px]"
              >
                {bulkDelete.isPending ? <><Loader2 size={11} className="animate-spin mr-1" />{t.review.bulkDeleting}</> : t.review.deleteSelected(selected.size)}
              </button>
              <button
                onClick={exitSelectMode}
                className="flex items-center gap-1.5 text-xs border px-3 py-2 rounded-md hover:bg-accent transition-colors min-h-[36px]"
              >
                {t.review.cancelSelect}
              </button>
            </>
          ) : null}
        </div>
      )}

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
          {filtered.map(q => (
            <QuestionCard
              key={q.id}
              q={q}
              open={expandedIds.has(q.id)}
              topicLoading={actionStates[q.id + '-topic'] === 'loading'}
              topicDone={actionStates[q.id + '-topic'] === 'done'}
              selectMode={selectMode}
              selected={selected.has(q.id)}
              topicAlreadyExists={existingTopicNames.has(q.topic_name.toLowerCase())}
              onToggleAnswer={() => toggleAnswer(q.id)}
              onToggleSelect={() => toggleSelect(q.id)}
              onEnterSelectMode={() => { setSelectMode(true); toggleSelect(q.id) }}
              onGenerateTopic={() => handleGenerateTopic(q)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function RevisarPage() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('questions')

  const tabs = [
    { id: 'questions' as Tab, icon: HelpCircle, label: t.review.questionsTab },
    { id: 'topics'    as Tab, icon: BookMarked, label: t.review.topicsTab },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t.nav.review}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.review.subtitle}</p>
      </div>

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
    </div>
  )
}
