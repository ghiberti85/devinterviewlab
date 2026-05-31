import { describe, it, expect } from 'vitest'
import { groupIntoPairs } from '@/lib/utils/topic-pairs'
import type { Topic } from '@/lib/supabase/types'

function makeTopic(overrides: Partial<Topic> & { id: string }): Topic {
  return {
    user_id: 'user-1',
    category_id: null,
    title: 'Event Loop',
    difficulty: 'medium',
    summary: 'Summary',
    when_to_use: null,
    code_snippet: null,
    quick_qa: [],
    pros: [],
    cons: [],
    tags: [],
    language: 'en',
    translated_from: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('groupIntoPairs', () => {
  it('returns empty array for empty input', () => {
    expect(groupIntoPairs([], 'en')).toEqual([])
  })

  it('single topic in current language → current set, other null', () => {
    const topic = makeTopic({ id: 'a', language: 'en' })
    const pairs = groupIntoPairs([topic], 'en')
    expect(pairs).toHaveLength(1)
    expect(pairs[0].current).toEqual(topic)
    expect(pairs[0].other).toBeNull()
    expect(pairs[0].rootId).toBe('a')
  })

  it('single topic in other language → current null, other set', () => {
    const topic = makeTopic({ id: 'a', language: 'pt' })
    const pairs = groupIntoPairs([topic], 'en')
    expect(pairs).toHaveLength(1)
    expect(pairs[0].current).toBeNull()
    expect(pairs[0].other).toEqual(topic)
  })

  it('original + translation form a single pair', () => {
    const original = makeTopic({ id: 'a', language: 'pt', created_at: '2026-01-01T00:00:00Z' })
    const translation = makeTopic({ id: 'b', language: 'en', translated_from: 'a', created_at: '2026-01-02T00:00:00Z' })
    const pairs = groupIntoPairs([original, translation], 'en')
    expect(pairs).toHaveLength(1)
    expect(pairs[0].current).toEqual(translation)
    expect(pairs[0].other).toEqual(original)
    expect(pairs[0].rootId).toBe('a')
  })

  it('two independent topics produce two pairs', () => {
    const t1 = makeTopic({ id: 'a', language: 'en', created_at: '2026-01-01T00:00:00Z' })
    const t2 = makeTopic({ id: 'b', language: 'en', created_at: '2026-01-02T00:00:00Z' })
    const pairs = groupIntoPairs([t1, t2], 'en')
    expect(pairs).toHaveLength(2)
  })

  it('pairs are sorted by rootCreatedAt ascending', () => {
    const newer = makeTopic({ id: 'b', language: 'en', created_at: '2026-01-03T00:00:00Z' })
    const older = makeTopic({ id: 'a', language: 'en', created_at: '2026-01-01T00:00:00Z' })
    const pairs = groupIntoPairs([newer, older], 'en')
    expect(pairs[0].rootId).toBe('a')
    expect(pairs[1].rootId).toBe('b')
  })

  it('rootCreatedAt uses the earliest timestamp in the pair', () => {
    const original = makeTopic({ id: 'a', language: 'pt', created_at: '2026-01-05T00:00:00Z' })
    const translation = makeTopic({ id: 'b', language: 'en', translated_from: 'a', created_at: '2026-01-10T00:00:00Z' })
    const pairs = groupIntoPairs([original, translation], 'en')
    expect(pairs[0].rootCreatedAt).toBe('2026-01-05T00:00:00Z')
  })

  it('pair ordering is stable across language switches (same rootId)', () => {
    const ptA = makeTopic({ id: 'a', language: 'pt', created_at: '2026-01-01T00:00:00Z' })
    const enA = makeTopic({ id: 'a-en', language: 'en', translated_from: 'a', created_at: '2026-01-02T00:00:00Z' })
    const ptB = makeTopic({ id: 'b', language: 'pt', created_at: '2026-01-03T00:00:00Z' })
    const enB = makeTopic({ id: 'b-en', language: 'en', translated_from: 'b', created_at: '2026-01-04T00:00:00Z' })

    const pairsEN = groupIntoPairs([ptA, enA, ptB, enB], 'en')
    const pairsPT = groupIntoPairs([ptA, enA, ptB, enB], 'pt')

    expect(pairsEN.map(p => p.rootId)).toEqual(pairsPT.map(p => p.rootId))
  })

  it('mixed: some with translation, some without — correct pair count', () => {
    const t1 = makeTopic({ id: 'a', language: 'en', created_at: '2026-01-01T00:00:00Z' })
    const t1pt = makeTopic({ id: 'a-pt', language: 'pt', translated_from: 'a', created_at: '2026-01-02T00:00:00Z' })
    const t2 = makeTopic({ id: 'b', language: 'en', created_at: '2026-01-03T00:00:00Z' }) // no translation
    const pairs = groupIntoPairs([t1, t1pt, t2], 'en')
    expect(pairs).toHaveLength(2)
    expect(pairs[0].current).toEqual(t1)
    expect(pairs[0].other).toEqual(t1pt)
    expect(pairs[1].current).toEqual(t2)
    expect(pairs[1].other).toBeNull()
  })

  it('translation-only topic (no root in list) forms its own pair', () => {
    const orphan = makeTopic({ id: 'x', language: 'en', translated_from: 'missing-root' })
    const pairs = groupIntoPairs([orphan], 'en')
    expect(pairs).toHaveLength(1)
    expect(pairs[0].rootId).toBe('missing-root')
    expect(pairs[0].current).toEqual(orphan)
  })
})
