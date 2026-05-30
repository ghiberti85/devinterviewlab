'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n/useT'

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
              const phases = selected.roadmap?.phases ?? []
              const allTopics = phases.flatMap(p => p.topics.map(t => ({ topicName: t.name, phaseName: p.label })))
              if (allTopics.length === 0) return
              try {
                await clearQuestions.mutateAsync()
                let totalGenerated = 0
                for (let i = 0; i < allTopics.length; i++) {
                  setGenProgress({ current: i, total: allTopics.length })
                  // Each call generates EN + PT in the server
                  const result = await generateTopicQuestions.mutateAsync({
                    topicName: allTopics[i].topicName,
                    phaseName: allTopics[i].phaseName,
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

export default function PlanoPage() {
  const t = useT()
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t.nav.plan}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.plan.subtitle}</p>
      </div>

      <RoadmapTab />
    </div>
  )
}
