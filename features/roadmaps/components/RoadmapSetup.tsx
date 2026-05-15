'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n/useT'
import { useSettingsStore } from '@/store/settings.store'
import { useCreateRoadmap } from '../hooks/useRoadmaps'
import type { StudyRoadmap } from '@/lib/supabase/types'

interface Props {
  onCreated: (roadmap: StudyRoadmap) => void
}

export function RoadmapSetup({ onCreated }: Props) {
  const t = useT()
  const { language } = useSettingsStore()
  const createRoadmap = useCreateRoadmap()
  const [jobDescription, setJobDescription] = useState('')
  const [cvText, setCvText] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const roadmap = await createRoadmap.mutateAsync({
        job_description: jobDescription,
        cv_text: cvText.trim() || undefined,
        language: language as 'en' | 'pt',
      })
      onCreated(roadmap)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <p className="text-muted-foreground mb-6">
        {t.roadmap.subtitle}
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t.roadmap.jobDescription}
            <span className="text-destructive ml-1">*</span>
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder={t.roadmap.jobDescPlaceholder}
            required
            rows={8}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t.roadmap.cvText}
          </label>
          <textarea
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            placeholder={t.roadmap.cvTextPlaceholder}
            rows={6}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <button
          type="submit"
          disabled={createRoadmap.isPending || !jobDescription.trim()}
          className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {createRoadmap.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              {t.roadmap.generating}
            </span>
          ) : (
            t.roadmap.generate
          )}
        </button>
      </form>
    </div>
  )
}
