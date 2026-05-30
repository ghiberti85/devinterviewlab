'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useT } from '@/lib/i18n/useT'
import { Map, BarChart2 } from 'lucide-react'

// Roadmap
import { useRouter } from 'next/navigation'
import { useRoadmaps, useUpdateTopicProgress } from '@/features/roadmaps/hooks/useRoadmaps'
import { useGenerateTopicQuestions, useClearRoadmapQuestions } from '@/features/roadmaps/hooks/useRoadmapQuestions'
import { RoadmapSetup } from '@/features/roadmaps/components/RoadmapSetup'
import { GapAnalysisCard } from '@/features/roadmaps/components/GapAnalysisCard'
import { RoadmapTimeline } from '@/features/roadmaps/components/RoadmapTimeline'
import type { StudyRoadmap } from '@/lib/supabase/types'
import { useQueryClient } from '@tanstack/react-query'
import { useSettingsStore } from '@/store/settings.store'

// Stats
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts'
import { useAnalytics } from '@/features/analytics/hooks/useAnalytics'

// Score Cards
import { useScoreCards } from '@/features/score-cards/hooks/useScoreCards'
import { ScoreCardList } from '@/features/score-cards/components/ScoreCardList'

type Tab = 'roadmap' | 'progress'

function RoadmapTab() {
  const t = useT()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: roadmaps, isLoading } = useRoadmaps()
  const [showSetup, setShowSetup] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [genSuccess, setGenSuccess] = useState<string | null>(null)
  const [genProgress, setGenProgress] = useState<{ current: number; total: number } | null>(null)

  const allRoadmaps = roadmaps ?? []
  const selected = allRoadmaps.find(r => r.id === selectedId) ?? allRoadmaps[0] ?? null
  const updateProgress = useUpdateTopicProgress(selected?.id ?? '')
  const generateTopicQuestions = useGenerateTopicQuestions(selected?.id ?? '')
  const clearQuestions = useClearRoadmapQuestions(selected?.id ?? '')

  function handleCreated(roadmap: StudyRoadmap) {
    queryClient.setQueryData<StudyRoadmap[]>(['roadmaps'], old => [roadmap, ...(old ?? [])])
    setSelectedId(roadmap.id)
    setShowSetup(false)
  }

  if (isLoading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="border rounded-xl h-24 animate-pulse bg-muted" />)}</div>
  }

  if (showSetup || !selected) {
    return (
      <div className="space-y-4">
        {selected && (
          <button onClick={() => setShowSetup(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← {t.roadmap.backToRoadmap ?? 'Back'}
          </button>
        )}
        <RoadmapSetup onCreated={handleCreated} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        {/* Roadmap selector — shown only when there's more than one */}
        {allRoadmaps.length > 1 ? (
          <select
            value={selected.id}
            onChange={e => setSelectedId(e.target.value)}
            className="text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary flex-1 max-w-xs truncate"
          >
            {allRoadmaps.map(r => (
              <option key={r.id} value={r.id}>
                {r.job_title ?? t.roadmap.cvOnly} — {new Date(r.created_at).toLocaleDateString()}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-muted-foreground truncate">
            {selected.job_title ?? t.roadmap.cvOnly}
          </span>
        )}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={async () => {
              if (!selected) return
              setGenError(null)
              setGenSuccess(null)
              setGenProgress(null)
              const { language } = useSettingsStore.getState()
              const phases = selected.roadmap?.phases ?? []
              const allTopics = phases.flatMap(p => p.topics.map(t => ({ topicName: t.name, phaseName: p.label })))
              if (allTopics.length === 0) return
              try {
                // Clear all existing questions first
                await clearQuestions.mutateAsync()
                let totalGenerated = 0
                for (let i = 0; i < allTopics.length; i++) {
                  setGenProgress({ current: i, total: allTopics.length })
                  const result = await generateTopicQuestions.mutateAsync({
                    topicName: allTopics[i].topicName,
                    phaseName: allTopics[i].phaseName,
                    language: language as string,
                  })
                  totalGenerated += result.count
                }
                setGenProgress(null)
                setGenSuccess(t.roadmap.questionsGenerated(totalGenerated))
              } catch {
                setGenProgress(null)
                setGenError(t.roadmap.questionsGenerateError)
              }
            }}
            disabled={generateTopicQuestions.isPending || clearQuestions.isPending}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            {genProgress
              ? t.roadmap.generatingProgress(genProgress.current, genProgress.total)
              : t.roadmap.generateQuestions}
          </button>
          <button onClick={() => setShowSetup(true)} className="text-xs text-muted-foreground hover:underline">
            {t.roadmap.newRoadmap}
          </button>
        </div>
      </div>
      {genProgress && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t.roadmap.generatingProgress(genProgress.current, genProgress.total)}</span>
            <span>{Math.round((genProgress.current / genProgress.total) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.round((genProgress.current / genProgress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}
      {genError && <p className="text-xs text-red-500">{genError}</p>}
      {genSuccess && <p className="text-xs text-green-600">{genSuccess}</p>}
      <GapAnalysisCard
        gap_analysis={selected.gap_analysis}
        job_title={selected.job_title}
      />
      <RoadmapTimeline
        phases={selected.roadmap.phases ?? []}
        progress={(selected as any).progress ?? []}
        onPractice={topic => router.push(`/simular?topic=${encodeURIComponent(topic)}`)}
        onIncrementProgress={topic => updateProgress.mutate({ topic_name: topic, increment: 1 })}
      />
    </div>
  )
}

function ProgressTab() {
  const t = useT()
  const { data, isLoading } = useAnalytics()
  const { data: scoreCards, isLoading: scLoading } = useScoreCards()

  const radarData = data?.topicScores.map(ts => ({
    topic: ts.category.name,
    score: ts.score,
  })) ?? []

  const weakData = data?.weakConcepts.map(w => ({
    name: w.concept.name,
    score: Number(w.concept.score),
  })) ?? []

  if (isLoading) {
    return <div className="space-y-4">{[...Array(2)].map((_, i) => <div key={i} className="border rounded-xl h-48 animate-pulse bg-muted" />)}</div>
  }

  return (
    <div className="space-y-5">
      {/* Heatmap */}
      <div className="border rounded-xl p-5 bg-card">
        <h2 className="font-semibold text-sm mb-4">{t.dashboard.activityTitle}</h2>
        {data?.heatmap.length ? (
          <div className="flex flex-wrap gap-1">
            {data.heatmap.slice(-63).map(({ date, count }) => (
              <div
                key={date}
                title={`${date}: ${count}`}
                className={`w-3 h-3 rounded-sm ${count === 0 ? 'bg-muted' : count <= 2 ? 'bg-green-200 dark:bg-green-900' : count <= 4 ? 'bg-green-400 dark:bg-green-700' : 'bg-green-600 dark:bg-green-500'}`}
              />
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">{t.dashboard.noActivity}</p>}
      </div>

      {/* Radar */}
      {radarData.length > 0 && (
        <div className="border rounded-xl p-5 bg-card">
          <h2 className="font-semibold text-sm mb-4">{t.stats.topicScores}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="topic" tick={{ fontSize: 11 }} />
              <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weak concepts */}
      {weakData.length > 0 && (
        <div className="border rounded-xl p-5 bg-card">
          <h2 className="font-semibold text-sm mb-4">{t.dashboard.weakConcepts}</h2>
          <ResponsiveContainer width="100%" height={Math.max(180, weakData.length * 36)}>
            <BarChart data={weakData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {weakData.map((entry, i) => (
                  <Cell key={i} fill={entry.score < 30 ? '#ef4444' : entry.score < 60 ? '#eab308' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Score Cards */}
      <div className="border rounded-xl p-5 bg-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">{t.scoreCard.title}</h2>
          <Link href="/interview" className="text-xs text-primary hover:underline">{t.scoreCard.generate}</Link>
        </div>
        {scLoading && <div className="h-20 animate-pulse bg-muted rounded-lg" />}
        {!scLoading && (!scoreCards || scoreCards.length === 0) && (
          <p className="text-sm text-muted-foreground">{t.scoreCard.noCards}</p>
        )}
        {!scLoading && scoreCards && scoreCards.length > 0 && <ScoreCardList scoreCards={scoreCards} />}
      </div>
    </div>
  )
}

export default function PlanoPage() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('roadmap')

  const tabs = [
    { id: 'roadmap'  as Tab, icon: Map,      label: t.nav.roadmap },
    { id: 'progress' as Tab, icon: BarChart2, label: t.plan.progress },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t.nav.plan}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.plan.subtitle}</p>
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

      {tab === 'roadmap'  && <RoadmapTab />}
      {tab === 'progress' && <ProgressTab />}
    </div>
  )
}
