'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Map, Layers, Swords, BarChart2, ChevronDown, ChevronUp,
  FileText, Code2, BookOpen, CheckCircle2, ChevronRight,
  Mic, Star, Lightbulb, Zap, TrendingUp, Target,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ResponsiveContainer,
} from 'recharts'

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ROADMAP = {
  id: 'demo-1',
  job_title: 'Senior Full-Stack Engineer',
  created_at: '2026-06-04T10:00:00Z',
  gap_analysis: {
    match_score: 72,
    matched_skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    missing_skills: ['Redis', 'Kubernetes', 'System Design'],
    summary: 'Strong frontend foundation. Focus on distributed systems and infrastructure to close the gap for a senior role.',
  },
  roadmap: {
    phases: [
      {
        label: 'Phase 1 — Fundamentals',
        topics: [
          { name: 'TypeScript Advanced Patterns', priority: 1, question_count: 5 },
          { name: 'Async JavaScript & Event Loop', priority: 1, question_count: 4 },
          { name: 'Data Structures & Algorithms', priority: 2, question_count: 6 },
        ],
      },
      {
        label: 'Phase 2 — Frontend',
        topics: [
          { name: 'React Performance & Optimization', priority: 1, question_count: 5 },
          { name: 'State Management (Zustand / Redux)', priority: 2, question_count: 4 },
          { name: 'Accessibility & Web Standards', priority: 3, question_count: 3 },
        ],
      },
      {
        label: 'Phase 3 — Backend & Databases',
        topics: [
          { name: 'REST & GraphQL API Design', priority: 1, question_count: 5 },
          { name: 'PostgreSQL Query Optimization', priority: 1, question_count: 4 },
          { name: 'Redis Caching Strategies', priority: 2, question_count: 4 },
        ],
      },
      {
        label: 'Phase 4 — System Design',
        topics: [
          { name: 'Distributed Systems Fundamentals', priority: 1, question_count: 6 },
          { name: 'Microservices vs Monolith', priority: 2, question_count: 4 },
          { name: 'CI/CD & Docker', priority: 2, question_count: 3 },
        ],
      },
    ],
  },
}

const MOCK_QUESTIONS = [
  {
    id: 'q1', topic_name: 'React Performance & Optimization', phase_name: 'Phase 2 — Frontend',
    question_type: 'theoretical' as const,
    question: 'What is the difference between useMemo and useCallback? When should you use each?',
    answer: 'useMemo memoizes a computed value and re-runs only when dependencies change. useCallback memoizes a function reference. Use useMemo for expensive calculations; useCallback to stabilize function references passed as props to avoid unnecessary child re-renders.',
  },
  {
    id: 'q2', topic_name: 'TypeScript Advanced Patterns', phase_name: 'Phase 1 — Fundamentals',
    question_type: 'theoretical' as const,
    question: 'Explain conditional types in TypeScript and provide a practical use case.',
    answer: 'Conditional types use the syntax T extends U ? X : Y. They allow type-level branching. A common use is NonNullable<T> which removes null/undefined from a type by writing T extends null | undefined ? never : T.',
  },
  {
    id: 'q3', topic_name: 'PostgreSQL Query Optimization', phase_name: 'Phase 3 — Backend & Databases',
    question_type: 'live_coding' as const,
    question: 'Write a query to find the top 5 users by total order value in the last 30 days, including users with zero orders.',
    answer: "SELECT u.id, u.name, COALESCE(SUM(o.total), 0) AS revenue\nFROM users u\nLEFT JOIN orders o\n  ON o.user_id = u.id\n  AND o.created_at >= NOW() - INTERVAL '30 days'\nGROUP BY u.id, u.name\nORDER BY revenue DESC\nLIMIT 5;",
  },
  {
    id: 'q4', topic_name: 'Distributed Systems Fundamentals', phase_name: 'Phase 4 — System Design',
    question_type: 'theoretical' as const,
    question: 'Explain the CAP theorem and which guarantees you would prioritise for a financial transaction system.',
    answer: "CAP states a distributed system can guarantee at most two of: Consistency, Availability, Partition tolerance. For financial systems, favour CP (Consistency + Partition tolerance) — it's better to reject a request than to process a duplicate transaction.",
  },
  {
    id: 'q5', topic_name: 'Redis Caching Strategies', phase_name: 'Phase 3 — Backend & Databases',
    question_type: 'live_coding' as const,
    question: 'Implement a cache-aside pattern in Node.js using Redis for a user profile endpoint.',
    answer: "async function getUser(id) {\n  const cached = await redis.get(`user:${id}`);\n  if (cached) return JSON.parse(cached);\n\n  const user = await db.users.findById(id);\n  await redis.setex(`user:${id}`, 300, JSON.stringify(user));\n  return user;\n}",
  },
]

