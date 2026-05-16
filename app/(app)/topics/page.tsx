'use client'
import { useTopics } from '@/features/topics/hooks/useTopics'
import { TopicCard } from '@/features/topics/components/TopicCard'
import { TopicGenerator } from '@/features/topics/components/TopicGenerator'
import { useT } from '@/lib/i18n/useT'
import { useSettingsStore } from '@/store/settings.store'
import { Loader2, BookMarked } from 'lucide-react'

export default function TopicsPage() {
  const t = useT()
  const { language } = useSettingsStore()
  const { data: pairs, isLoading } = useTopics(language as string)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.topics.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t.topics.subtitle}</p>
      </div>

      <TopicGenerator />

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      )}

      {!isLoading && (!pairs || pairs.length === 0) && (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <BookMarked size={40} className="opacity-30" />
          <p className="text-sm">{t.topics.empty}</p>
        </div>
      )}

      {!isLoading && pairs && pairs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pairs.map(pair => (
            <TopicCard key={pair.rootId} pair={pair} />
          ))}
        </div>
      )}
    </div>
  )
}
