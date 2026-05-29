import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Fetch all user's topics (any language, no dedup needed — we deduplicate by content below)
    const { data: topics } = await supabase
      .from('topics')
      .select('id, title, summary, tags, quick_qa, difficulty, language, translated_from')
      .eq('user_id', user.id)

    if (!topics?.length) return NextResponse.json({ questions_created: 0, concepts_created: 0 })

    // Only process root topics (not translations) to avoid duplicate Q&A
    const rootTopics = topics.filter(t => !t.translated_from)

    // Fetch existing questions titles (lowercase) to avoid duplicates
    const { data: existingQuestions } = await supabase
      .from('questions')
      .select('title')
      .eq('user_id', user.id)
    const existingQTitles = new Set((existingQuestions ?? []).map((q: { title: string }) => q.title.toLowerCase()))

    // Fetch existing concept names (lowercase) to avoid duplicates
    const { data: existingConcepts } = await supabase
      .from('concepts')
      .select('id, name')
      .eq('user_id', user.id)
    const existingConceptNames = new Map<string, string>(
      (existingConcepts ?? []).map((c: { id: string; name: string }) => [c.name.toLowerCase(), c.id])
    )

    let questionsCreated = 0
    let conceptsCreated = 0

    for (const topic of rootTopics) {
      // --- Questions from quick_qa ---
      const newQuestions = (topic.quick_qa ?? [])
        .filter(({ q }: { q: string }) => !existingQTitles.has(q.toLowerCase()))
        .map(({ q, a }: { q: string; a: string }) => ({
          user_id: user.id,
          category_id: null,
          title: q,
          body: null,
          ideal_answer: a,
          difficulty: topic.difficulty,
          language: topic.language,
          is_behavioral: false,
        }))

      if (newQuestions.length) {
        const { error } = await supabase.from('questions').insert(newQuestions)
        if (!error) {
          questionsCreated += newQuestions.length
          newQuestions.forEach((q: { title: string }) => existingQTitles.add(q.title.toLowerCase()))
        } else {
          logger.warn('sync: failed to insert questions', { topicId: topic.id, error: error.message })
        }
      }

      // --- Concept for topic title ---
      const titleKey = topic.title.toLowerCase()
      let rootConceptId: string | null = existingConceptNames.get(titleKey) ?? null

      if (!rootConceptId) {
        const { data: rootConcept } = await supabase
          .from('concepts')
          .insert({ user_id: user.id, name: topic.title, description: topic.summary ?? null })
          .select('id')
          .single()
        if (rootConcept) {
          rootConceptId = rootConcept.id
          existingConceptNames.set(titleKey, rootConceptId!)
          conceptsCreated++
        }
      }

      // --- Tag concepts with part_of relation ---
      if (rootConceptId && topic.tags?.length) {
        for (const tag of topic.tags as string[]) {
          const tagKey = tag.toLowerCase()
          let tagConceptId: string | null = existingConceptNames.get(tagKey) ?? null

          if (!tagConceptId) {
            const { data: tagConcept } = await supabase
              .from('concepts')
              .insert({ user_id: user.id, name: tag, description: null })
              .select('id')
              .single()
            if (tagConcept) {
              tagConceptId = tagConcept.id
              existingConceptNames.set(tagKey, tagConceptId!)
              conceptsCreated++
            }
          }

          if (tagConceptId) {
            // Ignore duplicate relation errors silently
            await supabase
              .from('concept_relations')
              .insert({ source_id: tagConceptId, target_id: rootConceptId, relation_type: 'part_of' })
          }
        }
      }
    }

    logger.info('Topics synced', { userId: user.id, questionsCreated, conceptsCreated })
    return NextResponse.json({ questions_created: questionsCreated, concepts_created: conceptsCreated })
  } catch (err) {
    logger.error('Topics sync failed', err, { userId: user.id })
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
