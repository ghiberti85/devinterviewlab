'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageSquare, Code2, ChevronRight, Clock, BookMarked, Map, Mic, MicOff } from 'lucide-react'
import { useT } from '@/lib/i18n/useT'
import { useEvaluations } from '@/features/evaluations/hooks/useEvaluations'
import { useCodingSessions } from '@/features/live-coding/hooks/useLiveCoding'
import { useRoadmaps } from '@/features/roadmaps/hooks/useRoadmaps'
import { useRoadmapQuestions } from '@/features/roadmaps/hooks/useRoadmapQuestions'
import { useSettingsStore } from '@/store/settings.store'
import type { RoadmapQuestion } from '@/lib/supabase/types'

// ---- Roadmap Practice subflow ----

type PracticeStep = 'list' | 'study' | 'answer' | 'result'

interface PracticeResult {
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
}

function RoadmapPracticeSection() {
  const t = useT()
  const { language } = useSettingsStore()
  const { data: roadmaps } = useRoadmaps()
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string>('all')
  const [step, setStep] = useState<PracticeStep>('list')
  const [currentQ, setCurrentQ] = useState<RoadmapQuestion | null>(null)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<PracticeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [micAvailable, setMicAvailable] = useState<boolean | null>(null)
  const [recording, setRecording] = useState(false)

  const allRoadmaps = roadmaps ?? []
  const currentId = selectedRoadmapId ?? allRoadmaps[0]?.id ?? null
  const { data: questions } = useRoadmapQuestions(currentId)

  const topics = questions
    ? Array.from(new Set(questions.filter(q => q.language === language).map(q => q.topic_name)))
    : []
  const filtered = questions
    ? (selectedTopic === 'all' ? questions : questions.filter(q => q.topic_name === selectedTopic))
        .filter(q => q.language === language)
    : []

  async function handleSubmitAnswer() {
    if (!currentQ || !answer.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          ideal_answer: currentQ.answer,
          user_answer: answer,
          language,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult({
          score: data.score ?? 0,
          feedback: data.feedback?.suggestions?.join(' ') ?? '',
          strengths: data.feedback?.strengths ?? [],
          improvements: data.feedback?.gaps ?? [],
        })
      } else {
        setResult({ score: 0, feedback: 'Could not evaluate answer.', strengths: [], improvements: [] })
      }
    } catch {
      setResult({ score: 0, feedback: 'Could not evaluate answer.', strengths: [], improvements: [] })
    }
    setLoading(false)
    setStep('result')
  }

  function startVoiceInput() {
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      setMicAvailable(false)
      return
    }
    setMicAvailable(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SpeechRecognitionAPI() as any
    recognition.lang = language === 'pt' ? 'pt-BR' : 'en-US'
    recognition.continuous = true
    recognition.interimResults = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(event.results as any[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript as string)
        .join(' ')
      setAnswer(prev => prev ? prev + ' ' + transcript : transcript)
    }
    recognition.onend = () => setRecording(false)
    recognition.start()
    setRecording(true)
  }

  if (allRoadmaps.length === 0) return null

  // Step: List
  if (step === 'list') {
    return (
      <div className="border rounded-xl p-5 bg-card space-y-4">
        <div className="flex items-center gap-2">
          <Map size={16} className="text-primary" />
          <h2 className="font-semibold text-sm">{t.simulate.roadmapPractice}</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={currentId ?? ''}
            onChange={e => { setSelectedRoadmapId(e.target.value); setSelectedTopic('all') }}
            className="text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary flex-1 max-w-xs"
          >
            {allRoadmaps.map(r => (
              <option key={r.id} value={r.id}>
                {r.job_title ?? 'Roadmap'} — {new Date(r.created_at).toLocaleDateString()}
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

        {filtered.length > 0 ? (
          <div className="divide-y max-h-72 overflow-y-auto">
            {filtered.map(q => (
              <button
                key={q.id}
                onClick={() => { setCurrentQ(q); setAnswer(''); setResult(null); setStep('study') }}
                className="flex items-start gap-3 w-full text-left py-3 px-1 hover:bg-accent/50 rounded-md transition-colors group"
              >
                <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-medium">{q.topic_name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{q.question}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">{t.roadmap.noQuestions}</p>
        )}
      </div>
    )
  }

  // Step: Study (show Q+A, then ready)
  if (step === 'study' && currentQ) {
    return (
      <div className="border rounded-xl p-5 bg-card space-y-4">
        <button onClick={() => setStep('list')} className="text-xs text-muted-foreground hover:text-foreground">
          ← {t.simulate.backToList}
        </button>
        <div>
          <p className="text-xs text-primary font-medium mb-1">{t.simulate.studyMode}</p>
          <h2 className="font-semibold text-base mb-3">{currentQ.question}</h2>
          <div className="bg-muted/40 rounded-lg p-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {currentQ.answer}
          </div>
        </div>
        <button
          onClick={() => setStep('answer')}
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {t.simulate.readyBtn}
        </button>
      </div>
    )
  }

  // Step: Answer
  if (step === 'answer' && currentQ) {
    return (
      <div className="border rounded-xl p-5 bg-card space-y-4">
        <button onClick={() => setStep('study')} className="text-xs text-muted-foreground hover:text-foreground">
          ← {t.simulate.studyMode}
        </button>
        <div>
          <p className="text-xs text-primary font-medium mb-1">{t.simulate.practiceMode}</p>
          <h2 className="font-semibold text-base">{currentQ.question}</h2>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">{t.simulate.yourAnswer}</label>
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder={t.simulate.typeAnswer}
            rows={6}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            {micAvailable === false ? (
              <p className="text-xs text-muted-foreground">{t.simulate.micNotAvailable}</p>
            ) : (
              <button
                type="button"
                onClick={startVoiceInput}
                disabled={recording}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 border rounded-md px-3 py-1.5"
              >
                {recording ? <MicOff size={12} /> : <Mic size={12} />}
                {recording ? t.simulate.micStop : t.simulate.micStart}
              </button>
            )}
            <button
              onClick={handleSubmitAnswer}
              disabled={loading || !answer.trim()}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? t.simulate.evaluating : t.simulate.submitAnswer}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Step: Result
  if (step === 'result' && currentQ && result) {
    return (
      <div className="border rounded-xl p-5 bg-card space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-primary font-medium">{t.simulate.feedback}</p>
          <span className={`text-lg font-bold tabular-nums ${result.score >= 75 ? 'text-green-600' : result.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
            {result.score}/100
          </span>
        </div>

        {result.strengths.length > 0 && (
          <div>
            <p className="text-xs font-medium text-green-600 mb-1">{t.simulate.strengths}</p>
            <ul className="space-y-1">
              {result.strengths.map((s, i) => <li key={i} className="text-sm text-muted-foreground">• {s}</li>)}
            </ul>
          </div>
        )}

        {result.improvements.length > 0 && (
          <div>
            <p className="text-xs font-medium text-red-500 mb-1">{t.simulate.improvements}</p>
            <ul className="space-y-1">
              {result.improvements.map((s, i) => <li key={i} className="text-sm text-muted-foreground">• {s}</li>)}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => { setAnswer(''); setStep('answer') }}
            className="flex-1 border rounded-lg py-2 text-sm hover:bg-accent transition-colors"
          >
            {t.simulate.tryAgain}
          </button>
          <button
            onClick={() => setStep('list')}
            className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {t.simulate.nextQuestion}
          </button>
        </div>
      </div>
    )
  }

  return null
}

// ---- Main page ----

export default function SimularPage() {
  const t = useT()
  const { language } = useSettingsStore()
  const { data: evalPages } = useEvaluations(1)
  const { data: sessions } = useCodingSessions()

  const recentEvals = evalPages?.data?.slice(0, 3) ?? []
  const recentSessions = sessions?.slice(0, 3) ?? []

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">{t.nav.simulate}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.simulate.subtitle}</p>
      </div>

      {/* Roadmap Practice */}
      <RoadmapPracticeSection />

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/interview" className="group border rounded-xl p-5 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <MessageSquare size={20} className="text-primary" />
            </div>
            <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors mt-1" />
          </div>
          <h2 className="font-semibold text-sm mb-1">{t.simulate.interviewTitle}</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">{t.simulate.interviewDesc}</p>
        </Link>

        <Link href="/live-coding" className="group border rounded-xl p-5 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-green-500/10">
              <Code2 size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors mt-1" />
          </div>
          <h2 className="font-semibold text-sm mb-1">{t.simulate.codingTitle}</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">{t.simulate.codingDesc}</p>
        </Link>
      </div>

      {/* Recent interviews */}
      {recentEvals.length > 0 && (
        <div className="border rounded-xl p-5 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">{t.simulate.recentInterviews}</h2>
            <Link href="/history" className="text-xs text-primary hover:underline">{t.simulate.viewAll}</Link>
          </div>
          <div className="divide-y">
            {recentEvals.map((e: { id: string; questions?: { title: string } | null; score: number; created_at: string }) => (
              <Link key={e.id} href={`/history/${e.id}`} className="flex items-center justify-between min-h-[44px] py-2 hover:bg-accent/50 -mx-2 px-2 rounded-md transition-colors">
                <span className="text-sm truncate flex-1 text-muted-foreground pr-3">{e.questions?.title ?? '—'}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium tabular-nums ${e.score >= 75 ? 'text-green-600' : e.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {Math.round(e.score)}/100
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(e.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent coding sessions */}
      {recentSessions.length > 0 && (
        <div className="border rounded-xl p-5 bg-card space-y-3">
          <h2 className="text-sm font-medium">{t.simulate.recentCoding}</h2>
          <div className="divide-y">
            {recentSessions.map((s: { id: string; problem_title: string; language: string; score: number | null; created_at: string }) => (
              <div key={s.id} className="flex items-center justify-between min-h-[44px] py-2">
                <span className="text-sm truncate flex-1 text-muted-foreground pr-3">{s.problem_title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:block">{s.language}</span>
                  {s.score !== null && (
                    <span className={`text-xs font-medium tabular-nums ${s.score >= 75 ? 'text-green-600' : s.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {s.score}/100
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
