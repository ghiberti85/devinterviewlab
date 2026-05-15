'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useSubmitCode, useCodingSessions } from '@/features/live-coding/hooks/useLiveCoding'
import { useSettingsStore } from '@/store/settings.store'
import { useT } from '@/lib/i18n/useT'
import type { CodeEvaluationFeedback } from '@/lib/supabase/types'
import { Timer, Play, Square, Send, RotateCcw, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react'

// Monaco Editor loads only on client (no SSR)
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

const TIMER_OPTIONS = [15, 30, 45] as const
type TimerOption = typeof TIMER_OPTIONS[number]

const CODING_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'rust',
] as const

const SAMPLE_PROBLEMS = [
  {
    title: 'Two Sum',
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nExample:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]',
  },
  {
    title: 'Valid Parentheses',
    description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n- Open brackets must be closed by the same type of brackets.\n- Open brackets must be closed in the correct order.\n\nExample:\nInput: s = "()[]{}" → Output: true\nInput: s = "(]" → Output: false',
  },
  {
    title: 'Reverse Linked List',
    description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.\n\nExample:\nInput: head = [1,2,3,4,5]\nOutput: [5,4,3,2,1]',
  },
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 75 ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500'
  return (
    <div className={`text-4xl font-bold tabular-nums ${color}`}>
      {score}<span className="text-lg text-muted-foreground">/100</span>
    </div>
  )
}

