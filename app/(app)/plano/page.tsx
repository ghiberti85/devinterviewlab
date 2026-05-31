'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Loader2, Plus, FileText, Code2 } from 'lucide-react'
import { useT } from '@/lib/i18n/useT'
import { useSettingsStore } from '@/store/settings.store'
import { useRoadmaps } from '@/features/roadmaps/hooks/useRoadmaps'
import { useGenerateTopicQuestions } from '@/features/roadmaps/hooks/useRoadmapQuestions'
import { RoadmapSetup } from '@/features/roadmaps/components/RoadmapSetup'
import type { StudyRoadmap } from '@/lib/supabase/types'
import { useQueryClient } from '@tanstack/react-query'

type QuestionType = 'theoretical' | 'live_coding'

function RoadmapCard({ roadmap }: { roadmap: StudyRoadmap }) {
  const t = useT()
  const router = useRouter()
  const { language } = useSettingsStore()
  const [open, setOpen] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [genSuccess, setGenSuccess] = useState<string | null>(null)
  const [genProgress, setGenProgress] = useState<{ current: number; total: number } | null>(null)
  const [questionType, setQuestionType] = useState<QuestionType>('theoretical')

  const generateTopicQuestions = useGenerateTopicQuestions(roadmap.id)

  const allTopics = (roadmap.roadmap?.phases ?? []).flatMap(p =>
    p.topics.map(topic => ({ ...topic, phaseName: p.label }))
  )

  async function handleGenerate() {
    if (allTopics.length === 0) return
    setGenError(null)
    setGenSuccess(null)
    setGenProgress(null)
    try {
      let totalGenerated = 0
      for (let i = 0; i < allTopics.length; i++) {
        setGenProgress({ current: i + 1, total: allTopics.length })
        const result = await generateTopicQuestions.mutateAsync({
          topicName: allTopics[i].name,
          phaseName: allTopics[i].phaseName,
          questionType,
        })
        totalGenerated += result.count
      }
      setGenProgress(null)
      setGenSuccess(t.roadmap.questionsGenerated(totalGenerated))
    } catch {
      setGenProgress(null)
      setGenError(t.roadmap.questionsGenerateError)
    }
  }

  const isGenerating = generateTopicQuestions.isPending

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">
              {roadmap.job_title ?? t.roadmap.cvOnly}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(roadmap.created_at).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </p>
          </div>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {open ? (t.roadmap.hideTopics ?? 'Hide') : (t.roadmap.showTopics ?? 'Topics')}
          </button>
        </div>

        {/* Question type selector */}
        <div className="flex gap-1 p-0.5 bg-muted rounded-lg w-fit">
          <button
            onClick={() => setQuestionType('theoretical')}
            disabled={isGenerating}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
              questionType === 'theoretical'
                ? 'bg-background shadow-sm text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText size={11} />
            {t.roadmap.theoretical ?? 'Theoretical'}
          </button>
          <button
            onClick={() => setQuestionType('live_coding')}
            disabled={isGenerating}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
              questionType === 'live_coding'
                ? 'bg-background shadow-sm text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code2 size={11} />
            {t.roadmap.liveCoding ?? 'Live Coding'}
          </button>
        </div>

        {/* Generate + practice */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || allTopics.length === 0}
            className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {isGenerating && <Loader2 size={11} className="animate-spin" />}
            {genProgress
              ? t.roadmap.generatingProgress(genProgress.current, genProgress.total)
              : t.roadmap.generateQuestions}
          </button>
          <button
            onClick={() => router.push('/revisar')}
            className="text-xs border px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
          >
            {t.roadmap.practice}
          </button>
        </div>

        {genProgress && (
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.round((genProgress.current / genProgress.total) * 100)}%` }}
            />
          </div>
        )}
        {genError && <p className="text-xs text-red-500">{genError}</p>}
        {genSuccess && <p className="text-xs text-green-600">{genSuccess}</p>}
      </div>

      {open && allTopics.length > 0 && (
        <div className="border-t bg-muted/20 divide-y">
          {allTopics.map((topic, i) => (
            <div key={`${topic.name}-${i}`} className="flex items-center justify-between px-4 py-2.5 gap-3">
              <p className="text-sm truncate flex-1">{topic.name}</p>
              <button
                onClick={() => router.push('/revisar')}
                className="text-xs text-primary hover:underline shrink-0"
              >
                {t.roadmap.practice}
              </button>
            </div>
          ))}
        </div>
      )}

      {open && allTopics.length === 0 && (
        <div className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
          {t.roadmap.noTopics ?? 'No topics in this roadmap.'}
        </div>
      )}
    </div>
  )
}

export default function PlanoPage() {
  const t = useT()
  const queryClient = useQueryClient()
  const { data: roadmaps, isLoading } = useRoadmaps()
  const [showSetup, setShowSetup] = useState(false)

  function handleCreated(roadmap: StudyRoadmap) {
    queryClient.setQueryData<StudyRoadmap[]>(['roadmaps'], old => [roadmap, ...(old ?? [])])
    setShowSetup(false)
  }

  if (showSetup) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setShowSetup(false)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {t.roadmap.backToRoadmap ?? 'Back'}
        </button>
        <RoadmapSetup onCreated={handleCreated} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.nav.roadmap}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.roadmap.subtitle}</p>
        </div>
        <button
          onClick={() => setShowSetup(true)}
          className="flex items-center gap-1.5 text-sm border px-3 py-2 rounded-md hover:bg-accent transition-colors shrink-0"
        >
          <Plus size={14} />
          {t.roadmap.newRoadmap}
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="border rounded-xl h-28 animate-pulse bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && (!roadmaps || roadmaps.length === 0) && (
        <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
          <p className="text-sm">{t.roadmap.noRoadmap}</p>
          <button
            onClick={() => setShowSetup(true)}
            className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            {t.roadmap.newRoadmap}
          </button>
        </div>
      )}

      {!isLoading && roadmaps && roadmaps.length > 0 && (
        <div className="space-y-3">
          {roadmaps.map(r => <RoadmapCard key={r.id} roadmap={r} />)}
        </div>
      )}
    </div>
  )
}
