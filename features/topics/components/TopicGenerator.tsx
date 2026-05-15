'use client'
import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { useGenerateTopic } from '../hooks/useTopics'
import { useSettingsStore } from '@/store/settings.store'
import { useT } from '@/lib/i18n/useT'

export function TopicGenerator() {
  const t = useT()
  const { language } = useSettingsStore()
  const [topicName, setTopicName] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const generate = useGenerateTopic()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!topicName.trim() || generate.isPending) return
    generate.mutate(
      { topicName: topicName.trim(), difficulty, language: language as string },
      { onSuccess: () => setTopicName('') },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap">
      <input
        value={topicName}
        onChange={e => setTopicName(e.target.value)}
        placeholder={t.topics.placeholder}
        className="flex-1 min-w-48 border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        disabled={generate.isPending}
      />
      <select
        value={difficulty}
        onChange={e => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
        className="border rounded-md px-3 py-2 text-sm bg-background"
        disabled={generate.isPending}
      >
        <option value="easy">{t.topics.easy}</option>
        <option value="medium">{t.topics.medium}</option>
        <option value="hard">{t.topics.hard}</option>
      </select>
      <button
        type="submit"
        disabled={!topicName.trim() || generate.isPending}
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
      >
        {generate.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {generate.isPending ? t.topics.generating : t.topics.generate}
      </button>
      {generate.isError && (
        <p className="w-full text-xs text-destructive">{generate.error.message}</p>
      )}
    </form>
  )
}
