import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiService } from '@/lib/ai/ai.service'
import { checkRateLimit, logUsage, sanitizeError } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Return ALL topics (both languages) — client groups them into pairs
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await checkRateLimit('topic')
  if (!rl.allowed) return rl.response

  const body = await req.json()
  const { topicName, difficulty = 'medium', language = 'en', categoryId } = body

  if (!topicName || typeof topicName !== 'string' || topicName.trim().length === 0) {
    return NextResponse.json({ error: 'topicName is required' }, { status: 400 })
  }

  const start = Date.now()
  try {
    const generated = await aiService.generateTopic({
      topicName: topicName.trim(),
      difficulty,
      language,
    })

    const { data, error } = await supabase
      .from('topics')
      .insert({
        user_id: user.id,
        category_id: categoryId ?? null,
        title: generated.title,
        difficulty,
        summary: generated.summary,
        when_to_use: generated.when_to_use,
        code_snippet: generated.code_snippet,
        quick_qa: generated.quick_qa,
        tags: generated.tags,
        language,
        translated_from: null,
      })
      .select()
      .single()

    if (error) throw error

    // Auto-create a Question for each quick_qa pair so they appear in
    // Simulate (interview practice) and Flashcard review automatically.
    if (generated.quick_qa?.length) {
      const questions = generated.quick_qa.map(({ q, a }) => ({
        user_id: user.id,
        category_id: categoryId ?? null,
        title: q,
        body: null,
        ideal_answer: a,
        difficulty,
        language,
        is_behavioral: false,
      }))
      const { error: qErr } = await supabase.from('questions').insert(questions)
      if (qErr) logger.warn('Failed to create questions from quick_qa', { userId: user.id, error: qErr.message })
    }

    await logUsage({ userId: user.id, endpoint: 'topic', durationMs: Date.now() - start })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    logger.error('Failed to generate topic', err, { userId: user.id, topicName })
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 })
  }
}
