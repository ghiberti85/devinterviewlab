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

  const targetLanguage = language === 'en' ? 'pt' : 'en'
  const start = Date.now()

  try {
    // Return existing if same title + language already exists
    const { data: existing } = await supabase
      .from('topics')
      .select('*')
      .eq('user_id', user.id)
      .ilike('title', topicName.trim())
      .eq('language', language)
      .limit(1)
      .single()

    if (existing) {
      return NextResponse.json(existing, { status: 200 })
    }

    // Fetch existing topic titles + summaries to help the AI avoid redundant content
    const { data: existingTopicsRows } = await supabase
      .from('topics')
      .select('title, summary')
      .eq('user_id', user.id)
      .eq('language', language)
    const existingTopics = (existingTopicsRows ?? []).map((r: { title: string; summary: string }) => ({
      title: r.title,
      // Send first 80 words of the summary so the AI knows what ground is already covered
      summarySnippet: r.summary?.split(' ').slice(0, 80).join(' ') ?? '',
    }))

    // Generate in the requested language
    const generated = await aiService.generateTopic({ topicName: topicName.trim(), difficulty, language, existingTopics: existingTopics as { title: string; summarySnippet: string }[] })

    const { data, error } = await supabase
      .from('topics')
      .insert({
        user_id: user.id,
        category_id: categoryId ?? null,
        title: generated.title,
        difficulty,
        summary: generated.summary,
        when_to_use: generated.when_to_use,
        pros: generated.pros ?? [],
        cons: generated.cons ?? [],
        code_snippet: generated.code_snippet,
        quick_qa: generated.quick_qa,
        tags: generated.tags,
        language,
        translated_from: null,
      })
      .select()
      .single()

    if (error) throw error

    // Auto-translate to the other language (background — non-blocking for the response)
    type TranslatedTopic = { title: string; summary: string; when_to_use: string; pros: string[]; cons: string[]; quick_qa: { q: string; a: string }[]; tags: string[] }
    let translatedData: TranslatedTopic | null = null
    try {
      const raw = await aiService.translateTopic({
        topic: {
          title: generated.title,
          summary: generated.summary,
          when_to_use: generated.when_to_use ?? '',
          pros: generated.pros ?? [],
          cons: generated.cons ?? [],
          quick_qa: generated.quick_qa,
          tags: generated.tags,
        },
        targetLanguage,
      })
      translatedData = raw as TranslatedTopic

      await supabase.from('topics').insert({
        user_id: user!.id,
        category_id: categoryId ?? null,
        title: translatedData.title,
        difficulty,
        summary: translatedData.summary,
        when_to_use: translatedData.when_to_use,
        pros: translatedData.pros ?? [],
        cons: translatedData.cons ?? [],
        code_snippet: generated.code_snippet,
        quick_qa: translatedData.quick_qa,
        tags: translatedData.tags,
        language: targetLanguage,
        translated_from: data.id,
      })
    } catch (translateErr) {
      logger.warn('Failed to auto-translate topic', { userId: user!.id, topicId: data.id, error: String(translateErr) })
    }

    // Auto-create practice questions for BOTH languages — deduplicate by title
    const { data: existingQs } = await supabase.from('questions').select('title').eq('user_id', user.id)
    const existingTitles = new Set((existingQs ?? []).map((q: { title: string }) => q.title.toLowerCase()))

    const questionsToInsert: object[] = []

    for (const { q, a } of (generated.quick_qa ?? [])) {
      if (!existingTitles.has(q.toLowerCase())) {
        questionsToInsert.push({ user_id: user.id, category_id: categoryId ?? null, title: q, body: null, ideal_answer: a, difficulty, language, is_behavioral: false })
        existingTitles.add(q.toLowerCase())
      }
    }

    if (translatedData) {
      for (const { q, a } of (translatedData.quick_qa ?? [])) {
        if (!existingTitles.has(q.toLowerCase())) {
          questionsToInsert.push({ user_id: user.id, category_id: categoryId ?? null, title: q, body: null, ideal_answer: a, difficulty, language: targetLanguage, is_behavioral: false })
          existingTitles.add(q.toLowerCase())
        }
      }
    }

    if (questionsToInsert.length) {
      const { error: qErr } = await supabase.from('questions').insert(questionsToInsert)
      if (qErr) logger.warn('Failed to create questions from quick_qa', { userId: user.id, error: qErr.message })
    }

    // Auto-create concepts in BOTH languages
    try {
      const { data: existingConcepts } = await supabase.from('concepts').select('id, name, language').eq('user_id', user.id)
      const existingNames = new Map<string, string>(
        (existingConcepts ?? []).map((c: { id: string; name: string; language: string }) => [`${c.name.toLowerCase()}:${c.language}`, c.id])
      )

      async function createConceptPair(
        primaryName: string, primaryDesc: string | null, primaryLang: string,
        translatedName: string | null, translatedDesc: string | null, translatedLang: string
      ) {
        const primaryKey = `${primaryName.toLowerCase()}:${primaryLang}`
        let primaryId: string | null = existingNames.get(primaryKey) ?? null

        if (!primaryId) {
          const { data: c } = await supabase
            .from('concepts')
            .insert({ user_id: user!.id, name: primaryName, description: primaryDesc, language: primaryLang, translated_from: null })
            .select('id').single()
          if (c) { primaryId = c.id; existingNames.set(primaryKey, primaryId!) }
        }

        if (translatedName && primaryId) {
          const translatedKey = `${translatedName.toLowerCase()}:${translatedLang}`
          if (!existingNames.has(translatedKey)) {
            const { data: c } = await supabase
              .from('concepts')
              .insert({ user_id: user!.id, name: translatedName, description: translatedDesc, language: translatedLang, translated_from: primaryId })
              .select('id').single()
            if (c) existingNames.set(translatedKey, c.id)
          }
        }

        return primaryId
      }

      // Root concept (topic title)
      const rootId = await createConceptPair(
        generated.title, generated.summary, language,
        translatedData?.title ?? null, translatedData?.summary ?? null, targetLanguage
      )

      // Tag concepts linked to root
      if (rootId && generated.tags?.length) {
        const allTags = generated.tags
        const translatedTags = translatedData?.tags ?? []

        for (let i = 0; i < allTags.length; i++) {
          const tagId = await createConceptPair(
            allTags[i], null, language,
            translatedTags[i] ?? null, null, targetLanguage
          )
          if (tagId) {
            await supabase.from('concept_relations').insert({ source_id: tagId, target_id: rootId, relation_type: 'part_of' })
          }
        }
      }
    } catch (conceptErr) {
      logger.warn('Failed to create concepts from topic', { userId: user.id, error: String(conceptErr) })
    }

    await logUsage({ userId: user.id, endpoint: 'topic', durationMs: Date.now() - start })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    logger.error('Failed to generate topic', err, { userId: user.id, topicName })
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 })
  }
}
