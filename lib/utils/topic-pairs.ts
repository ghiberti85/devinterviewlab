import type { Topic, TopicPair } from '@/lib/supabase/types'

/**
 * Groups a flat list of topics (both languages) into ordered pairs.
 *
 * Each pair has:
 * - `current`: version in `language` (or null if not translated yet)
 * - `other`:   version in the other language (or null if only one exists)
 *
 * Pairs are sorted by the earliest created_at within the pair so that
 * both language views always show the same sequence.
 */
export function groupIntoPairs(topics: Topic[], language: string): TopicPair[] {
  const map = new Map<string, TopicPair>()

  for (const topic of topics) {
    const rootId = topic.translated_from ?? topic.id

    if (!map.has(rootId)) {
      map.set(rootId, {
        rootId,
        rootCreatedAt: topic.created_at,
        current: null,
        other: null,
      })
    }

    const pair = map.get(rootId)!

    if (topic.created_at < pair.rootCreatedAt) {
      pair.rootCreatedAt = topic.created_at
    }

    if (topic.language === language) {
      pair.current = topic
    } else {
      pair.other = topic
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => a.rootCreatedAt.localeCompare(b.rootCreatedAt)
  )
}
