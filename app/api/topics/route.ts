import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiService } from '@/lib/ai/ai.service'
import { checkRateLimit, logUsage, sanitizeError } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const lang = req.nextUrl.searchParams.get('language') ?? 'en'

  // Fetch topics in the requested language
  const { data: topics, error } = await supabase
    .from('topics')
    .select('*')
    .eq('user_id', user.id)
    .eq('language', lang)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  if (!topics || topics.length === 0) return NextResponse.json([])

  // Find which of these topics already have a translation saved
  // A translation exists as a separate row with translated_from = topic.id
  const ids = topics.map(t => t.id)
  const { data: translations } = await supabase
    .from('topics')
    .select('translated_from')
    .eq('user_id', user.id)
    .neq('language', lang)
    .in('translated_from', ids)

  const translatedSet = new Set((translations ?? []).map(t => t.translated_from))

  const enriched = topics.map(t => ({
    ...t,
    has_translation: translatedSet.has(t.id),
  }))

  return NextResponse.json(enriched)
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

    await logUsage({ userId: user.id, endpoint: 'topic', durationMs: Date.now() - start })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    logger.error('Failed to generate topic', err, { userId: user.id, topicName })
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 })
  }
}
