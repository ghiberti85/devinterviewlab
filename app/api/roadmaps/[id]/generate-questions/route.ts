import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { checkRateLimit, sanitizeError } from '@/lib/api/rate-limit'
import { aiService } from '@/lib/ai/ai.service'
import type { RoadmapQuestion } from '@/lib/supabase/types'

// GET — returns existing questions for the roadmap
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

// DELETE — clears all questions for the roadmap
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

// POST — generates questions for ONE topic in BOTH EN and PT
// Body: { topicName, phaseName }
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
  }

  const { topicName, phaseName } = body

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

  // Fetch existing questions per language for dedup (server handles it — client doesn't need to)
  const { data: existingRows } = await supabase
    .from('roadmap_questions')
    .select('question, language')
    .eq('roadmap_id', id)
    .eq('user_id', user.id)
    .eq('topic_name', topicName)

  const existingEn = (existingRows ?? []).filter(q => q.language === 'en').map(q => q.question)
  const existingPt = (existingRows ?? []).filter(q => q.language === 'pt').map(q => q.question)

  // Get current max question_order to append correctly
  const { data: orderData } = await supabase
    .from('roadmap_questions')
    .select('question_order')
    .eq('roadmap_id', id)
    .eq('user_id', user.id)
    .order('question_order', { ascending: false })
    .limit(1)

  let questionOrder = orderData?.[0]?.question_order != null ? orderData[0].question_order + 1 : 0

  // Generate EN and PT in parallel
  const [enPairs, ptPairs] = await Promise.all([
    aiService.generateRoadmapQuestions({ topicName, phaseName, language: 'en', existingQuestions: existingEn }).catch(err => {
      logger.error('Failed to generate EN questions', err as Error, { userId: user.id, roadmapId: id, topic: topicName })
      return []
    }),
    aiService.generateRoadmapQuestions({ topicName, phaseName, language: 'pt', existingQuestions: existingPt }).catch(err => {
      logger.error('Failed to generate PT questions', err as Error, { userId: user.id, roadmapId: id, topic: topicName })
      return []
    }),
  ])

  // DB-level dedup (safety net)
  const enTexts = new Set(existingEn.map(q => q.toLowerCase()))
  const ptTexts = new Set(existingPt.map(q => q.toLowerCase()))
  const dedupedEn = enPairs.filter(p => !enTexts.has(p.question.toLowerCase()))
  const dedupedPt = ptPairs.filter(p => !ptTexts.has(p.question.toLowerCase()))

  const toInsert: Omit<RoadmapQuestion, 'id' | 'created_at'>[] = [
    ...dedupedEn.map(pair => ({
      roadmap_id: id, user_id: user.id, phase_name: phaseName, topic_name: topicName,
      question: pair.question, answer: pair.answer, question_order: questionOrder++, language: 'en',
    })),
    ...dedupedPt.map(pair => ({
      roadmap_id: id, user_id: user.id, phase_name: phaseName, topic_name: topicName,
      question: pair.question, answer: pair.answer, question_order: questionOrder++, language: 'pt',
    })),
  ]

  if (toInsert.length === 0) {
    return NextResponse.json({ count: 0 })
  }

  const { error: insertError } = await supabase.from('roadmap_questions').insert(toInsert)

  if (insertError) {
    logger.error('Failed to insert roadmap questions', insertError, { userId: user.id, roadmapId: id })
    return NextResponse.json({ error: sanitizeError(insertError) }, { status: 500 })
  }

  logger.info('Generated bilingual roadmap questions', {
    userId: user.id, roadmapId: id, topic: topicName,
    en: dedupedEn.length, pt: dedupedPt.length,
  })
  return NextResponse.json({ count: toInsert.length })
}
