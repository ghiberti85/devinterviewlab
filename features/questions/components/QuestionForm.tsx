'use client'

import { useState } from 'react'
import { useCreateQuestion, useUpdateQuestion } from '../hooks/useQuestions'
import { useSettingsStore } from '@/store/settings.store'
import { useT } from '@/lib/i18n/useT'
import type { Difficulty, Question } from '@/lib/supabase/types'

interface Props {
  question?: Question
  categories: { id: string; name: string }[]
  onSuccess?: () => void
}

export function QuestionForm({ question, categories, onSuccess }: Props) {
  const create = useCreateQuestion()
  const update = useUpdateQuestion()
  const { language: preferredLanguage } = useSettingsStore()
  const t = useT()
  const isEdit = !!question

  const [form, setForm] = useState({
    title: question?.title ?? '',
    body: question?.body ?? '',
    ideal_answer: question?.ideal_answer ?? '',
    difficulty: (question?.difficulty ?? 'medium') as Difficulty,
    category_id: question?.category_id ?? '',
    is_behavioral: question?.is_behavioral ?? false,
    language: (question as any)?.language ?? preferredLanguage,
  })

  const set = (k: string, v: unknown) => setForm(prev => ({ ...prev, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isEdit) await update.mutateAsync({ id: question.id, ...form })
    else await create.mutateAsync(form)
    onSuccess?.()
  }

  const isPending = create.isPending || update.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">{t.questions.title} *</label>
        <input
          value={form.title} onChange={e => set('title', e.target.value)} required
          placeholder="e.g. Explain the event loop in JavaScript"
          className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">{t.questions.difficulty}</label>
          <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="easy">{preferredLanguage === 'pt' ? 'Fácil' : 'Easy'}</option>
            <option value="medium">{preferredLanguage === 'pt' ? 'Médio' : 'Medium'}</option>
            <option value="hard">{preferredLanguage === 'pt' ? 'Difícil' : 'Hard'}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t.questions.category}</label>
          <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">{t.questions.allCategories}</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t.questions.language}</label>
          <select value={form.language} onChange={e => set('language', e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="en">🇺🇸 English</option>
            <option value="pt">🇧🇷 Português</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input id="behavioral" type="checkbox" checked={form.is_behavioral}
          onChange={e => set('is_behavioral', e.target.checked)} className="rounded" />
        <label htmlFor="behavioral" className="text-sm">{t.questions.behavioral}</label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {t.questions.body} <span className="text-muted-foreground text-xs">({t.questions.optional})</span>
        </label>
        <textarea value={form.body} onChange={e => set('body', e.target.value)} rows={3}
          placeholder={t.questions.bodyPlaceholder}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {t.questions.idealAnswer} <span className="text-muted-foreground text-xs">({t.questions.usedByAI})</span>
        </label>
        <textarea value={form.ideal_answer} onChange={e => set('ideal_answer', e.target.value)} rows={6}
          placeholder={t.questions.answerPlaceholder}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onSuccess}
          className="px-4 py-2 text-sm border rounded-md hover:bg-accent transition-colors">
          {t.common.cancel}
        </button>
        <button type="submit" disabled={isPending}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity">
          {isPending ? t.common.saving : isEdit ? t.common.update : t.common.create}
        </button>
      </div>
    </form>
  )
}
