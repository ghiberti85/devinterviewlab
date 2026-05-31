'use client'

import { useState } from 'react'
import { BookOpen, Code2 } from 'lucide-react'
import { useT } from '@/lib/i18n/useT'
import { useSettingsStore } from '@/store/settings.store'
import { useRoadmaps } from '@/features/roadmaps/hooks/useRoadmaps'
import { useRoadmapQuestions } from '@/features/roadmaps/hooks/useRoadmapQuestions'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  ResponsiveContainer,
} from 'recharts'

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="border rounded-xl p-3 bg-card flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
          <Icon size={14} className="text-primary" />
        </div>
        <div className="text-xl font-bold tabular-nums">{value}</div>
      </div>
      <div className="text-xs text-muted-foreground leading-tight">{label}</div>
    </div>
  )
}

function RoadmapStats({ roadmapId }: { roadmapId: string }) {
  const t = useT()
  const { language } = useSettingsStore()
  const { data: questions, isLoading } = useRoadmapQuestions(roadmapId)

  if (isLoading) {
    return <div className="h-24 animate-pulse bg-muted rounded-xl" />
  }

  const langQuestions = (questions ?? []).filter(q => q.language === language)
  const total = langQuestions.length
  const theoretical = langQuestions.filter(q => q.question_type === 'theoretical').length
  const liveCoding = langQuestions.filter(q => q.question_type === 'live_coding').length

  const byTopic = new Map<string, number>()
  langQuestions.forEach(q => {
    byTopic.set(q.topic_name, (byTopic.get(q.topic_name) ?? 0) + 1)
  })

  const topicData = Array.from(byTopic.entries()).map(([name, count]) => ({ name, count }))
  const maxNameLen = topicData.reduce((m, d) => Math.max(m, d.name.length), 0)
  const yAxisWidth = Math.min(160, Math.max(80, maxNameLen * 7))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatCard label={t.stats.questionsTotal} value={total} icon={BookOpen} />
        <StatCard label={t.stats.questionsTheoretical} value={theoretical} icon={BookOpen} />
        <StatCard label={t.stats.questionsLiveCoding} value={liveCoding} icon={Code2} />
      </div>

      {topicData.length > 0 && (
        <div className="border rounded-xl p-4 bg-card overflow-x-hidden">
          <h3 className="text-sm font-medium mb-4">{t.stats.questionsPerTopic ?? 'Questions per topic'}</h3>
          <div className="w-full overflow-x-hidden">
            <ResponsiveContainer width="99%" height={Math.max(160, topicData.length * 36)}>
              <BarChart data={topicData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={yAxisWidth}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 18) + '…' : v}
                />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {topicData.map((_, i) => (
                    <Cell key={i} fill="#6366f1" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {topicData.length === 0 && (
        <div className="border rounded-xl p-5 bg-card text-center">
          <p className="text-sm text-muted-foreground">{t.stats.noQuestions ?? 'No questions generated yet.'}</p>
        </div>
      )}
    </div>
  )
}

export default function StatsPage() {
  const t = useT()
  const { data: roadmaps } = useRoadmaps()
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(null)

  const allRoadmaps = roadmaps ?? []
  const currentId = selectedRoadmapId ?? allRoadmaps[0]?.id ?? null

  return (
    <div className="space-y-6 max-w-2xl w-full min-w-0 overflow-x-hidden">
      <div>
        <h1 className="text-xl font-semibold">{t.stats.title}</h1>
      </div>

      {/* Roadmap question breakdown */}
      {allRoadmaps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold text-sm shrink-0">{t.stats.roadmapProgress}</h2>
            <select
              value={currentId ?? ''}
              onChange={e => setSelectedRoadmapId(e.target.value)}
              className="text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary min-w-0 flex-1 max-w-xs"
            >
              {allRoadmaps.map(r => (
                <option key={r.id} value={r.id}>
                  {r.job_title ?? 'Roadmap'} — {new Date(r.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
          {currentId && <RoadmapStats roadmapId={currentId} />}
        </div>
      )}

      {allRoadmaps.length === 0 && (
        <div className="border rounded-xl p-5 bg-card text-center">
          <p className="text-sm text-muted-foreground">{t.stats.noRoadmaps}</p>
        </div>
      )}
    </div>
  )
}
