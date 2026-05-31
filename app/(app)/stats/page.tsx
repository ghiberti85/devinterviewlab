'use client'

import { useState } from 'react'
import { BarChart2, BookOpen, CheckCircle2, Code2 } from 'lucide-react'
import { useT } from '@/lib/i18n/useT'
import { useSettingsStore } from '@/store/settings.store'
import { useAnalytics } from '@/features/analytics/hooks/useAnalytics'
import { useRoadmaps } from '@/features/roadmaps/hooks/useRoadmaps'
import { useRoadmapQuestions } from '@/features/roadmaps/hooks/useRoadmapQuestions'
import { useCodingSessions } from '@/features/live-coding/hooks/useLiveCoding'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  ResponsiveContainer,
} from 'recharts'

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="border rounded-xl p-4 bg-card flex items-center gap-3">
      <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
        <Icon size={18} className="text-primary" />
      </div>
      <div>
        <div className="text-xl font-bold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
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
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t.stats.questionsTotal ?? 'Total'} value={total} icon={BookOpen} />
        <StatCard label={t.stats.questionsTheoretical ?? 'Theoretical'} value={theoretical} icon={BookOpen} />
        <StatCard label={t.stats.questionsLiveCoding ?? 'Live Coding'} value={liveCoding} icon={Code2} />
      </div>

      {topicData.length > 0 && (
        <div className="border rounded-xl p-4 bg-card overflow-hidden">
          <h3 className="text-sm font-medium mb-4">{t.stats.roadmapProgress}</h3>
          <ResponsiveContainer width="100%" height={Math.max(160, topicData.length * 36)}>
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
      )}
    </div>
  )
}

export default function StatsPage() {
  const t = useT()
  const { data, isLoading } = useAnalytics()
  const { data: roadmaps } = useRoadmaps()
  const { data: codingSessions } = useCodingSessions()
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(null)

  const allRoadmaps = roadmaps ?? []
  const currentId = selectedRoadmapId ?? allRoadmaps[0]?.id ?? null
  const totalCodingSessions = codingSessions?.length ?? '—'

  return (
    <div className="space-y-6 max-w-2xl w-full min-w-0">
      <div>
        <h1 className="text-xl font-semibold">{t.stats.title}</h1>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label={t.stats.totalQuestions} value={data?.totalQuestions ?? '—'} icon={BookOpen} />
        <StatCard label={t.stats.totalSessions} value={data?.totalSessions ?? '—'} icon={CheckCircle2} />
        <StatCard label={t.stats.codingSessions ?? 'Code sessions'} value={totalCodingSessions} icon={Code2} />
      </div>

      {/* Roadmap stats */}
      {allRoadmaps.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-sm">{t.stats.roadmapProgress}</h2>
            <select
              value={currentId ?? ''}
              onChange={e => setSelectedRoadmapId(e.target.value)}
              className="text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary max-w-xs"
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
