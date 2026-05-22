'use client'

import Link from 'next/link'
import { MessageSquare, Code2, ChevronRight, Clock } from 'lucide-react'
import { useT } from '@/lib/i18n/useT'
import { useEvaluations } from '@/features/evaluations/hooks/useEvaluations'
import { useCodingSessions } from '@/features/live-coding/hooks/useLiveCoding'

export default function SimularPage() {
  const t = useT()
  const { data: evalPages } = useEvaluations(1)
  const { data: sessions } = useCodingSessions()

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
          <div className="space-y-2">
            {recentEvals.map((e: any) => (
              <Link key={e.id} href={`/history/${e.id}`} className="flex items-center justify-between py-2 border-b last:border-0 hover:opacity-80 transition-opacity">
                <span className="text-sm truncate flex-1 text-muted-foreground">{e.questions?.title ?? '—'}</span>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className={`text-xs font-medium tabular-nums ${e.score >= 75 ? 'text-green-600' : e.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {Math.round(e.score)}/100
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(e.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent coding sessions */}
      {recentSessions.length > 0 && (
        <div className="border rounded-xl p-5 bg-card space-y-3">
          <h2 className="text-sm font-medium">{t.simulate.recentCoding}</h2>
          <div className="space-y-2">
            {recentSessions.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm truncate flex-1 text-muted-foreground">{s.problem_title}</span>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-xs text-muted-foreground">{s.language}</span>
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
