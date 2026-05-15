'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useEvaluations } from '@/features/evaluations/hooks/useEvaluations'
import { useT } from '@/lib/i18n/useT'
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    : score >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums ${color}`}>
      {score}
    </span>
  )
}

export default function HistoryPage() {
  const t = useT()
  const h = t.evaluationHistory
  const [page, setPage] = useState(1)
  const { data, isLoading } = useEvaluations(page)

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">{h.title}</h1>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border rounded-xl p-4 bg-card h-16 animate-pulse bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{h.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{h.subtitle}</p>
      </div>

      {!data?.data.length ? (
        <div className="border rounded-xl p-8 bg-card text-center">
          <MessageSquare size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{h.noHistory}</p>
          <Link
            href="/interview"
            className="mt-4 inline-block text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
          >
            {t.nav.interview}
          </Link>
        </div>
      ) : (
        <>
          <div className="border rounded-xl bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{h.question}</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground w-24">{h.score}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground w-32 hidden sm:table-cell">{h.date}</th>
                  <th className="w-28 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.data.map((ev) => (
                  <tr key={ev.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="line-clamp-1 font-medium">
                        {ev.questions?.title ?? '—'}
                      </span>
                      {ev.questions?.difficulty && (
                        <span className="text-xs text-muted-foreground capitalize">
                          {ev.questions.difficulty}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ScoreBadge score={Math.round(ev.score)} />
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                      {new Date(ev.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/history/${ev.id}`}
                        className="text-xs text-primary hover:underline whitespace-nowrap"
                      >
                        {h.viewReplay} →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} /> {h.prev}
              </button>
              <span className="text-muted-foreground">
                {h.page} {page} {h.of} {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {h.next} <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
