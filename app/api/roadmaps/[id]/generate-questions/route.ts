import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { checkRateLimit, sanitizeError } from '@/lib/api/rate-limit'
import { aiService } from '@/lib/ai/ai.service'
import type { RoadmapQuestion } from '@/lib/supabase/types'

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

// DELETE /api/roadmaps/[id]/generate-questions — clears all questions for the roadmap
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('roadmap_questions')
    .delete()
    .eq('roadmap_id', id)
    .eq('user_id', user.id)

  if (error) {
    logger.error('Failed to delete roadmap questions', error, { userId: user.id, roadmapId: id })
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}

// POST /api/roadmaps/[id]/generate-questions
// Body: { topicName, phaseName, language?, existingQuestions? }
// Generates Q&A for a single topic and appends (no delete). Skips if topic already has questions.
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

  const body = await request.json().catch(() => ({})) as {
    topicName?: string
    phaseName?: string
    language?: string
    existingQuestions?: string[]
  }

  const { topicName, phaseName, language = 'en', existingQuestions = [] } = body

  if (!topicName || !phaseName) {
    return NextResponse.json({ error: 'topicName and phaseName are required.' }, { status: 400 })
  }

  // Verify roadmap belongs to user
  const { data: roadmap, error: roadmapError } = await supabase
    .from('study_roadmaps')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (roadmapError || !roadmap) {
    return NextResponse.json({ error: 'Roadmap not found.' }, { status: 404 })
  }

  // Get the current max question_order for this roadmap to append correctly
  const { data: orderData } = await supabase
    .from('roadmap_questions')
    .select('question_order')
    .eq('roadmap_id', id)
    .eq('user_id', user.id)
    .order('question_order', { ascending: false })
    .limit(1)

  let questionOrder = orderData?.[0]?.question_order != null ? orderData[0].question_order + 1 : 0

  // Generate Q&A for the topic
  let pairs: Array<{ question: string; answer: string }> = []
  try {
    pairs = await aiService.generateRoadmapQuestions({
      topicName,
      phaseName,
      language,
      existingQuestions,
    })
  } catch (err) {
    logger.error('Failed to generate questions for topic', err as Error, {
      userId: user.id,
      roadmapId: id,
      topic: topicName,
    })
    return NextResponse.json({ error: 'AI generation failed.' }, { status: 500 })
  }

  if (pairs.length === 0) {
    return NextResponse.json({ count: 0 })
  }

  // DB-level dedup: filter out questions already stored for this roadmap+topic
  const { data: storedQs } = await supabase
    .from('roadmap_questions')
    .select('question')
    .eq('roadmap_id', id)
    .eq('user_id', user.id)
    .eq('topic_name', topicName)

  const storedTexts = new Set((storedQs ?? []).map((q: { question: string }) => q.question.toLowerCase()))
  const dedupedPairs = pairs.filter(p => !storedTexts.has(p.question.toLowerCase()))

  if (dedupedPairs.length === 0) {
    return NextResponse.json({ count: 0 })
  }

  const toInsert: Omit<RoadmapQuestion, 'id' | 'created_at'>[] = dedupedPairs.map(pair => ({
    roadmap_id: id,
    user_id: user.id,
    phase_name: phaseName,
    topic_name: topicName,
    question: pair.question,
    answer: pair.answer,
    question_order: questionOrder++,
  }))

  const { error: insertError } = await supabase
    .from('roadmap_questions')
    .insert(toInsert)

  if (insertError) {
    logger.error('Failed to insert roadmap questions', insertError, { userId: user.id, roadmapId: id })
    return NextResponse.json({ error: sanitizeError(insertError) }, { status: 500 })
  }

  logger.info('Generated roadmap questions for topic', { userId: user.id, roadmapId: id, topic: topicName, count: dedupedPairs.length })
  return NextResponse.json({ count: pairs.length })
}
