'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useSubmitCode, useCodingSessions, useRequestHint, useGenerateProblem, useSaveProblem, type ProblemDifficulty } from '@/features/live-coding/hooks/useLiveCoding'
import { useSettingsStore } from '@/store/settings.store'
import { useT } from '@/lib/i18n/useT'
import type { CodeEvaluationFeedback } from '@/lib/supabase/types'
import {
  Timer, Play, Square, Send, RotateCcw, CheckCircle2, XCircle,
  AlertCircle, Clock, Lightbulb, X, Sparkles, BookOpen,
} from 'lucide-react'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => null,
})

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

interface HintPanelProps {
  hint: string
  title: string
  onDismiss: () => void
  isAuto?: boolean
}

function HintPanel({ hint, title, onDismiss, isAuto }: HintPanelProps) {
  return (
    <div className={`border rounded-xl p-4 flex gap-3 ${isAuto ? 'border-yellow-400/50 bg-yellow-50/50 dark:bg-yellow-900/10' : 'border-blue-400/50 bg-blue-50/50 dark:bg-blue-900/10'}`}>
      <Lightbulb size={16} className={`shrink-0 mt-0.5 ${isAuto ? 'text-yellow-500' : 'text-blue-500'}`} />
      <div className="flex-1 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="text-sm leading-relaxed">{hint}</p>
      </div>
      <button onClick={onDismiss} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
        <X size={14} />
      </button>
    </div>
  )
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 768px)').matches)
  }, [])
  return isMobile
}

interface SavedProblemsPanelProps {
  sessions: Array<{ problem_title: string; problem_description: string | null; score: number | null; created_at: string }>
  lc: { savedProblems: string; noSavedProblems: string; loadProblem: string }
  onSelect: (title: string, desc: string) => void
}