const MOCK_CONCEPTS = [
  {
    id: 'c1', title: 'React Reconciliation', difficulty: 'medium' as const,
    summary: "React's diffing algorithm that determines the minimal set of DOM mutations needed when state or props change. It compares virtual DOM trees using a heuristic O(n) algorithm, relying on stable keys for lists.",
    when_to_use: 'Understanding reconciliation is critical when optimising list rendering, avoiding unnecessary re-renders, and debugging performance issues in large component trees.',
    tags: ['React', 'Performance', 'Virtual DOM'],
    quick_qa: [
      { q: 'What triggers reconciliation?', a: 'Any setState, prop change or context update triggers a re-render cycle.' },
      { q: 'Why are keys important?', a: 'Keys allow React to identify which list items changed, were added, or removed — avoiding full list re-mounts.' },
    ],
  },
  {
    id: 'c2', title: 'Database Indexing', difficulty: 'hard' as const,
    summary: 'An index is a data structure (usually a B-tree) that speeds up row lookups at the cost of extra storage and slower writes. Partial, composite, and covering indexes each serve different query patterns.',
    when_to_use: 'Add indexes on columns used in WHERE, JOIN, and ORDER BY clauses with high cardinality. Avoid over-indexing write-heavy tables.',
    tags: ['PostgreSQL', 'Performance', 'SQL'],
    quick_qa: [
      { q: 'What is a covering index?', a: 'An index that includes all columns a query needs, allowing the DB to answer without touching the main table.' },
      { q: 'When should you avoid indexes?', a: 'On columns with low cardinality (e.g. boolean) or on tables with very frequent writes where index overhead outweighs read gains.' },
    ],
  },
  {
    id: 'c3', title: 'Event Loop', difficulty: 'easy' as const,
    summary: 'The mechanism that allows Node.js and browsers to handle asynchronous operations. It processes the call stack, microtask queue (Promises), and macrotask queue (setTimeout) in a defined order each "tick".',
    when_to_use: 'Essential when debugging async behaviour, understanding why Promises resolve before setTimeout callbacks, or reasoning about blocking operations in Node.js services.',
    tags: ['JavaScript', 'Async', 'Node.js'],
    quick_qa: [
      { q: 'Which queue has higher priority?', a: 'Microtasks (Promise callbacks) always drain completely before any macrotask runs.' },
      { q: 'What blocks the event loop?', a: 'Any synchronous CPU-intensive code (heavy loops, large JSON.parse) blocks the loop and degrades responsiveness.' },
    ],
  },
]

const MOCK_STATS_DATA = [
  { name: 'React Performance', count: 5 },
  { name: 'TypeScript Patterns', count: 5 },
  { name: 'PostgreSQL', count: 4 },
  { name: 'Distributed Systems', count: 6 },
  { name: 'Redis Caching', count: 4 },
  { name: 'REST & GraphQL', count: 5 },
]

const MOCK_SIMULATE = {
  question: 'What is the difference between useMemo and useCallback? When should you use each?',
  score: 88,
  strengths: ['Correctly distinguished the two hooks', 'Mentioned child re-render impact', 'Clear and concise explanation'],
  gaps: ['Could mention dependency array gotchas', 'No code example provided'],
}

// ── Shared components ────────────────────────────────────────────────────────

