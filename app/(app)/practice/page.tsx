'use client'

import { useState, useEffect, useRef } from 'react'
import { usePracticeQuestions, useSubmitSession } from '@/features/practice/hooks/usePractice'
import { Flashcard } from '@/features/practice/components/Flashcard'
import { useSessionStore } from '@/store/session.store'
import { useT } from '@/lib/i18n/useT'
import { CheckCircle, RotateCcw } from 'lucide-react'
import type { SessionType } from '@/lib/supabase/types'

type Mode = 'random' | 'spaced'

export default function PracticePage() {
  const t = useT()
  const [mode, setMode] = useState<Mode>('random')
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [sessionResults, setSessionResults] = useState<{ conf: number }[]>([])

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
    await submit.mutateAsync({
      question_id: q.id,
      session_type: 'flashcard' as SessionType,
      confidence,
      duration_sec: elapsedSec,
    })
    setSessionResults(prev => [...prev, { conf: confidence }])
    if (index + 1 >= questions.length) {
      setDone(true)
      if (timerRef.current) clearInterval(timerRef.current)
    } else {
      setIndex(i => i + 1)
    }
  }

  function handleStart() {
    setStarted(true); setIndex(0); setDone(false); setSessionResults([])
    startSession('flashcard')
  }

  function handleRestart() {
    reset(); refetch()
    setStarted(false); setIndex(0); setDone(false); setSessionResults([])
  }

  const currentQ = questions?.[index]
  const avgConf = sessionResults.length
    ? (sessionResults.reduce((a, b) => a + b.conf, 0) / sessionResults.length).toFixed(1)
    : '–'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t.practice.title}</h1>
        {started && !done && (
          <div className="text-sm text-muted-foreground tabular-nums">
            {Math.floor(elapsedSec / 60).toString().padStart(2, '0')}:{(elapsedSec % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>

      {!started ? (
        <div className="max-w-md mx-auto space-y-6 py-8">
          <div className="border rounded-xl p-6 bg-card space-y-5">
            <h2 className="font-semibold">{t.practice.mode}</h2>
            <div className="space-y-2">
              {([
                { value: 'random', label: t.practice.random, desc: t.practice.randomDesc },
                { value: 'spaced', label: t.practice.spaced, desc: t.practice.spacedDesc },
              ] as const).map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    mode === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                  }`}
                >
                  <input
                    type="radio" name="mode" value={opt.value}
                    checked={mode === opt.value} onChange={() => setMode(opt.value)}
                    className="mt-0.5"
                  />
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
              {isLoading ? t.practice.loading
                : questions?.length === 0 ? t.practice.noQuestions
                : t.practice.questionsCount(questions.length)}
            </button>
          </div>
        </div>
      ) : done ? (
        <div className="max-w-md mx-auto py-8 space-y-5">
          <div className="border rounded-xl p-8 bg-card text-center space-y-4">
            <CheckCircle size={40} className="text-green-500 mx-auto" />
            <h2 className="text-lg font-semibold">{t.practice.doneTitle}</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold">{sessionResults.length}</div>
                <div className="text-xs text-muted-foreground">{t.practice.cardsReviewed}</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{avgConf}</div>
                <div className="text-xs text-muted-foreground">{t.practice.avgConfidence}</div>
              </div>
              <div>
                <div className="text-xl font-bold tabular-nums">
                  {Math.floor(elapsedSec / 60)}m {elapsedSec % 60}s
                </div>
                <div className="text-xs text-muted-foreground">{t.practice.timeSpent}</div>
              </div>
            </div>
          </div>
          <button
            onClick={handleRestart}
            className="w-full flex items-center justify-center gap-2 border rounded-lg py-2.5 text-sm hover:bg-accent transition-colors"
          >
            <RotateCcw size={14} /> {t.practice.newSession}
          </button>
        </div>
      ) : currentQ ? (
        <div className="py-2">
          <div className="w-full h-1 bg-muted rounded-full mb-6">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(index / (questions?.length ?? 1)) * 100}%` }}
            />
          </div>
          <Flashcard
            question={currentQ}
            index={index}
            total={questions?.length ?? 0}
            onRate={handleRate}
            isSubmitting={submit.isPending}
          />
        </div>
      ) : null}
    </div>
  )
}
