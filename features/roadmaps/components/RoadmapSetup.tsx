'use client'

import { useState, useRef } from 'react'
import { useT } from '@/lib/i18n/useT'
import { useSettingsStore } from '@/store/settings.store'
import { useCreateRoadmap } from '../hooks/useRoadmaps'
import type { StudyRoadmap } from '@/lib/supabase/types'
import { useSavedCV, useUploadDocument, useDocuments, useDeleteDocument, formatFileSize } from '@/features/documents/hooks/useDocuments'
import { Upload, FileText, Trash2, CheckCircle2 } from 'lucide-react'

interface Props {
  onCreated: (roadmap: StudyRoadmap) => void
}

export function RoadmapSetup({ onCreated }: Props) {
  const t = useT()
  const { language } = useSettingsStore()
  const createRoadmap = useCreateRoadmap()
  const uploadDocument = useUploadDocument()
  const deleteDocument = useDeleteDocument()
  const { data: savedCV } = useSavedCV()
  const { data: documents } = useDocuments()

  const [jobDescription, setJobDescription] = useState('')
  const [cvText, setCvText] = useState('')
  const [cvLoaded, setCvLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const otherDocs = (documents ?? []).filter(d => d.doc_type !== 'cv')

  async function handleUploadCV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try {
      const result = await uploadDocument.mutateAsync({ file, docType: 'cv', keepStored: true })
      setCvText(result.text_content ?? '')
      setCvLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error)
    }
    // reset input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleUseSavedCV() {
    if (savedCV?.text_content) {
      setCvText(savedCV.text_content)
      setCvLoaded(true)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!jobDescription.trim() && !cvText.trim()) {
      setError(t.roadmap.cvOrJdRequired)
      return
    }
    try {
      const roadmap = await createRoadmap.mutateAsync({
        job_description: jobDescription.trim() || undefined,
        cv_text: cvText.trim() || undefined,
        language: language as 'en' | 'pt',
      })
      onCreated(roadmap)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <p className="text-muted-foreground">{t.roadmap.subtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t.roadmap.jobDescription}
            <span className="text-xs text-muted-foreground ml-1">({language === 'pt' ? 'opcional' : 'optional'})</span>
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder={t.roadmap.jobDescPlaceholder}
            rows={6}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* CV section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="block text-sm font-medium">{t.roadmap.cvText}</label>
            <div className="flex items-center gap-2">
              {savedCV && !cvLoaded && (
                <button
                  type="button"
                  onClick={handleUseSavedCV}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <FileText size={11} />
                  {t.roadmap.useSavedCv}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleUploadCV}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadDocument.isPending}
                className="flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-md hover:bg-accent disabled:opacity-50 transition-colors"
              >
                <Upload size={12} />
                {uploadDocument.isPending ? t.roadmap.uploadingCv : t.roadmap.uploadCv}
              </button>
            </div>
          </div>

          {cvLoaded && (
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 size={12} />
              {t.roadmap.savedCvLoaded}
            </div>
          )}

          <textarea
            value={cvText}
            onChange={(e) => { setCvText(e.target.value); setCvLoaded(false) }}
            placeholder={t.roadmap.cvTextPlaceholder}
            rows={6}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={createRoadmap.isPending || (!jobDescription.trim() && !cvText.trim())}
          className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {createRoadmap.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              {t.roadmap.generating}
            </span>
          ) : t.roadmap.generate}
        </button>
      </form>

      {/* Stored files */}
      {(savedCV || otherDocs.length > 0) && (
        <div className="border rounded-xl p-4 bg-card space-y-3">
          <h3 className="text-sm font-medium">{t.roadmap.storedFiles}</h3>
          <div className="space-y-2">
            {savedCV && (
              <div className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={14} className="text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{savedCV.name}</p>
                    <p className="text-xs text-muted-foreground">
                      CV · {formatFileSize(savedCV.file_size)} · {new Date(savedCV.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteDocument.mutate(savedCV.id)}
                  className="shrink-0 ml-2 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={t.roadmap.deleteFile}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
            {otherDocs.map(doc => (
              <div key={doc.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={14} className="text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteDocument.mutate(doc.id)}
                  className="shrink-0 ml-2 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={t.roadmap.deleteFile}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