export default function LiveCodingPage() {
  const t = useT()
  const lc = t.liveCoding
  const { language: uiLanguage } = useSettingsStore()
  const submit = useSubmitCode()
  const { data: sessions } = useCodingSessions()

  // Problem state
  const [problemTitle, setProblemTitle] = useState(SAMPLE_PROBLEMS[0].title)
  const [problemDesc, setProblemDesc] = useState(SAMPLE_PROBLEMS[0].description)
  const [customProblem, setCustomProblem] = useState(false)

  // Code state
  const [code, setCode] = useState('')
  const [codingLang, setCodingLang] = useState<string>('javascript')

  // Timer state
  const [timerDuration, setTimerDuration] = useState<TimerOption>(30)
  const [timeLeft, setTimeLeft] = useState(30 * 60)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerStarted, setTimerStarted] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeSpentRef = useRef(0)

  // Result state
  const [evaluation, setEvaluation] = useState<{ score: number; feedback: CodeEvaluationFeedback } | null>(null)

  // Timer logic
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            setTimerRunning(false)
            return 0
          }
          timeSpentRef.current++
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerRunning])

  function startTimer() {
    setTimeLeft(timerDuration * 60)
    timeSpentRef.current = 0
    setTimerRunning(true)
    setTimerStarted(true)
    setEvaluation(null)
  }

  function stopTimer() {
    setTimerRunning(false)
  }

  function selectProblem(idx: number) {
    setProblemTitle(SAMPLE_PROBLEMS[idx].title)
    setProblemDesc(SAMPLE_PROBLEMS[idx].description)
    setCustomProblem(false)
    setCode('')
    setEvaluation(null)
    setTimerRunning(false)
    setTimerStarted(false)
    setTimeLeft(timerDuration * 60)
  }

  function resetAll() {
    setCode('')
    setEvaluation(null)
    setTimerRunning(false)
    setTimerStarted(false)
    setTimeLeft(timerDuration * 60)
    timeSpentRef.current = 0
  }

  const handleSubmit = useCallback(async () => {
    if (!code.trim()) return
    stopTimer()
    try {
      const result = await submit.mutateAsync({
        problem_title: problemTitle,
        problem_description: problemDesc,
        language: codingLang,
        code,
        time_spent_sec: timeSpentRef.current,
        timer_duration_sec: timerDuration * 60,
        ui_language: uiLanguage,
      })
      setEvaluation(result.evaluation)
    } catch { /* error shown via submit.error */ }
  }, [code, problemTitle, problemDesc, codingLang, timerDuration, uiLanguage, submit])

  const timerColor = timeLeft < 60 ? 'text-red-500' : timeLeft < 5 * 60 ? 'text-yellow-500' : 'text-foreground'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">{lc.title}</h1>
          <p className="text-sm text-muted-foreground">{lc.subtitle}</p>
        </div>
        {evaluation && (
          <button onClick={resetAll} className="text-sm border px-3 py-1.5 rounded-md hover:bg-accent transition-colors flex items-center gap-2">
            <RotateCcw size={14} /> {lc.newChallenge}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column — problem + settings */}
        <div className="space-y-4">
          {/* Problem selector */}
          <div className="border rounded-xl p-4 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-sm">{lc.problem}</h2>
              <button
                onClick={() => { setCustomProblem(true); setProblemTitle(''); setProblemDesc('') }}
                className="text-xs text-primary hover:underline"
              >
                {lc.customProblem}
              </button>
            </div>

            {!customProblem ? (
              <div className="space-y-1">
                {SAMPLE_PROBLEMS.map((p, i) => (
                  <button
                    key={p.title}
                    onClick={() => selectProblem(i)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${
                      problemTitle === p.title ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'
                    }`}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  value={problemTitle}
                  onChange={e => setProblemTitle(e.target.value)}
                  placeholder="Problem title…"
                  className="w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <textarea
                  value={problemDesc}
                  onChange={e => setProblemDesc(e.target.value)}
                  placeholder={lc.problemPlaceholder}
                  rows={5}
                  className="w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            )}
          </div>

          {/* Problem description (when using preset) */}
          {!customProblem && problemDesc && (
            <div className="border rounded-xl p-4 bg-card">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{problemDesc}</p>
            </div>
          )}

          {/* Timer + language settings */}
          <div className="border rounded-xl p-4 bg-card space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                {lc.language}
              </label>
              <select
                value={codingLang}
                onChange={e => setCodingLang(e.target.value)}
                disabled={timerStarted}
                className="w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none disabled:opacity-50"
              >
                {CODING_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                {lc.timer}
              </label>
              <div className="flex gap-2">
                {TIMER_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    disabled={timerStarted}
                    onClick={() => { setTimerDuration(opt); setTimeLeft(opt * 60) }}
                    className={`flex-1 text-sm py-1.5 rounded-md border transition-colors disabled:opacity-50 ${
                      timerDuration === opt ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
                    }`}
                  >
                    {lc.timerOptions[opt]}
                  </button>
                ))}
              </div>
            </div>

            {/* Timer display */}
            <div className="flex items-center justify-between">
              <div className={`text-3xl font-mono font-bold tabular-nums ${timerColor}`}>
                {timeLeft === 0 ? (
                  <span className="text-red-500 text-lg">{lc.timeUp}</span>
                ) : formatTime(timeLeft)}
              </div>
              {!timerStarted ? (
                <button
                  onClick={startTimer}
                  className="flex items-center gap-2 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
                >
                  <Play size={14} /> {lc.startTimer}
                </button>
              ) : timerRunning ? (
                <button
                  onClick={stopTimer}
                  className="flex items-center gap-2 text-sm border px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
                >
                  <Square size={14} /> Pause
                </button>
              ) : (
                <button
                  onClick={() => setTimerRunning(true)}
                  className="flex items-center gap-2 text-sm border px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
                >
                  <Play size={14} /> Resume
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Center + Right — editor + results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Code editor */}
          <div className="border rounded-xl overflow-hidden bg-card">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
              <span className="text-sm font-medium">{lc.yourCode}</span>
              <button
                onClick={handleSubmit}
                disabled={submit.isPending || !code.trim() || !timerStarted}
                className="flex items-center gap-2 text-sm bg-primary text-primary-foreground px-4 py-1.5 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Send size={14} />
                {submit.isPending ? lc.submitting : lc.submit}
              </button>
            </div>
            <MonacoEditor
              height="400px"
              language={codingLang}
              value={code}
              onChange={v => setCode(v ?? '')}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 12 },
                lineNumbers: 'on',
                tabSize: 2,
              }}
            />
          </div>

          {/* Evaluation results */}
          {evaluation && (
            <div className="border rounded-xl p-5 bg-card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{lc.evaluation}</h2>
                <ScoreCircle score={evaluation.score} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Clock size={12} /> {lc.timeComplexity}
                  </div>
                  <div className="text-sm font-mono">{evaluation.feedback.time_complexity}</div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Timer size={12} /> {lc.spaceComplexity}
                  </div>
                  <div className="text-sm font-mono">{evaluation.feedback.space_complexity}</div>
                </div>
              </div>

              {evaluation.feedback.issues.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5 text-red-600 dark:text-red-400">
                    <XCircle size={14} /> {lc.issues}
                  </h3>
                  <ul className="space-y-1">
                    {evaluation.feedback.issues.map((issue, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-red-400 shrink-0">•</span> {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.feedback.suggestions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <AlertCircle size={14} /> {lc.suggestions}
                  </h3>
                  <ul className="space-y-1">
                    {evaluation.feedback.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-blue-400 shrink-0">•</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border rounded-lg p-3 bg-muted/30">
                <h3 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> {lc.verdict}
                </h3>
                <p className="text-sm">{evaluation.feedback.verdict}</p>
              </div>
            </div>
          )}

          {submit.error && (
            <div className="border border-destructive rounded-xl p-4 text-sm text-destructive">
              {(submit.error as Error).message}
            </div>
          )}

          {/* Session history */}
          {sessions && sessions.length > 0 && !evaluation && (
            <div className="border rounded-xl p-5 bg-card">
              <h2 className="font-medium text-sm mb-3">{lc.history}</h2>
              <div className="space-y-2">
                {sessions.slice(0, 5).map(s => (
                  <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <span className="truncate flex-1 text-muted-foreground">{s.problem_title}</span>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-xs text-muted-foreground">{s.language}</span>
                      {s.score !== null && (
                        <span className={`text-xs font-medium tabular-nums ${s.score >= 75 ? 'text-green-600' : s.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {s.score}/100
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
