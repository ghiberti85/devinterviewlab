export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { checkRateLimit, logUsage, sanitizeError } from '@/lib/api/rate-limit'
import { aiService } from '@/lib/ai/ai.service'
import { ndjsonStream } from '@/lib/api/stream'
import { logger } from '@/lib/logger'
import type { StudyRoadmap, RoadmapTopicProgress } from '@/lib/supabase/types'

// GET /api/roadmaps
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const { data: roadmaps, error } = await supabase
    .from('study_roadmaps')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    logger.error('Failed to list roadmaps', error, { userId: user.id })
    return new Response(JSON.stringify({ error: 'Failed to load roadmaps.' }), { status: 500 })
  }

  const roadmapIds = (roadmaps ?? []).map((r) => r.id)
  let progressByRoadmap: Record<string, RoadmapTopicProgress[]> = {}

  if (roadmapIds.length > 0) {
    const { data: progressRows } = await supabase
      .from('roadmap_topic_progress')
      .select('*')
      .eq('user_id', user.id)
      .in('roadmap_id', roadmapIds)

    for (const row of progressRows ?? []) {
      if (!progressByRoadmap[row.roadmap_id]) progressByRoadmap[row.roadmap_id] = []
      progressByRoadmap[row.roadmap_id].push(row as RoadmapTopicProgress)
    }
  }

  const result: StudyRoadmap[] = (roadmaps ?? []).map((r) => ({
    ...r,
    progress: progressByRoadmap[r.id] ?? [],
  }))

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  })
}

// POST /api/roadmaps
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const rl = await checkRateLimit('roadmap')
  if (!rl.allowed) return rl.response

  const body = await request.json().catch(() => ({}))
  const { job_description, cv_text, language } = body as {
    job_description?: string
    cv_text?: string
    language?: string
  }

  if (!cv_text?.trim() && !job_description?.trim()) {
    return new Response(JSON.stringify({ error: 'Provide a job description or CV to generate a roadmap.' }), { status: 400 })
  }
  if (job_description && job_description.length > 8000) {
    return new Response(JSON.stringify({ error: 'job_description must be under 8000 characters.' }), { status: 400 })
  }

  return ndjsonStream(async (emit) => {
    try {
      emit({ status: 'thinking' })

      const effectiveJD = job_description?.trim()
        || 'General software engineering position — analyze the candidate CV and produce a comprehensive study roadmap covering common interview topics for their background.'

      const result = await aiService.analyzeAndGenerateRoadmap({
        cvText: cv_text ? cv_text.slice(0, 3000) : undefined,
        jobDescription: effectiveJD.slice(0, 2000),
        language,
      })

      const { data: roadmap, error: insertError } = await supabase
        .from('study_roadmaps')
        .insert({
          user_id: user.id,
          job_title: result.job_title,
          job_description: job_description ? job_description.slice(0, 8000) : null,
          cv_text_snapshot: cv_text ? cv_text.slice(0, 20000) : null,
          gap_analysis: result.gap_analysis,
          roadmap: result.roadmap,
          status: 'active',
        })
        .select('*')
        .single()

      if (insertError || !roadmap) {
        logger.error('Failed to insert roadmap', insertError, { userId: user.id })
        emit({ status: 'error', error: 'Failed to save roadmap.' })
        return
      }

      // Insert progress rows for each topic in all phases
      const allTopics: { topic_name: string; questions_goal: number }[] = []
      for (const phase of result.roadmap.phases ?? []) {
        for (const topic of phase.topics ?? []) {
          allTopics.push({ topic_name: topic.name, questions_goal: topic.question_count ?? 5 })
        }
      }

      if (allTopics.length > 0) {
        await supabase.from('roadmap_topic_progress').insert(
          allTopics.map((t) => ({
            roadmap_id: roadmap.id,
            user_id: user.id,
            topic_name: t.topic_name,
            questions_goal: t.questions_goal,
          }))
        )
      }

      const { data: progress } = await supabase
        .from('roadmap_topic_progress')
        .select('*')
        .eq('roadmap_id', roadmap.id)
        .eq('user_id', user.id)

      await logUsage({ userId: user.id, endpoint: 'roadmap', status: 'ok' })

      emit({
        status: 'complete',
        data: { ...roadmap, progress: progress ?? [] } satisfies StudyRoadmap,
      })
    } catch (err) {
      logger.error('Roadmap generation failed', err, { userId: user.id })
      emit({ status: 'error', error: sanitizeError(err) })
    }
  })
}
