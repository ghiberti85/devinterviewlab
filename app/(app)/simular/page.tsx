'use client'

import Link from 'next/link'
import { MessageSquare, Code2, ChevronRight, Clock, BookMarked } from 'lucide-react'
import { useT } from '@/lib/i18n/useT'
import { useEvaluations } from '@/features/evaluations/hooks/useEvaluations'
import { useCodingSessions } from '@/features/live-coding/hooks/useLiveCoding'
import { useTopics } from '@/features/topics/hooks/useTopics'
import { useSettingsStore } from '@/store/settings.store'

export default function SimularPage() {
  const t = useT()
  const { language } = useSettingsStore()
  const { data: evalPages } = useEvaluations(1)
  const { data: sessions } = useCodingSessions()
  const { data: topicPairs } = useTopics(language as string)

  const recentEvals = evalPages?.data?.slice(0, 3) ?? []
  const recentSessions = sessions?.slice(0, 3) ?? []

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">{t.nav.simulate}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.simulate.subtitle}</p>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/interview" className="group border rounded-xl p-5 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <MessageSquare size={20} className="text-primary" />
            </div>
            <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors mt-1" />
          </div>
          <h2 className="font-semibold text-sm mb-1">{t.simulate.interviewTitle}</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">{t.simulate.interviewDesc}</p>
        </Link>

        <Link href="/live-coding" className="group border rounded-xl p-5 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-green-500/10">
              <Code2 size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors mt-1" />
          </div>
          <h2 className="font-semibold text-sm mb-1">{t.simulate.codingTitle}</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">{t.simulate.codingDesc}</p>
        </Link>
      </div>

      {/* Recent interviews */}
      {recentEvals.length > 0 && (
        <div className="border rounded-xl p-5 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">{t.simulate.recentInterviews}</h2>
            <Link href="/history" className="text-xs text-primary hover:underline">{t.simulate.viewAll}</Link>
          </div>
          <div className="divide-y">
            {recentEvals.map((e: any) => (
              <Link key={e.id} href={`/history/${e.id}`} className="flex items-center justify-between min-h-[44px] py-2 hover:bg-accent/50 -mx-2 px-2 rounded-md transition-colors">
                <span className="text-sm truncate flex-1 text-muted-foreground pr-3">{e.questions?.title ?? '—'}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium tabular-nums ${e.score >= 75 ? 'text-green-600' : e.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {Math.round(e.score)}/100
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(e.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Topics to practice */}
      {topicPairs && topicPairs.length > 0 && (
        <div className="border rounded-xl p-5 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <BookMarked size={14} className="text-muted-foreground" />
              {t.topics.topicsForSimulate}
            </h2>
          </div>
          <div className="divide-y">
            {topicPairs.slice(0, 6).map(pair => {
              const topic = pair.current ?? pair.other
              if (!topic) return null
              return (
                <div key={pair.rootId} className="flex items-center gap-1 py-0.5">
                  <Link
                    href={`/interview?search=${encodeURIComponent(topic.title)}`}
                    className="flex-1 min-w-0 flex items-center gap-3 px-2 py-3 min-h-[44px] rounded-md hover:bg-accent transition-colors group"
                  >
                    <MessageSquare size={14} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    <span className="text-sm truncate">{topic.title}</span>
                  </Link>
                  <Link
                    href="/live-coding"
                    className="flex items-center justify-center w-11 h-11 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-green-600 shrink-0"
                    title={t.simulate.codingTitle}
                  >
                    <Code2 size={16} />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent coding sessions */}
      {recentSessions.length > 0 && (
        <div className="border rounded-xl p-5 bg-card space-y-3">
          <h2 className="text-sm font-medium">{t.simulate.recentCoding}</h2>
          <div className="divide-y">
            {recentSessions.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between min-h-[44px] py-2">
                <span className="text-sm truncate flex-1 text-muted-foreground pr-3">{s.problem_title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:block">{s.language}</span>
                  {s.score !== null && (
                    <span className={`text-xs font-medium tabular-nums ${s.score >= 75 ? 'text-green-600' : s.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {s.score}/100
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
