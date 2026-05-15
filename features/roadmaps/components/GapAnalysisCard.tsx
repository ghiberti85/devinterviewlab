'use client'

import { useT } from '@/lib/i18n/useT'
import type { GapAnalysis } from '@/lib/supabase/types'

interface Props {
  gap_analysis: GapAnalysis
  job_title: string | null
}

export function GapAnalysisCard({ gap_analysis, job_title }: Props) {
  const t = useT()
  const { match_score, matched_skills, missing_skills, summary } = gap_analysis

  const barColor =
    match_score >= 70
      ? 'bg-green-500'
      : match_score >= 50
        ? 'bg-yellow-500'
        : 'bg-red-500'

  const scoreTextColor =
    match_score >= 70
      ? 'text-green-600 dark:text-green-400'
      : match_score >= 50
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-red-600 dark:text-red-400'

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      {job_title && (
        <h2 className="text-lg font-semibold">{job_title}</h2>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">{t.roadmap.matchScore}</span>
          <span className={`text-sm font-bold ${scoreTextColor}`}>{match_score}%</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${match_score}%` }}
          />
        </div>
      </div>

      {summary && (
        <p className="text-sm text-muted-foreground">{summary}</p>
      )}

      {matched_skills.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">{t.roadmap.matchedSkills}</p>
          <div className="flex flex-wrap gap-1.5">
            {matched_skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs px-2.5 py-0.5 font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {missing_skills.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">{t.roadmap.missingSkills}</p>
          <div className="flex flex-wrap gap-1.5">
            {missing_skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs px-2.5 py-0.5 font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
