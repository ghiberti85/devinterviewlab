'use client'

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts'
import { useAnalytics } from '@/features/analytics/hooks/useAnalytics'
import { useT } from '@/lib/i18n/useT'

export default function StatsPage() {
  const { data, isLoading } = useAnalytics()
  const t = useT()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">{t.stats.title}</h1>
        <div className="grid grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border rounded-xl h-64 animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  const radarData = data?.topicScores.map(ts => ({
    topic: ts.category.name,
    score: ts.score,
    sessions: ts.count,
  })) ?? []

  const heatmapData = data?.heatmap.slice(-30).map(h => ({
    date: h.date.slice(5),
    count: h.count,
  })) ?? []

  const weakConceptData = data?.weakConcepts.map(w => ({
    name: w.concept.name,
    score: Number(w.concept.score),
  })) ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t.stats.title}</h1>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t.stats.totalQuestions, value: data?.totalQuestions ?? 0 },
          { label: t.stats.totalSessions,  value: data?.totalSessions ?? 0 },
          { label: t.stats.avgConfidence,  value: `${data?.avgConfidence ?? 0}/5` },
        ].map(({ label, value }) => (
          <div key={label} className="border rounded-xl p-5 bg-card text-center">
            <div className="text-3xl font-bold tabular-nums">{value}</div>
            <div className="text-sm text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-xl p-5 bg-card">
          <h2 className="font-semibold text-sm mb-4">{t.stats.topicScores}</h2>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="topic" tick={{ fontSize: 11 }} />
                <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip formatter={(v: number) => [`${v}/100`, 'Score']} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground text-center px-4">
              {t.stats.noTopics}
            </div>
          )}
        </div>

        <div className="border rounded-xl p-5 bg-card">
          <h2 className="font-semibold text-sm mb-4">{t.stats.weakestConcepts}</h2>
          {weakConceptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weakConceptData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v}/100`, 'Score']} />
                <Bar dataKey="score" radius={4}>
                  {weakConceptData.map((entry, i) => (
                    <Cell key={i}
                      fill={entry.score < 30 ? '#ef4444' : entry.score < 60 ? '#eab308' : '#22c55e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground text-center px-4">
              {t.stats.noConcepts}
            </div>
          )}
        </div>

        <div className="border rounded-xl p-5 bg-card lg:col-span-2">
          <h2 className="font-semibold text-sm mb-4">{t.stats.dailyActivity}</h2>
          {heatmapData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={heatmapData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, t.stats.totalSessions]} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">
              {t.stats.noActivity}
            </div>
          )}
        </div>
      </div>

      {data?.recentSessions && data.recentSessions.length > 0 && (
        <div className="border rounded-xl p-5 bg-card">
          <h2 className="font-semibold text-sm mb-4">{t.stats.recentSessions}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="pb-2 font-medium">{t.stats.question}</th>
                  <th className="pb-2 font-medium">{t.stats.type}</th>
                  <th className="pb-2 font-medium">{t.stats.confidence}</th>
                  <th className="pb-2 font-medium">{t.stats.nextReview}</th>
                  <th className="pb-2 font-medium">{t.stats.date}</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSessions.map((s: any) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="py-2.5 pr-4 truncate max-w-xs">{s.questions?.title ?? '—'}</td>
                    <td className="py-2.5 pr-4 capitalize text-muted-foreground">{s.session_type}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${(s.confidence / 5) * 100}%` }} />
                        </div>
                        <span className="text-xs tabular-nums">{s.confidence}/5</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground text-xs">
                      {s.next_review_at ? new Date(s.next_review_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="py-2.5 text-muted-foreground text-xs">
                      {new Date(s.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
