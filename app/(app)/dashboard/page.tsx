'use client'

import { useAnalytics } from '@/features/analytics/hooks/useAnalytics'
import { useT } from '@/lib/i18n/useT'
import { BookOpen, Dumbbell, Star, AlertTriangle, TrendingUp, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

function StatCard({ icon: Icon, label, value, color }: {
  icon: LucideIcon; label: string; value: string | number; color: string
}) {
  return (
    <div className="border rounded-xl p-5 bg-card flex items-center gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading } = useAnalytics()
  const t = useT()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">{t.dashboard.title}</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border rounded-xl p-5 bg-card h-24 animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  const confidence = data?.avgConfidence ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">{t.dashboard.title}</h1>
        <div className="flex gap-2 flex-wrap">
          <Link href="/practice"
            className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity whitespace-nowrap">
            {t.dashboard.startPractice}
          </Link>
          <Link href="/interview"
            className="text-sm border px-4 py-2 rounded-md hover:bg-accent transition-colors whitespace-nowrap">
            {t.dashboard.aiInterview}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen}    label={t.dashboard.questions}     value={data?.totalQuestions ?? 0}           color="bg-blue-500" />
        <StatCard icon={Dumbbell}    label={t.dashboard.sessions}      value={data?.totalSessions ?? 0}            color="bg-purple-500" />
        <StatCard icon={Star}        label={t.dashboard.avgConfidence} value={`${confidence.toFixed(1)}/5`}        color="bg-yellow-500" />
        <StatCard icon={TrendingUp}  label={t.dashboard.topicsCovered} value={data?.topicScores.length ?? 0}      color="bg-green-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap */}
        <div className="border rounded-xl p-5 bg-card">
          <h2 className="font-semibold mb-4 text-sm">{t.dashboard.activityTitle}</h2>
          {data?.heatmap.length ? (
            <div className="flex flex-wrap gap-1">
              {data.heatmap.slice(-63).map(({ date, count }) => (
                <div
                  key={date}
                  title={`${date}: ${count}`}
                  className={`w-3 h-3 rounded-sm ${
                    count === 0     ? 'bg-muted'
                    : count <= 2   ? 'bg-green-200 dark:bg-green-900'
                    : count <= 4   ? 'bg-green-400 dark:bg-green-700'
                    : 'bg-green-600 dark:bg-green-500'
                  }`}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.dashboard.noActivity}</p>
          )}
        </div>

        {/* Weak concepts */}
        <div className="border rounded-xl p-5 bg-card">
          <h2 className="font-semibold mb-4 text-sm flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-yellow-500" />
            {t.dashboard.weakConcepts}
          </h2>
          {data?.weakConcepts.length ? (
            <ul className="space-y-2">
              {data.weakConcepts.map(({ concept, score }) => (
                <li key={concept.id} className="flex items-center justify-between text-sm">
                  <span>{concept.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className={`h-full rounded-full ${score < 30 ? 'bg-red-500' : score < 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{score}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t.dashboard.noWeakConcepts}{' '}
              <Link href="/concept-graph" className="text-primary hover:underline">{t.dashboard.addConcepts}</Link>
            </p>
          )}
        </div>
      </div>

      {/* Recent sessions */}
      {data?.recentSessions.length ? (
        <div className="border rounded-xl p-5 bg-card">
          <h2 className="font-semibold mb-4 text-sm">{t.dashboard.recentSessions}</h2>
          <div className="space-y-2">
            {data.recentSessions.map((s: any) => (
              <div key={s.id} className="flex items-start justify-between gap-2 text-sm py-1.5 border-b last:border-0">
                <span className="truncate flex-1 text-muted-foreground text-xs leading-5">{s.questions?.title ?? '—'}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs capitalize text-muted-foreground hidden sm:inline">{s.session_type}</span>
                  <span className="text-xs font-medium">{s.confidence}/5</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
