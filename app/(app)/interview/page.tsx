'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuestions } from '@/features/questions/hooks/useQuestions'
import { useSubmitInterview } from '@/features/interview/hooks/useInterview'
import { AIFeedbackPanel } from '@/features/interview/components/AIFeedbackPanel'
import { VoiceInput } from '@/features/interview/components/VoiceInput'
import { DifficultyBadge } from '@/components/DifficultyBadge'
import { useSettingsStore } from '@/store/settings.store'
import { useT } from '@/lib/i18n/useT'
import type { AIEvaluation, Question } from '@/lib/supabase/types'
import { Shuffle, Send, RotateCcw, ChevronDown, ChevronUp, MessageSquarePlus, MessageSquare } from 'lucide-react'
import { readNdjsonStream } from '@/lib/api/stream'

type Phase = 'idle' | 'evaluated' | 'replica_loading' | 'replica_ready' | 'treplica_loading' | 'treplica_done'

function InterviewSimulator() {
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get('question')
  const { language } = useSettingsStore()
  const t = useT()

  const { data: questionsData } = useQuestions({})
  const questions = questionsData?.data ?? []

  const [selectedQ, setSelectedQ] = useState<Question | null>(null)
  const [answer, setAnswer] = useState('')
  const [evaluation, setEvaluation] = useState<AIEvaluation | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [showIdeal, setShowIdeal] = useState(false)

  // Réplica / Tréplica state
  const [followupQ, setFollowupQ] = useState('')
  const [followupAnswer, setFollowupAnswer] = useState('')
  const [followupEval, setFollowupEval] = useState<any>(null)

  const submit = useSubmitInterview()

  useEffect(() => {
    if (preselectedId && questions.length > 0) {
      const q = questions.find(q => q.id === preselectedId)
      if (q) setSelectedQ(q)
    }
  }, [preselectedId, questions])

  function pickRandom() {
    if (!questions.length) return
    const q = questions[Math.floor(Math.random() * questions.length)]
    resetAll()
    setSelectedQ(q)
  }

  function resetAll() {
    setAnswer('')
    setEvaluation(null)
    setPhase('idle')
    setShowIdeal(false)
    setFollowupQ('')
    setFollowupAnswer('')
    setFollowupEval(null)
  }

  function selectQuestion(id: string) {
    const q = questions.find(q => q.id === id)
    resetAll()
    setSelectedQ(q ?? null)
  }

  const handleVoiceTranscript = useCallback((text: string) => {
    setAnswer(text)
  }, [])

  async function handleEvaluate() {
    if (!selectedQ || !answer.trim()) return
    const result = await submit.mutateAsync({
      question_id: selectedQ.id,
      user_answer: answer,
      language,
    })
    setEvaluation(result)
    setPhase('evaluated')
  }

  async function handleReplica() {
    if (!evaluation || !selectedQ) return
    setPhase('replica_loading')
    try {
      const res = await fetch('/api/interview/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'replica',
          original_question: selectedQ.title,
          user_answer: answer,
          gaps: evaluation.feedback?.gaps ?? [],
          language,
        }),
      })
      if (!res.ok) { setPhase('evaluated'); return }
      const data = await readNdjsonStream<{ followup_question: string; why_this_question: string }>(res)
      setFollowupQ(data.followup_question)
      setPhase('replica_ready')
    } catch {
      setPhase('evaluated')
    }
  }

  async function handleTreplica() {
    if (!followupAnswer.trim() || !selectedQ) return
    setPhase('treplica_loading')
    try {
      const res = await fetch('/api/interview/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'treplica',
          original_question: selectedQ.title,
          followup_question: followupQ,
          followup_answer: followupAnswer,
          language,
        }),
      })
      if (!res.ok) { setPhase('replica_ready'); return }
      const data = await readNdjsonStream<typeof followupEval>(res)
      setFollowupEval(data)
      setPhase('treplica_done')
    } catch {
      setPhase('replica_ready')
    }
  }

  const langLabel = language === 'pt' ? 'Português' : 'English'
  const isEvaluated = phase !== 'idle'

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.interview.title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t.interview.subtitle(langLabel)}</p>
        </div>
        <button
          onClick={pickRandom}
          className="flex items-center gap-2 border px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors whitespace-nowrap"
        >
          <Shuffle size={14} /> {t.interview.randomQuestion}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Question + Answer */}
        <div className="space-y-4">
          {/* Question selector */}
          <div className="border rounded-xl bg-card">
            <div className="p-4 border-b">
              <label className="text-sm font-medium">{t.interview.selectQuestion}</label>
              <select
                value={selectedQ?.id ?? ''}
                onChange={e => selectQuestion(e.target.value)}
                className="mt-2 w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t.interview.choosePlaceholder}</option>
                {questions.map(q => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
            </div>

            {selectedQ && (
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <DifficultyBadge difficulty={selectedQ.difficulty} />
                  {selectedQ.is_behavioral && (
                    <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full">
                      Behavioral
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium leading-relaxed">{selectedQ.title}</p>
                {selectedQ.body && (
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedQ.body}</p>
                )}
              </div>
            )}
          </div>

          {/* Answer area */}
          <div className="border rounded-xl bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t.interview.yourAnswer}</label>
              <VoiceInput
                onTranscript={handleVoiceTranscript}
                disabled={isEvaluated}
              />
            </div>

            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              disabled={isEvaluated}
              rows={11}
              placeholder={selectedQ?.is_behavioral ? t.interview.starPlaceholder : t.interview.answerPlaceholder}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60"
            />

            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{answer.length} {t.interview.chars}</span>
              {isEvaluated ? (
                <button
                  onClick={resetAll}
                  className="flex items-center gap-2 border px-4 py-2 rounded-md text-sm hover:bg-accent transition-colors whitespace-nowrap"
                >
                  <RotateCcw size={13} /> {t.interview.tryAgain}
                </button>
              ) : (
                <button
                  onClick={handleEvaluate}
                  disabled={!selectedQ || !answer.trim() || submit.isPending}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap"
                >
                  <Send size={13} />
                  {submit.isPending ? t.interview.evaluating : t.interview.evaluate}
                </button>
              )}
            </div>

            {submit.isError && (
              <p className="text-xs text-destructive">
                {(submit.error as Error)?.message ?? 'Evaluation failed.'}
              </p>
            )}
          </div>

          {/* Réplica / Tréplica */}
          {phase === 'evaluated' && (
            <div className="border rounded-xl bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquarePlus size={16} className="text-primary" />
                  Réplica / Tréplica
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'pt'
                  ? 'Simule a réplica e tréplica da entrevista — o entrevistador faz uma pergunta de acompanhamento baseada nas suas lacunas.'
                  : 'Simulate interview follow-up rounds — the interviewer challenges you based on your gaps.'}
              </p>
              <button
                onClick={handleReplica}
                className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary border border-primary/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                <MessageSquarePlus size={14} />
                {t.interview.replicaBtn}
              </button>
            </div>
          )}

          {phase === 'replica_loading' && (
            <div className="border rounded-xl bg-card p-6 flex items-center justify-center gap-3 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">{t.interview.replicaLoading}</span>
            </div>
          )}

          {(phase === 'replica_ready' || phase === 'treplica_loading' || phase === 'treplica_done') && followupQ && (
            <div className="border rounded-xl bg-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare size={15} className="text-primary" />
                {t.interview.replicaTitle}
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-sm font-medium leading-relaxed">{followupQ}</p>
              </div>

              {phase !== 'treplica_done' && (
                <>
                  <textarea
                    value={followupAnswer}
                    onChange={e => setFollowupAnswer(e.target.value)}
                    disabled={phase === 'treplica_loading'}
                    rows={5}
                    placeholder={t.interview.treplicaPlaceholder}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60"
                  />
                  <button
                    onClick={handleTreplica}
                    disabled={!followupAnswer.trim() || phase === 'treplica_loading'}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    <Send size={13} />
                    {phase === 'treplica_loading' ? t.interview.evaluating : t.interview.treplicaBtn}
                  </button>
                </>
              )}

              {phase === 'treplica_done' && followupEval && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{t.interview.treplicaEvalTitle}</span>
                    <span className={`text-lg font-bold tabular-nums ${Number(followupEval.score) >= 75 ? 'text-green-600' : Number(followupEval.score) >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {Number(followupEval.score)}/100
                    </span>
                  </div>
                  {followupEval.verdict && (
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-sm font-medium leading-relaxed">{followupEval.verdict}</p>
                    </div>
                  )}
                  {followupEval.improvement && (
                    <p className="text-xs text-muted-foreground italic">{followupEval.improvement}</p>
                  )}
                  {followupEval.strengths?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                        {t.interview.strengths}
                      </p>
                      <ul className="space-y-1">
                        {followupEval.strengths.map((s: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                            <span className="text-green-500">•</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {followupEval.gaps?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-1">
                        {t.interview.gaps}
                      </p>
                      <ul className="space-y-1">
                        {followupEval.gaps.map((g: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                            <span className="text-yellow-500">•</span>{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Feedback + Ideal answer */}
        <div className="space-y-4">
          {/* AI Feedback */}
          <div className="border rounded-xl bg-card p-5 min-h-[300px]">
            {evaluation ? (
              evaluation.model_used === 'none' ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-8">
                  <div className="w-14 h-14 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-2xl">⚠️</div>
                  <div>
                    <p className="text-sm font-medium">{t.interview.noApiKey}</p>
                    <a href="https://console.groq.com" target="_blank" rel="noreferrer"
                      className="text-xs text-primary hover:underline mt-1 inline-block">
                      {t.interview.groqLink}
                    </a>
                  </div>
                </div>
              ) : (
                <AIFeedbackPanel evaluation={evaluation} title={t.interview.feedbackTitle} />
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl">🤖</div>
                <p className="text-sm font-medium">{t.interview.emptyTitle}</p>
                <p className="text-xs text-muted-foreground max-w-xs">{t.interview.emptyDesc}</p>
              </div>
            )}
          </div>

          {/* Ideal answer — show after evaluation */}
          {isEvaluated && selectedQ?.ideal_answer && (
            <div className="border rounded-xl bg-card overflow-hidden">
              <button
                onClick={() => setShowIdeal(s => !s)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-accent transition-colors text-left"
              >
                <span className="text-sm font-semibold">{t.interview.idealAnswer}</span>
                {showIdeal ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
              </button>
              {showIdeal && (
                <div className="border-t px-5 py-4 bg-muted/20">
                  <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{selectedQ.ideal_answer}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 bg-muted rounded-xl" />}>
      <InterviewSimulator />
    </Suspense>
  )
}
