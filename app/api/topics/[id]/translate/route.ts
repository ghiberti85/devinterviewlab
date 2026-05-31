import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiService } from '@/lib/ai/ai.service'
import { checkRateLimit, logUsage, sanitizeError } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

// Node runtime — avoids Edge restrictions with the OpenAI singleton client

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await checkRateLimit('topic-translate')
  if (!rl.allowed) return rl.response

  // Load original topic
  const { data: original, error: fetchErr } = await supabase
    .from('topics')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !original) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const targetLanguage = original.language === 'en' ? 'pt' : 'en'

  // Check if translation already exists to avoid duplicates
  const { data: existing } = await supabase
    .from('topics')
    .select('id')
    .eq('user_id', user.id)
    .eq('translated_from', id)
    .eq('language', targetLanguage)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Translation already exists', id: existing.id }, { status: 409 })

  const start = Date.now()
  try {
    const translated = await aiService.translateTopic({
      topic: {
        title: original.title,
        summary: original.summary,
        when_to_use: original.when_to_use,
        pros: original.pros ?? [],
        cons: original.cons ?? [],
        quick_qa: original.quick_qa,
        tags: original.tags,
      },
      targetLanguage,
    })

    const { data: newTopic, error: insertErr } = await supabase
      .from('topics')
      .insert({
        user_id: user.id,
        category_id: original.category_id,
        title: translated.title,
        difficulty: original.difficulty,
        summary: translated.summary,
        when_to_use: translated.when_to_use,
        pros: translated.pros ?? [],
        cons: translated.cons ?? [],
        code_snippet: original.code_snippet,
        quick_qa: translated.quick_qa,
        tags: translated.tags,
        language: targetLanguage,
        translated_from: id,
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    await logUsage({ userId: user.id, endpoint: 'topic-translate', durationMs: Date.now() - start })
    logger.info('Topic translated', { userId: user.id, originalId: id, targetLanguage })
    return NextResponse.json(newTopic, { status: 201 })
  } catch (err) {
    logger.error('Failed to translate topic', err, { userId: user.id, topicId: id })
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 })
  }
}
