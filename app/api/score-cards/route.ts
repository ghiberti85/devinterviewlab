import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, sanitizeError } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { aiService } from '@/lib/ai/ai.service'
import { aggregateRadar, averageScore } from '@/lib/utils/score-card.utils'
import type { AIEvaluation } from '@/lib/supabase/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data, error } = await supabase
      .from('score_cards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    logger.error('score-cards GET failed', err, { userId: user.id })
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await checkRateLimit('score-card')
  if (!rl.allowed) return rl.response

  try {
    const body = await req.json() as {
      evaluation_ids: string[]
      session_label?: string
      language?: string
    }

    const { evaluation_ids, session_label, language = 'en' } = body

    if (!Array.isArray(evaluation_ids) || evaluation_ids.length === 0) {
      return NextResponse.json({ error: 'evaluation_ids must be a non-empty array' }, { status: 400 })
    }

    // Two separate queries — Supabase doesn't support subqueries in .in()
    const { data: evals, error: evalsError } = await supabase
      .from('ai_evaluations')
      .select('id, user_id, score, feedback')
      .in('id', evaluation_ids)

    if (evalsError) throw evalsError

    // Filter by user_id to ensure ownership
    const userEvals = (evals ?? []).filter(
      (e: Pick<AIEvaluation, 'id' | 'user_id' | 'score' | 'feedback'>) => e.user_id === user.id
    )

    if (userEvals.length === 0) {
      return NextResponse.json({ error: 'No valid evaluations found' }, { status: 404 })
    }

    const radar = aggregateRadar(
      userEvals.map(e => ({ feedback: { score_breakdown: e.feedback.score_breakdown } }))
    )
    const overall_score = averageScore(userEvals.map(e => e.score))

    const aiResult = await aiService.generateScoreCard(
      userEvals.map(e => ({
        score: e.score,
        strengths: e.feedback.strengths ?? [],
        gaps: e.feedback.gaps ?? [],
        missing_concepts: e.feedback.missing_concepts ?? [],
      })),
      language
    )

    const { data: scoreCard, error: insertError } = await supabase
      .from('score_cards')
      .insert({
        user_id: user.id,
        session_label: session_label ?? null,
        evaluation_ids: userEvals.map(e => e.id),
        overall_score,
        radar,
        strengths: aiResult.top_strengths,
        gaps: aiResult.top_gaps,
        missing_concepts: aiResult.missing_concepts,
        recommendation: aiResult.recommendation || null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    logger.info('score card created', { userId: user.id, scoreCardId: scoreCard.id })
    return NextResponse.json(scoreCard, { status: 201 })
  } catch (err) {
    logger.error('score-cards POST failed', err, { userId: user.id })
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 })
  }
}
