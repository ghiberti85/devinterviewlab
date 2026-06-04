'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Loader2, Plus, FileText, Code2, Trash2 } from 'lucide-react'
import { useT } from '@/lib/i18n/useT'
import { useSettingsStore } from '@/store/settings.store'
import { useRoadmaps, useDeleteRoadmap } from '@/features/roadmaps/hooks/useRoadmaps'
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
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const deleteRoadmap = useDeleteRoadmap()

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
        totalGenerated += result.perLanguage
      }
      setGenProgress(null)
      setGenSuccess(t.roadmap.questionsGenerated(totalGenerated))
    } catch {
      setGenProgress(null)
      setGenError(t.roadmap.questionsGenerateError)
    }
  }

  const isGenerating = generateTopicQuestions.isPending

  async function handleDelete() {
    setDeleteError(null)
    try {
      await deleteRoadmap.mutateAsync({ id: roadmap.id })
    } catch {
      setDeleteError(t.roadmap.deleteRoadmapError)
      setConfirmDelete(false)
    }
  }

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
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-950"
              title={t.roadmap.deleteRoadmap}
            >
              <Trash2 size={13} />
            </button>
            <button
              onClick={() => setOpen(v => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {open ? (t.roadmap.hideTopics ?? 'Hide') : (t.roadmap.showTopics ?? 'Topics')}
            </button>
          </div>
        </div>

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50 dark:bg-red-950/30 space-y-2">
            <p className="text-xs text-red-700 dark:text-red-400">{t.roadmap.deleteRoadmapConfirm}</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleteRoadmap.isPending}
                className="flex items-center gap-1 text-xs bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleteRoadmap.isPending ? <><Loader2 size={11} className="animate-spin" />{t.roadmap.deletingRoadmap}</> : t.roadmap.deleteRoadmap}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleteRoadmap.isPending}
                className="text-xs border px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        )}
        {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}

        {/* Question type selector */}
        <div className="flex gap-1 p-0.5 bg-muted rounded-lg w-full">
          <button
            onClick={() => setQuestionType('theoretical')}
            disabled={isGenerating}
            className={`flex flex-1 items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
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
            className={`flex flex-1 items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
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
        <div className="flex items-center gap-2 w-full">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || allTopics.length === 0}
            className="flex-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
          >
            {isGenerating && <Loader2 size={11} className="animate-spin" />}
            {genProgress
              ? t.roadmap.generatingProgress(genProgress.current, genProgress.total)
              : t.roadmap.generateQuestions}
          </button>
          <button
            onClick={() => router.push('/revisar?tab=questions')}
            className="flex-1 text-xs border px-3 py-1.5 rounded-md hover:bg-accent transition-colors text-center"
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
                onClick={() => router.push(`/revisar?tab=questions&topic=${encodeURIComponent(topic.name)}`)}
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
