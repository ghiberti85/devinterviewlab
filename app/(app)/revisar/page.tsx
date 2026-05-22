'use client'

import { useState, useEffect, useRef } from 'react'
import { useT } from '@/lib/i18n/useT'
import { useSettingsStore } from '@/store/settings.store'
import { Layers, BookMarked, CheckCircle, RotateCcw, Loader2 } from 'lucide-react'

// Flashcard practice
import { usePracticeQuestions, useSubmitSession } from '@/features/practice/hooks/usePractice'
import { Flashcard } from '@/features/practice/components/Flashcard'
import { useSessionStore } from '@/store/session.store'
import type { SessionType } from '@/lib/supabase/types'

// Flash Topics
import { useTopics, useGenerateTopic, useTranslateTopic, useDeleteTopic } from '@/features/topics/hooks/useTopics'
import { TopicCard } from '@/features/topics/components/TopicCard'
import { TopicGenerator } from '@/features/topics/components/TopicGenerator'

type Tab = 'flashcards' | 'topics'
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
        <Flashcard question={currentQ} index={index} total={questions?.length ?? 0} onRate={handleRate} isSubmitting={submit.isPending} />
      )}
    </div>
  )
}

function TopicsTab() {
  const t = useT()
  const { language } = useSettingsStore()
  const { data: pairs, isLoading } = useTopics(language as string)

  return (
    <div className="space-y-4">
      <TopicGenerator />
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

export default function RevisarPage() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('flashcards')

  const tabs = [
    { id: 'flashcards' as Tab, icon: Layers, label: t.review.flashcards },
    { id: 'topics' as Tab, icon: BookMarked, label: t.review.topics },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t.nav.review}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.review.subtitle}</p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'flashcards' ? <FlashcardsTab /> : <TopicsTab />}
    </div>
  )
}