function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
      Demo
    </span>
  )
}

function DifficultyBadge({ difficulty }: { difficulty: 'easy' | 'medium' | 'hard' }) {
  const colors = {
    easy: 'bg-green-500/10 text-green-600 dark:text-green-400',
    medium: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    hard: 'bg-red-500/10 text-red-500',
  }
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${colors[difficulty]}`}>
      {difficulty}
    </span>
  )
}

// ── Tab: Plano ───────────────────────────────────────────────────────────────

function PlanoTab() {
  const [openPhase, setOpenPhase] = useState<string | null>('Phase 1 — Fundamentals')

  const { gap_analysis, roadmap, job_title } = MOCK_ROADMAP

  return (
    <div className="space-y-5 h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Roadmap</h2>
          <p className="text-sm text-muted-foreground mt-1">Generate study roadmaps from your CV and job descriptions</p>
        </div>
        <button disabled className="flex items-center gap-1.5 text-sm border px-3 py-2 rounded-md opacity-50 cursor-not-allowed shrink-0">
          + New roadmap
        </button>
      </div>

      {/* Desktop: 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Gap analysis */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border rounded-xl p-4 bg-card space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Job fit score</p>
                <p className="text-2xl font-bold tabular-nums text-primary leading-none">{gap_analysis.match_score}%</p>
              </div>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${gap_analysis.match_score}%` }} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{gap_analysis.summary}</p>

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">Matched skills</p>
              <div className="flex flex-wrap gap-1.5">
                {gap_analysis.matched_skills.map(s => (
                  <span key={s} className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-red-500">Skills to develop</p>
              <div className="flex flex-wrap gap-1.5">
                {gap_analysis.missing_skills.map(s => (
                  <span key={s} className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="border rounded-xl p-4 bg-card space-y-3">
            <p className="text-xs font-semibold">{job_title}</p>
            <p className="text-[10px] text-muted-foreground">4 Jun 2026 · {roadmap.phases.reduce((acc, p) => acc + p.topics.length, 0)} topics</p>
            <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
              <button className="flex flex-1 items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-background shadow-sm font-medium">
                <FileText size={11} /> Theoretical
              </button>
              <button className="flex flex-1 items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-md text-muted-foreground">
                <Code2 size={11} /> Live Coding
              </button>
            </div>
            <div className="flex gap-2">
              <button disabled className="flex-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md opacity-50 cursor-not-allowed">
                Generate questions
              </button>
              <button disabled className="flex-1 text-xs border px-3 py-1.5 rounded-md opacity-50 cursor-not-allowed">
                Practice
              </button>
            </div>
          </div>
        </div>

        {/* Right: Phases accordion */}
        <div className="lg:col-span-3 space-y-2">
          {roadmap.phases.map(phase => (
            <div key={phase.label} className="border rounded-xl bg-card overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors"
                onClick={() => setOpenPhase(openPhase === phase.label ? null : phase.label)}
              >
                <span className="text-sm font-medium">{phase.label}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground">{phase.topics.length} topics</span>
                  {openPhase === phase.label ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                </div>
              </button>
              {openPhase === phase.label && (
                <div className="border-t divide-y bg-muted/20">
                  {phase.topics.map((topic, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-3">
                      <p className="text-sm truncate flex-1">{topic.name}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground">{topic.question_count}q</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          topic.priority === 1 ? 'bg-red-500/10 text-red-500' :
                          topic.priority === 2 ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                          'bg-muted text-muted-foreground'
                        }`}>P{topic.priority}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Tab: Revisar ─────────────────────────────────────────────────────────────

function RevisarTab() {
  const [subTab, setSubTab] = useState<'questions' | 'concepts'>('questions')
  const [selectedQ, setSelectedQ] = useState<string>(MOCK_QUESTIONS[0].id)
  const [expandedC, setExpandedC] = useState<string | null>(null)

  const activeQuestion = MOCK_QUESTIONS.find(q => q.id === selectedQ) ?? MOCK_QUESTIONS[0]

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Review</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Study questions and Flash Topics generated for your roadmap</p>
        </div>
        {/* Sub-tabs — top right on desktop */}
        <div className="flex gap-1 p-0.5 bg-muted rounded-lg shrink-0">
          <button
            onClick={() => setSubTab('questions')}
            className={`text-xs px-4 py-1.5 rounded-md transition-colors ${subTab === 'questions' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Questions
          </button>
          <button
            onClick={() => setSubTab('concepts')}
            className={`text-xs px-4 py-1.5 rounded-md transition-colors ${subTab === 'concepts' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Flash Topics
          </button>
        </div>
      </div>

      {/* Questions: master-detail on desktop */}
      {subTab === 'questions' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:h-[520px]">
          {/* List panel */}
          <div className="lg:col-span-2 flex flex-col gap-2 lg:overflow-y-auto lg:pr-1">
            {MOCK_QUESTIONS.map(q => (
              <button
                key={q.id}
                onClick={() => setSelectedQ(q.id)}
                className={`w-full text-left border rounded-xl p-3 transition-colors ${
                  selectedQ === q.id
                    ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                    : 'bg-card hover:bg-accent/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    q.question_type === 'theoretical'
                      ? 'bg-blue-500/10 text-blue-500'
                      : 'bg-violet-500/10 text-violet-500'
                  }`}>
                    {q.question_type === 'theoretical' ? 'Theoretical' : 'Live Coding'}
                  </span>
                  <ChevronRight size={12} className={`text-muted-foreground shrink-0 mt-1 transition-transform ${selectedQ === q.id ? 'text-primary' : ''}`} />
                </div>
                <p className="text-sm font-medium leading-snug mt-2 line-clamp-2">{q.question}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5">{q.topic_name}</p>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-3 border rounded-xl bg-card overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  activeQuestion.question_type === 'theoretical'
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'bg-violet-500/10 text-violet-500'
                }`}>
                  {activeQuestion.question_type === 'theoretical' ? 'Theoretical' : 'Live Coding'}
                </span>
                <span className="text-[10px] text-muted-foreground">{activeQuestion.topic_name}</span>
              </div>
              <p className="text-sm font-semibold leading-snug">{activeQuestion.question}</p>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">Reference answer</p>
              {activeQuestion.question_type === 'live_coding' ? (
                <pre className="text-xs bg-muted rounded-lg p-3 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-words">
                  {activeQuestion.answer}
                </pre>
              ) : (
                <p className="text-sm leading-relaxed text-foreground/90">{activeQuestion.answer}</p>
              )}
            </div>
            <div className="p-4 border-t bg-muted/10">
              <p className="text-[10px] text-muted-foreground">{activeQuestion.phase_name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Flash Topics: 3-col grid on desktop */}
      {subTab === 'concepts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {MOCK_CONCEPTS.map(c => (
            <div key={c.id} className="border rounded-xl bg-card p-4 space-y-3 min-w-0 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm leading-snug">{c.title}</h3>
                <DifficultyBadge difficulty={c.difficulty} />
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed break-words">{c.summary}</p>

              <div className="border rounded-lg p-3 bg-muted/30 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Lightbulb size={10} /> When to use
                </p>
                <p className="text-xs leading-relaxed break-words">{c.when_to_use}</p>
              </div>

              <div className="flex flex-wrap gap-1">
                {c.tags.map(tag => (
                  <span key={tag} className="text-[10px] bg-muted px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>

              <div className="mt-auto pt-2 border-t space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Quick Q&A</p>
                {(expandedC === c.id ? c.quick_qa : c.quick_qa.slice(0, 1)).map((qa, i) => (
                  <div key={i} className="space-y-0.5">
                    <p className="text-xs font-medium">{qa.q}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{qa.a}</p>
                  </div>
                ))}
                {c.quick_qa.length > 1 && (
                  <button
                    onClick={() => setExpandedC(expandedC === c.id ? null : c.id)}
                    className="text-[10px] text-primary hover:underline"
                  >
                    {expandedC === c.id ? `Hide ${c.quick_qa.length - 1} more` : `+${c.quick_qa.length - 1} more Q&A`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab: Simular ─────────────────────────────────────────────────────────────

function SimularTab() {
  const [step, setStep] = useState<'list' | 'answer' | 'result'>('list')
  const [answer, setAnswer] = useState('')

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Simulate</h2>
        <p className="text-sm text-muted-foreground mt-1">Practice answering questions as in a real interview</p>
      </div>

      {step === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Active question */}
          <div className="lg:col-span-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Featured question</p>
            <div className="border rounded-xl bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-medium">Theoretical</span>
                <span className="text-xs text-muted-foreground">React Performance & Optimization</span>
              </div>
              <p className="text-base font-medium leading-snug">{MOCK_SIMULATE.question}</p>
              <button
                onClick={() => setStep('answer')}
                className="w-full text-sm bg-primary text-primary-foreground px-4 py-2.5 rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Swords size={14} /> Start practice
              </button>
            </div>

            {/* Blurred extra questions */}
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-2">More questions</p>
            {MOCK_QUESTIONS.slice(1, 3).map(q => (
              <div key={q.id} className="border rounded-xl bg-card p-4 opacity-40 select-none blur-[1px]">
                <p className="text-sm font-medium leading-snug line-clamp-2">{q.question}</p>
              </div>
            ))}
          </div>

          {/* Info panel */}
          <div className="lg:col-span-2 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How it works</p>
            <div className="border rounded-xl bg-card p-4 space-y-4">
              {[
                { icon: FileText, label: 'Read the question', desc: 'Take your time to understand what is being asked.' },
                { icon: Mic, label: 'Answer by text or voice', desc: 'Type your answer or use voice input for a real interview feel.' },
                { icon: Star, label: 'Get AI feedback', desc: 'Receive a score, strengths and areas to improve instantly.' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex gap-3">
                  <div className="p-1.5 rounded-lg bg-primary/10 h-fit shrink-0">
                    <Icon size={14} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 'answer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border rounded-xl bg-card p-5 space-y-2 h-fit">
            <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-medium">Theoretical</span>
            <p className="text-base font-semibold leading-snug mt-2">{MOCK_SIMULATE.question}</p>
            <p className="text-xs text-muted-foreground mt-2">React Performance & Optimization · Phase 2 — Frontend</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Your answer</label>
              <button disabled className="flex items-center gap-1 text-xs text-muted-foreground opacity-50 cursor-not-allowed">
                <Mic size={12} /> Voice input
              </button>
            </div>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full h-52 text-sm border rounded-xl px-3 py-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setStep('list')} className="text-xs border px-3 py-2 rounded-md hover:bg-accent transition-colors">
                ← Back
              </button>
              <button
                onClick={() => setStep('result')}
                disabled={!answer.trim()}
                className="flex-1 text-xs bg-primary text-primary-foreground px-3 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Submit answer
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'result' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Score */}
          <div className="border rounded-xl bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">AI Evaluation</span>
              <div className="flex items-center gap-1.5">
                <Star size={16} className="text-yellow-500 fill-yellow-500" />
                <span className="text-2xl font-bold tabular-nums">{MOCK_SIMULATE.score}<span className="text-sm font-normal text-muted-foreground">/100</span></span>
              </div>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${MOCK_SIMULATE.score}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">Good answer! You demonstrated solid understanding of memoization hooks.</p>
          </div>

          {/* Feedback */}
          <div className="space-y-3">
            <div className="border rounded-xl bg-card p-4 space-y-2">
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Strengths
              </p>
              {MOCK_SIMULATE.strengths.map((s, i) => (
                <p key={i} className="text-xs text-muted-foreground pl-4">• {s}</p>
              ))}
            </div>
            <div className="border rounded-xl bg-card p-4 space-y-2">
              <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 flex items-center gap-1.5">
                <Zap size={13} /> To improve
              </p>
              {MOCK_SIMULATE.gaps.map((g, i) => (
                <p key={i} className="text-xs text-muted-foreground pl-4">• {g}</p>
              ))}
            </div>
            <button onClick={() => { setStep('list'); setAnswer('') }} className="w-full text-xs border px-3 py-2 rounded-md hover:bg-accent transition-colors">
              ← Back to questions
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Estatísticas ────────────────────────────────────────────────────────

function StatsTab() {
  const total = MOCK_STATS_DATA.reduce((s, d) => s + d.count, 0)
  const theoretical = Math.round(total * 0.6)
  const liveCoding = total - theoretical

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Statistics</h2>
        <p className="text-sm text-muted-foreground mt-1">Track your progress across roadmaps and question types</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total questions', value: total, icon: BookOpen, color: 'text-primary' },
          { label: 'Theoretical', value: theoretical, icon: FileText, color: 'text-blue-500' },
          { label: 'Live Coding', value: liveCoding, icon: Code2, color: 'text-violet-500' },
          { label: 'Flash Topics', value: 3, icon: Lightbulb, color: 'text-yellow-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="border rounded-xl p-4 bg-card flex flex-col gap-3 min-w-0">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg bg-muted`}>
                <Icon size={15} className={color} />
              </div>
              <TrendingUp size={12} className="text-green-500 opacity-60" />
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + breakdown side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 border rounded-xl p-4 bg-card overflow-x-hidden">
          <h3 className="text-sm font-medium mb-4">Questions per topic</h3>
          <ResponsiveContainer width="99%" height={MOCK_STATS_DATA.length * 38}>
            <BarChart data={MOCK_STATS_DATA} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 16) + '…' : v} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {MOCK_STATS_DATA.map((_, i) => <Cell key={i} fill="#6366f1" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="border rounded-xl p-4 bg-card space-y-4">
          <h3 className="text-sm font-medium">Breakdown</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Theoretical</span>
                <span className="text-xs font-medium">{theoretical}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(theoretical / total) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Live Coding</span>
                <span className="text-xs font-medium">{liveCoding}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(liveCoding / total) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Roadmap</p>
            <p className="text-sm font-semibold leading-snug">{MOCK_ROADMAP.job_title}</p>
            <p className="text-xs text-muted-foreground">4 phases · {MOCK_ROADMAP.roadmap.phases.reduce((a, p) => a + p.topics.length, 0)} topics</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Demo Page ───────────────────────────────────────────────────────────

type DemoTab = 'plano' | 'revisar' | 'simular' | 'stats'

const TABS: { id: DemoTab; label: string; icon: React.ElementType }[] = [
  { id: 'plano', label: 'Plan', icon: Map },
  { id: 'revisar', label: 'Review', icon: Layers },
  { id: 'simular', label: 'Simulate', icon: Swords },
  { id: 'stats', label: 'Stats', icon: BarChart2 },
]

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<DemoTab>('plano')

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 h-14 border-b bg-background/90 backdrop-blur flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <span className="font-bold text-primary text-lg">DevInterviewLab</span>
          <DemoBadge />
        </div>
        <Link
          href="/register"
          className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors font-medium"
        >
          Sign up free →
        </Link>
      </header>

      {/* Demo notice */}
      <div className="mt-14 bg-primary/5 border-b border-primary/10 px-4 py-2 text-center">
        <p className="text-xs text-muted-foreground">
          Interactive demo with sample data.{' '}
          <Link href="/register" className="text-primary hover:underline font-medium">Create a free account</Link>
          {' '}to use all features with your own CV and job descriptions.
        </p>
      </div>

      {/* Content */}
      <main className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-52 border-r pt-6 px-3 gap-1 shrink-0">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </aside>

        {/* Page content */}
        <div className="flex-1 p-4 md:p-6 pb-24 md:pb-8 min-w-0 overflow-x-hidden">
          {activeTab === 'plano' && <PlanoTab />}
          {activeTab === 'revisar' && <RevisarTab />}
          {activeTab === 'simular' && <SimularTab />}
          {activeTab === 'stats' && <StatsTab />}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/90 backdrop-blur flex">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] transition-colors ${
                activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
