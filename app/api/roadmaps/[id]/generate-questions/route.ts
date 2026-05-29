import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { checkRateLimit, sanitizeError } from '@/lib/api/rate-limit'
import { aiService } from '@/lib/ai/ai.service'
import type { RoadmapQuestion, StudyRoadmap } from '@/lib/supabase/types'

// GET /api/roadmaps/[id]/generate-questions — returns existing questions
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('roadmap_questions')
    .select('*')
    .eq('roadmap_id', id)
    .eq('user_id', user.id)
    .order('question_order', { ascending: true })

  if (error) {
    logger.error('Failed to fetch roadmap questions', error, { userId: user.id, roadmapId: id })
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

// POST /api/roadmaps/[id]/generate-questions — generates Q&A for all topics
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await checkRateLimit('roadmap-generate-questions')
  if (!rl.allowed) return rl.response

  // Fetch the roadmap
  const { data: roadmap, error: roadmapError } = await supabase
    .from('study_roadmaps')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (roadmapError || !roadmap) {
    return NextResponse.json({ error: 'Roadmap not found.' }, { status: 404 })
  }

  const typedRoadmap = roadmap as StudyRoadmap

  // Get language from request body or default to 'en'
  let language = 'en'
  try {
    const body = await request.json().catch(() => ({}))
    if (body.language) language = body.language
  } catch {
    // ignore parse errors, use default
  }

  const phases = typedRoadmap.roadmap?.phases ?? []
  if (phases.length === 0) {
    return NextResponse.json({ error: 'Roadmap has no phases.' }, { status: 400 })
  }

  // Delete existing questions for this roadmap
  const { error: deleteError } = await supabase
    .from('roadmap_questions')
    .delete()
    .eq('roadmap_id', id)
    .eq('user_id', user.id)

  if (deleteError) {
    logger.error('Failed to delete old roadmap questions', deleteError, { userId: user.id, roadmapId: id })
    return NextResponse.json({ error: sanitizeError(deleteError) }, { status: 500 })
  }

  // Generate Q&A for each topic in each phase
  const allQuestions: Omit<RoadmapQuestion, 'id' | 'created_at'>[] = []
  let questionOrder = 0

  for (const phase of phases) {
    const phaseName = phase.label
    for (const topic of phase.topics) {
      try {
        const pairs = await aiService.generateRoadmapQuestions({
          topicName: topic.name,
          phaseName,
          language,
        })
        for (const pair of pairs) {
          allQuestions.push({
            roadmap_id: id,
            user_id: user.id,
            phase_name: phaseName,
            topic_name: topic.name,
            question: pair.question,
            answer: pair.answer,
            question_order: questionOrder++,
          })
        }
      } catch (err) {
        logger.error('Failed to generate questions for topic', err as Error, {
          userId: user.id,
          roadmapId: id,
          topic: topic.name,
        })
        // Continue with other topics even if one fails
      }
    }
  }

  if (allQuestions.length === 0) {
    return NextResponse.json({ error: 'No questions generated.' }, { status: 500 })
  }

  // Insert all questions in batches of 50
  const BATCH_SIZE = 50
  let inserted = 0
  for (let i = 0; i < allQuestions.length; i += BATCH_SIZE) {
    const batch = allQuestions.slice(i, i + BATCH_SIZE)
    const { error: insertError } = await supabase
      .from('roadmap_questions')
      .insert(batch)

    if (insertError) {
      logger.error('Failed to insert roadmap questions batch', insertError, { userId: user.id, roadmapId: id })
      return NextResponse.json({ error: sanitizeError(insertError) }, { status: 500 })
    }
    inserted += batch.length
  }

  logger.info('Generated roadmap questions', { userId: user.id, roadmapId: id, count: inserted })
  return NextResponse.json({ count: inserted })
}
