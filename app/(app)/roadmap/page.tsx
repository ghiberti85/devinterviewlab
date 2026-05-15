'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/useT'
import { useRoadmaps, useUpdateTopicProgress } from '@/features/roadmaps/hooks/useRoadmaps'
import { RoadmapSetup } from '@/features/roadmaps/components/RoadmapSetup'
import { GapAnalysisCard } from '@/features/roadmaps/components/GapAnalysisCard'
import { RoadmapTimeline } from '@/features/roadmaps/components/RoadmapTimeline'
import type { StudyRoadmap } from '@/lib/supabase/types'
import { useQueryClient } from '@tanstack/react-query'

export default function RoadmapPage() {
  const t = useT()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: roadmaps, isLoading } = useRoadmaps()
  const [showSetup, setShowSetup] = useState(false)

  const activeRoadmap = roadmaps?.find((r) => r.status === 'active') ?? null

  const updateProgress = useUpdateTopicProgress(activeRoadmap?.id ?? '')

  function handlePractice(topicName: string) {
    router.push(`/questions?search=${encodeURIComponent(topicName)}`)
  }

  function handleIncrementProgress(topicName: string) {
    if (!activeRoadmap) return
    updateProgress.mutate({ topic_name: topicName, increment: 1 })
  }

  function handleCreated(roadmap: StudyRoadmap) {
    queryClient.setQueryData<StudyRoadmap[]>(['roadmaps'], (old) => [roadmap, ...(old ?? [])])
    setShowSetup(false)
  }

  async function handleNewRoadmap() {
    setShowSetup(true)
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-40 rounded-lg bg-muted animate-pulse" />
        <div className="grid lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const showingRoadmap = activeRoadmap && !showSetup

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.roadmap.title}</h1>
          {!showingRoadmap && (
            <p className="text-muted-foreground text-sm mt-1">{t.roadmap.subtitle}</p>
          )}
        </div>
        {activeRoadmap && !showSetup && (
          <button
            onClick={handleNewRoadmap}
            className="text-sm rounded-md border px-3 py-1.5 hover:bg-accent transition-colors"
          >
            {t.roadmap.newRoadmap}
          </button>
        )}
      </div>

      {showSetup || !activeRoadmap ? (
        <RoadmapSetup onCreated={handleCreated} />
      ) : (
        <div className="space-y-5">
          <GapAnalysisCard
            gap_analysis={activeRoadmap.gap_analysis}
            job_title={activeRoadmap.job_title}
          />
          <RoadmapTimeline
            phases={activeRoadmap.roadmap.phases ?? []}
            progress={activeRoadmap.progress ?? []}
            onPractice={handlePractice}
            onIncrementProgress={handleIncrementProgress}
          />
        </div>
      )}
    </div>
  )
}
