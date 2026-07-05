import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiService } from '@/lib/ai/ai.service'
import { checkRateLimit, logUsage, sanitizeError } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import type { Topic } from '@/lib/supabase/types'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

// Caps how many translation gaps GET /api/topics heals per request, so a large
// backlog can't push the response past the serverless function timeout — any
// remainder self-heals on the next load (oldest gaps first).
const MAX_GAPS_HEALED_PER_REQUEST = 3

type TranslatedTopic = {
  title: string
  summary: string
  when_to_use: string
  pros: string[]
  cons: string[]
  quick_qa: { q: string; a: string }[]
  tags: string[]
}

type TopicSource = {
  id: string
  title: string
  summary: string
  when_to_use: string | null
  pros: string[]
  cons: string[]
  code_snippet: string | null
  quick_qa: { q: string; a: string }[]
  tags: string[]
  difficulty: string
  category_id: string | null
}

// Generates the missing-language counterpart for a topic and persists it.
// Used to backfill a translation gap right after a fresh generation, when an
// existing topic is re-requested, and to self-heal any gap found on read —
// every topic must end up bilingual, regardless of how the gap appeared.
async function insertTranslatedTopic(
  supabase: SupabaseServerClient,
  userId: string,
  source: TopicSource,
  rootId: string,
  targetLanguage: string
): Promise<Topic | null> {
  try {
    const translated = await aiService.translateTopic({
      topic: {
        title: source.title,
        summary: source.summary,
        when_to_use: source.when_to_use ?? '',
        pros: source.pros ?? [],
        cons: source.cons ?? [],
        quick_qa: source.quick_qa,
        tags: source.tags,
      },
      targetLanguage,
    }) as TranslatedTopic

    const { data: inserted, error } = await supabase
      .from('topics')
      .insert({
        user_id: userId,
        category_id: source.category_id ?? null,
        title: translated.title,
        difficulty: source.difficulty,
        summary: translated.summary,
        when_to_use: translated.when_to_use,
        pros: translated.pros ?? [],
        cons: translated.cons ?? [],
        code_snippet: source.code_snippet,
        quick_qa: translated.quick_qa,
        tags: translated.tags,
        language: targetLanguage,
        translated_from: rootId,
      })
      .select()
      .single()

    if (error) throw error
    return inserted as Topic
  } catch (translateErr) {
    logger.warn('Failed to translate topic', { userId, topicId: source.id, error: String(translateErr) })
    return null
  }
}

// Finds topics whose bilingual counterpart is missing, oldest first, so a
// backlog of pre-existing gaps closes in a stable order across requests.
function findTranslationGaps(topics: Topic[]): Array<{ rootId: string; source: Topic; targetLanguage: 'en' | 'pt' }> {
  const byRoot = new Map<string, { en?: Topic; pt?: Topic }>()

  for (const topic of topics) {
    const rootId = topic.translated_from ?? topic.id
    const entry = byRoot.get(rootId) ?? {}
    if (topic.language === 'en') entry.en = topic
    else if (topic.language === 'pt') entry.pt = topic
    byRoot.set(rootId, entry)
  }

  const gaps: Array<{ rootId: string; source: Topic; targetLanguage: 'en' | 'pt' }> = []
  for (const [rootId, { en, pt }] of byRoot) {
    if (en && !pt) gaps.push({ rootId, source: en, targetLanguage: 'pt' })
    else if (pt && !en) gaps.push({ rootId, source: pt, targetLanguage: 'en' })
  }

  return gaps.sort((a, b) => a.source.created_at.localeCompare(b.source.created_at))
}

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

  const topics = (data ?? []) as Topic[]

  // Self-heal: close any bilingual gap found in existing data (from before this
  // guarantee existed, or from any future edge case), a few at a time so this
  // request never risks a serverless timeout. The client never has to know —
  // it just sees a topic list that keeps getting more complete over time.
  const gaps = findTranslationGaps(topics).slice(0, MAX_GAPS_HEALED_PER_REQUEST)
  for (const gap of gaps) {
    const healed = await insertTranslatedTopic(supabase, user.id, gap.source, gap.rootId, gap.targetLanguage)
    if (healed) topics.push(healed)
  }

  return NextResponse.json(topics)
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
      // Never leave a topic without its counterpart language — backfill if missing.
      const rootId = existing.translated_from ?? existing.id
      const { data: counterpart } = await supabase
        .from('topics')
        .select('id')
        .eq('user_id', user.id)
        .eq('language', targetLanguage)
        .or(`id.eq.${rootId},translated_from.eq.${rootId}`)
        .limit(1)
        .maybeSingle()

      if (!counterpart) {
        await insertTranslatedTopic(supabase, user.id, existing, rootId, targetLanguage)
      }

      return NextResponse.json(existing, { status: 200 })
    }

    // Fetch all existing titles + summaries of the 8 most recent for anti-repetition context
    const { data: allTitlesRows } = await supabase
      .from('topics')
      .select('title, created_at')
      .eq('user_id', user.id)
      .eq('language', language)
      .order('created_at', { ascending: false })
    const { data: recentWithSummary } = await supabase
      .from('topics')
      .select('title, summary')
      .eq('user_id', user.id)
      .eq('language', language)
      .not('summary', 'is', null)
      .order('created_at', { ascending: false })
      .limit(8)
    const allTitles = (allTitlesRows ?? []).map((r: { title: string }) => r.title)
    const existingTopics = (recentWithSummary ?? []).map((r: { title: string; summary: string }) => ({
      title: r.title,
      summarySnippet: r.summary.split(' ').slice(0, 40).join(' '),
    }))

    // Generate in the requested language
    const generated = await aiService.generateTopic({ topicName: topicName.trim(), difficulty, language, allExistingTitles: allTitles, existingTopics })

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

    // Translate to the other language synchronously — every topic must be created bilingual.
    const translatedData = await insertTranslatedTopic(supabase, user.id, data, data.id, targetLanguage)

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