function SavedProblemsPanel({ sessions, lc, onSelect }: SavedProblemsPanelProps) {
  // Deduplicate by title, keep most recent
  const seen = new Set<string>()
  const unique = sessions.filter(s => {
    if (seen.has(s.problem_title)) return false
    seen.add(s.problem_title)
    return true
  })

  if (unique.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">{lc.noSavedProblems}</p>
  }

  return (
    <div className="space-y-1 max-h-52 overflow-y-auto">
      {unique.map(s => (
        <button
          key={s.problem_title}
          onClick={() => onSelect(s.problem_title, s.problem_description ?? '')}
          className="w-full text-left px-3 py-2.5 rounded-md hover:bg-accent transition-colors group flex items-center justify-between gap-2 min-h-[44px]"
        >
          <span className="text-sm truncate flex-1">{s.problem_title}</span>
          {s.score !== null && (
            <span className={`text-xs font-medium tabular-nums shrink-0 ${s.score >= 75 ? 'text-green-600' : s.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {s.score}/100
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export default function LiveCodingPage() {
  const t = useT()
  const lc = t.liveCoding
  const { language: uiLanguage } = useSettingsStore()
  const submit = useSubmitCode()
  const requestHint = useRequestHint()
  const generateProblem = useGenerateProblem()
  const saveProblem = useSaveProblem()
  const { data: sessions } = useCodingSessions()
  const isMobile = useIsMobile()

  // Problem state
  const [problemTitle, setProblemTitle] = useState(SAMPLE_PROBLEMS[0].title)
  const [problemDesc, setProblemDesc] = useState(SAMPLE_PROBLEMS[0].description)
  const [customProblem, setCustomProblem] = useState(false)
  const [showAIGenerate, setShowAIGenerate] = useState(false)
  const [showSavedProblems, setShowSavedProblems] = useState(false)
  const [aiDifficulty, setAIDifficulty] = useState<ProblemDifficulty>('medium')
  const [aiTopic, setAITopic] = useState('')
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState(false)

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

  // Hint state
  const [hint, setHint] = useState<string | null>(null)
  const [hintIsAuto, setHintIsAuto] = useState(false)
  const hintsRequestedRef = useRef(0)
  const hintsShownRef = useRef(0)
  const idlePausesRef = useRef(0)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Result state
  const [evaluation, setEvaluation] = useState<{ score: number; feedback: CodeEvaluationFeedback } | null>(null)

  // ── Idle detection: triggers auto hint after 60s without typing ──────────
  const fetchHint = useCallback(async (isAuto: boolean) => {
    if (!problemTitle || requestHint.isPending) return
    if (isAuto) {
      idlePausesRef.current++
      setHintIsAuto(true)
    } else {
      hintsRequestedRef.current++
      setHintIsAuto(false)
    }
    try {
      const result = await requestHint.mutateAsync({
        problem_title: problemTitle,
        problem_description: problemDesc,
        code,
        language: codingLang,
        ui_language: uiLanguage,
      })
      hintsShownRef.current++
      setHint(result.hint)
    } catch { /* non-blocking */ }
  }, [problemTitle, problemDesc, code, codingLang, uiLanguage, requestHint])

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (timerRunning && !evaluation) {
      idleTimerRef.current = setTimeout(() => fetchHint(true), 60_000)
    }
  }, [timerRunning, evaluation, fetchHint])

  // Reset idle timer on each keystroke
  useEffect(() => { resetIdleTimer() }, [code, resetIdleTimer])

  // Clear idle timer when session ends
  useEffect(() => {
    if (!timerRunning && idleTimerRef.current) clearTimeout(idleTimerRef.current)
  }, [timerRunning])

  // ── Countdown ────────────────────────────────────────────────────────────
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
    hintsRequestedRef.current = 0
    hintsShownRef.current = 0
    idlePausesRef.current = 0
    setTimerRunning(true)
    setTimerStarted(true)
    setEvaluation(null)
    setHint(null)
  }

  function stopTimer() { setTimerRunning(false) }

  function selectProblem(idx: number) {
    setProblemTitle(SAMPLE_PROBLEMS[idx].title)
    setProblemDesc(SAMPLE_PROBLEMS[idx].description)
    setCustomProblem(false)
    setCode('')
    setEvaluation(null)
    setHint(null)
    setTimerRunning(false)
    setTimerStarted(false)
    setTimeLeft(timerDuration * 60)
  }

  function resetAll() {
    setCode('')
    setEvaluation(null)
    setHint(null)
    setTimerRunning(false)
    setTimerStarted(false)
    setTimeLeft(timerDuration * 60)
    timeSpentRef.current = 0
    hintsRequestedRef.current = 0
    hintsShownRef.current = 0
    idlePausesRef.current = 0
  }

  async function handleAIGenerate() {
    setGenerateError(null)
    try {
      const result = await generateProblem.mutateAsync({
        difficulty: aiDifficulty,
        topic: aiTopic.trim() || undefined,
        coding_language: codingLang,
        ui_language: uiLanguage,
      })
      setProblemTitle(result.title)
      setProblemDesc(result.description)
      setCustomProblem(false)
      setShowAIGenerate(false)
      setCode('')
      setEvaluation(null)
      setHint(null)
      setTimerRunning(false)
      setTimerStarted(false)
      setTimeLeft(timerDuration * 60)
    } catch {
      setGenerateError(lc.generateError)
    }
  }

  const handleSubmit = useCallback(async () => {
    if (!code.trim()) return
    stopTimer()
    setHint(null)
    try {
      const result = await submit.mutateAsync({
        problem_title: problemTitle,
        problem_description: problemDesc,
        language: codingLang,
        code,
        time_spent_sec: timeSpentRef.current,
        timer_duration_sec: timerDuration * 60,
        hints_requested: hintsRequestedRef.current,
        hints_shown: hintsShownRef.current,
        idle_pauses: idlePausesRef.current,
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
          <div className="border rounded-xl p-4 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-sm">{lc.problem}</h2>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setShowAIGenerate(v => !v); setCustomProblem(false); setShowSavedProblems(false) }}
                    className={`flex-1 text-xs flex items-center justify-center gap-1 py-1.5 rounded-md border transition-colors min-h-[36px] ${showAIGenerate ? 'bg-purple-600 text-white border-purple-600' : 'text-purple-600 dark:text-purple-400 hover:bg-muted border-transparent'}`}
                  >
                    <Sparkles size={11} />
                    <span className="hidden sm:inline">{lc.generateProblem}</span>
                    <span className="sm:hidden">IA</span>
                  </button>
                  <button
                    onClick={() => { setShowSavedProblems(v => !v); setShowAIGenerate(false); setCustomProblem(false) }}
                    className={`flex-1 text-xs flex items-center justify-center gap-1 py-1.5 rounded-md border transition-colors min-h-[36px] ${showSavedProblems ? 'bg-primary text-primary-foreground border-primary' : 'text-primary hover:bg-muted border-transparent'}`}
                  >
                    <BookOpen size={11} />
                    <span className="hidden sm:inline">{lc.savedProblems}</span>
                    <span className="sm:hidden">Salvos</span>
                  </button>
                  <button
                    onClick={() => { setCustomProblem(v => !v); setShowAIGenerate(false); setShowSavedProblems(false); if (!customProblem) { setProblemTitle(''); setProblemDesc('') } }}
                    className={`flex-1 text-xs flex items-center justify-center gap-1 py-1.5 rounded-md border transition-colors min-h-[36px] ${customProblem ? 'bg-muted text-foreground border-border' : 'text-muted-foreground hover:bg-muted border-transparent'}`}
                  >
                    <span>{lc.customProblem}</span>
                  </button>
                </div>
              </div>
            </div>

            {showSavedProblems ? (
              <SavedProblemsPanel
                sessions={sessions ?? []}
                lc={lc}
                onSelect={(title, desc) => {
                  setProblemTitle(title)
                  setProblemDesc(desc)
                  setCustomProblem(false)
                  setShowSavedProblems(false)
                  setCode('')
                  setEvaluation(null)
                  setHint(null)
                  setTimerRunning(false)
                  setTimerStarted(false)
                  setTimeLeft(timerDuration * 60)
                }}
              />
            ) : showAIGenerate ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">{lc.difficulty}</label>
                  <div className="flex gap-1.5">
                    {(['easy', 'medium', 'hard'] as ProblemDifficulty[]).map(d => (
                      <button
                        key={d}
                        onClick={() => setAIDifficulty(d)}
                        className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
                          aiDifficulty === d
                            ? d === 'easy' ? 'bg-green-500 text-white border-green-500'
                              : d === 'medium' ? 'bg-yellow-500 text-white border-yellow-500'
                              : 'bg-red-500 text-white border-red-500'
                            : 'hover:bg-accent'
                        }`}
                      >
                        {lc[`difficulty${d.charAt(0).toUpperCase() + d.slice(1)}` as 'difficultyEasy' | 'difficultyMedium' | 'difficultyHard']}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">{lc.topic}</label>
                  <input
                    value={aiTopic}
                    onChange={e => setAITopic(e.target.value)}
                    placeholder={lc.topicPlaceholder}
                    className="w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {generateError && (
                  <p className="text-xs text-destructive">{generateError}</p>
                )}
                <button
                  onClick={handleAIGenerate}
                  disabled={generateProblem.isPending}
                  className="w-full flex items-center justify-center gap-2 text-sm bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  <Sparkles size={14} />
                  {generateProblem.isPending ? lc.generating : lc.generateProblem}
                </button>
              </div>
            ) : !customProblem ? (
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

          {!customProblem && problemDesc && (
            <div className="border rounded-xl p-4 bg-card space-y-3">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{problemDesc}</p>
              {!timerStarted && (
                <div className="flex items-center gap-2 pt-1 border-t">
                  <button
                    onClick={async () => {
                      setSavedMsg(false)
                      await saveProblem.mutateAsync({ problem_title: problemTitle, problem_description: problemDesc, language: codingLang })
                      setSavedMsg(true)
                      setTimeout(() => setSavedMsg(false), 3000)
                    }}
                    disabled={saveProblem.isPending || savedMsg}
                    className="text-xs flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
                  >
                    <BookOpen size={11} />
                    {savedMsg ? lc.problemSaved : saveProblem.isPending ? lc.saving : lc.saveProblem}
                  </button>
                </div>
              )}
            </div>
          )}

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
                  <Square size={14} /> {lc.pause}
                </button>
              ) : (
                <button
                  onClick={() => setTimerRunning(true)}
                  className="flex items-center gap-2 text-sm border px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
                >
                  <Play size={14} /> {lc.resume}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Center + Right — editor + results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Code editor */}
          <div className="border rounded-xl overflow-hidden bg-card">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 gap-2">
              <span className="text-sm font-medium">{lc.yourCode}</span>
              <div className="flex items-center gap-2">
                {/* Manual hint button */}
                {timerStarted && !evaluation && (
                  <button
                    onClick={() => fetchHint(false)}
                    disabled={requestHint.isPending}
                    className="flex items-center gap-1.5 text-xs border px-2.5 py-1.5 rounded-md hover:bg-accent disabled:opacity-50 transition-colors"
                  >
                    <Lightbulb size={12} className="text-yellow-500" />
                    {requestHint.isPending ? lc.hintLoading : lc.hintBtn}
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submit.isPending || !code.trim() || !timerStarted}
                  className="flex items-center gap-2 text-sm bg-primary text-primary-foreground px-4 py-1.5 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <Send size={14} />
                  {submit.isPending ? lc.submitting : lc.submit}
                </button>
              </div>
            </div>

            {/* Hint panel */}
            {hint && (
              <div className="px-4 pt-3">
                <HintPanel
                  hint={hint}
                  title={hintIsAuto ? lc.hintAutoTitle : lc.hintTitle}
                  onDismiss={() => setHint(null)}
                  isAuto={hintIsAuto}
                />
              </div>
            )}

            {isMobile ? (
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder={lc.codePlaceholder}
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full h-[400px] bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-3 resize-none focus:outline-none"
              />
            ) : (
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
            )}
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

              {evaluation.feedback.process_feedback && (
                <div className="border rounded-lg p-3 border-yellow-400/40 bg-yellow-50/30 dark:bg-yellow-900/10">
                  <h3 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Lightbulb size={12} className="text-yellow-500" /> {lc.processFeedback}
                  </h3>
                  <p className="text-sm">{evaluation.feedback.process_feedback}</p>
                </div>
              )}
            </div>
          )}

          {submit.error && (
            <div className="border border-destructive rounded-xl p-4 text-sm text-destructive">
              {(submit.error as Error).message}
            </div>
          )}

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
