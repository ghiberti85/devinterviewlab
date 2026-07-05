import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  logUsage: vi.fn(),
  sanitizeError: vi.fn((e: unknown) => (e instanceof Error ? e.message : String(e))),
}))

vi.mock('@/lib/ai/ai.service', () => ({
  aiService: { generateTopic: vi.fn(), translateTopic: vi.fn() },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { GET, POST } from '@/app/api/topics/route'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { aiService } from '@/lib/ai/ai.service'

const mockCreateClient = vi.mocked(createClient)
const mockCheckRateLimit = vi.mocked(checkRateLimit)
const mockTranslateTopic = vi.mocked(aiService.translateTopic)

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Chainable query-builder stub: every filter/order method returns itself;
// .single()/.maybeSingle() resolve with the given result; .insert() resolves directly
// (mirrors how the route calls `await supabase.from('topics').insert(...)` with no further chain).
function makeQueryBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {}
  const chainMethods = ['select', 'eq', 'ilike', 'or', 'order', 'not', 'limit', 'update']
  for (const m of chainMethods) {
    builder[m] = vi.fn().mockReturnValue(builder)
  }
  builder.single = vi.fn().mockResolvedValue(result)
  builder.maybeSingle = vi.fn().mockResolvedValue(result)
  builder.insert = vi.fn().mockImplementation(() => Object.assign(Promise.resolve(result), builder))
  return builder
}

// GET's topic list query has no `.single()`/`.maybeSingle()` terminal — it resolves
// directly off `.order(...)`, mirroring the real supabase-js thenable builder.
function makeListBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {}
  builder.select = vi.fn().mockReturnValue(builder)
  builder.eq = vi.fn().mockReturnValue(builder)
  builder.order = vi.fn().mockImplementation(() => Promise.resolve(result))
  return builder
}

// Default text matches the fixture's own `language` tag, since the mismatch
// detector reads actual content — an English placeholder tagged 'pt' would
// (correctly) trip it and break tests that aren't about mismatch detection.
function makeTopic(overrides: Partial<Record<string, unknown>>) {
  const isPt = overrides.language === 'pt'
  return {
    id: 'topic-id',
    title: isPt ? 'Título' : 'Title',
    summary: isPt
      ? 'Um resumo em português, com bastante contexto para não deixar dúvida sobre o idioma.'
      : 'Summary',
    when_to_use: isPt ? 'Quando usar isso no dia a dia' : 'When to use',
    pros: [],
    cons: [],
    code_snippet: null,
    quick_qa: [],
    tags: [],
    difficulty: 'medium',
    category_id: null,
    language: 'en',
    translated_from: null,
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCheckRateLimit.mockResolvedValue({ allowed: true, userId: 'user-1' } as any)
})

describe('POST /api/topics — guard layer', () => {
  it('returns 401 when there is no authenticated user', async () => {
    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValueOnce({ data: { user: null } }) },
    } as any)

    const res = await POST(makeRequest({ topicName: 'Event Loop', language: 'en' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when topicName is missing', async () => {
    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValueOnce({ data: { user: { id: 'user-1' } } }) },
    } as any)

    const res = await POST(makeRequest({ language: 'en' }))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/topics — translation gap backfill', () => {
  it('backfills the missing counterpart when an existing topic has no translation yet', async () => {
    // Represents a topic row already tagged 'en' (matches the request's language
    // filter) whose 'pt' counterpart was never created — e.g. the earlier
    // auto-translate step failed silently, or the topic was force-generated from
    // a PT-language roadmap topic name. Either way, the 'pt' side is missing.
    const existingTopic = {
      id: 'topic-1',
      title: 'Event Queue',
      summary: 'summary in en',
      when_to_use: 'when to use',
      pros: ['a'],
      cons: ['b'],
      code_snippet: null,
      quick_qa: [{ q: 'question', a: 'answer' }],
      tags: ['nodejs'],
      difficulty: 'medium',
      category_id: null,
      language: 'en',
      translated_from: null,
    }

    const existingCheckBuilder = makeQueryBuilder({ data: existingTopic, error: null })
    const counterpartCheckBuilder = makeQueryBuilder({ data: null, error: null }) // no PT counterpart yet
    const insertBuilder = makeQueryBuilder({ data: null, error: null })

    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValueOnce({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn()
        .mockReturnValueOnce(existingCheckBuilder)
        .mockReturnValueOnce(counterpartCheckBuilder)
        .mockReturnValueOnce(insertBuilder),
    } as any)

    mockTranslateTopic.mockResolvedValueOnce({
      title: 'Fila de Eventos',
      summary: 'resumo em pt',
      when_to_use: 'quando usar',
      pros: ['a-pt'],
      cons: ['b-pt'],
      quick_qa: [{ q: 'pergunta', a: 'resposta' }],
      tags: ['nodejs'],
    } as any)

    const res = await POST(makeRequest({ topicName: 'Event Queue', difficulty: 'medium', language: 'en' }))

    expect(res.status).toBe(200)
    expect(mockTranslateTopic).toHaveBeenCalledTimes(1)
    expect(insertBuilder.insert).toHaveBeenCalledTimes(1)
    const insertedPayload = insertBuilder.insert.mock.calls[0][0]
    expect(insertedPayload.language).toBe('pt')
    expect(insertedPayload.translated_from).toBe('topic-1')
    expect(insertedPayload.title).toBe('Fila de Eventos')
  })

  it('does not re-translate when the counterpart already exists', async () => {
    const existingTopic = {
      id: 'topic-1',
      title: 'Event Queue',
      summary: 'summary',
      when_to_use: 'when',
      pros: [],
      cons: [],
      code_snippet: null,
      quick_qa: [],
      tags: [],
      difficulty: 'medium',
      category_id: null,
      language: 'en',
      translated_from: null,
    }

    const existingCheckBuilder = makeQueryBuilder({ data: existingTopic, error: null })
    const counterpartCheckBuilder = makeQueryBuilder({ data: { id: 'topic-2' }, error: null }) // PT counterpart present

    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValueOnce({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn()
        .mockReturnValueOnce(existingCheckBuilder)
        .mockReturnValueOnce(counterpartCheckBuilder),
    } as any)

    const res = await POST(makeRequest({ topicName: 'Event Queue', difficulty: 'medium', language: 'en' }))

    expect(res.status).toBe(200)
    expect(mockTranslateTopic).not.toHaveBeenCalled()
  })
})

describe('GET /api/topics — self-healing bilingual gaps', () => {
  it('returns 401 when there is no authenticated user', async () => {
    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValueOnce({ data: { user: null } }) },
    } as any)

    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('does not call translateTopic when every topic already has its counterpart', async () => {
    const en = makeTopic({ id: 'topic-en', language: 'en', translated_from: null })
    const pt = makeTopic({ id: 'topic-pt', language: 'pt', translated_from: 'topic-en' })
    const listBuilder = makeListBuilder({ data: [en, pt], error: null })

    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValueOnce({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn().mockReturnValueOnce(listBuilder),
    } as any)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toHaveLength(2)
    expect(mockTranslateTopic).not.toHaveBeenCalled()
  })

  it('heals a gap found in already-persisted data and includes the healed row in the response', async () => {
    // Only the 'en' side exists — e.g. a gap that predates the backfill guarantee.
    const orphan = makeTopic({ id: 'topic-en', language: 'en', translated_from: null })
    const listBuilder = makeListBuilder({ data: [orphan], error: null })
    const insertBuilder = makeQueryBuilder({
      data: makeTopic({ id: 'topic-pt-new', language: 'pt', translated_from: 'topic-en' }),
      error: null,
    })

    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValueOnce({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn()
        .mockReturnValueOnce(listBuilder)
        .mockReturnValueOnce(insertBuilder),
    } as any)

    mockTranslateTopic.mockResolvedValueOnce({
      title: 'Título traduzido',
      summary: 'Resumo',
      when_to_use: 'Quando usar',
      pros: [],
      cons: [],
      quick_qa: [],
      tags: [],
    } as any)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(mockTranslateTopic).toHaveBeenCalledTimes(1)
    expect(json).toHaveLength(2)
    expect(json.some((t: { id: string }) => t.id === 'topic-pt-new')).toBe(true)
  })

  it('caps healing at 3 gaps per request, oldest first, leaving the rest for the next load', async () => {
    const orphans = ['a', 'b', 'c', 'd'].map((label, i) =>
      makeTopic({
        id: `topic-${label}`,
        language: 'en',
        translated_from: null,
        created_at: `2024-01-0${i + 1}T00:00:00.000Z`,
      })
    )
    const listBuilder = makeListBuilder({ data: orphans, error: null })
    const insertBuilders = [1, 2, 3].map(() =>
      makeQueryBuilder({ data: makeTopic({ id: 'healed', language: 'pt' }), error: null })
    )

    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValueOnce({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn()
        .mockReturnValueOnce(listBuilder)
        .mockReturnValueOnce(insertBuilders[0])
        .mockReturnValueOnce(insertBuilders[1])
        .mockReturnValueOnce(insertBuilders[2]),
    } as any)

    mockTranslateTopic.mockResolvedValue({
      title: 't', summary: 's', when_to_use: 'w', pros: [], cons: [], quick_qa: [], tags: [],
    } as any)

    const res = await GET()
    expect(res.status).toBe(200)
    // Only 3 of the 4 gaps healed — the 4th (newest) is left for the next request.
    expect(mockTranslateTopic).toHaveBeenCalledTimes(3)
  })

  it('fixes a topic whose content does not match its own language tag', async () => {
    // Tagged 'en' but the actual text is Portuguese — the exact bug this guards
    // against: the model ignored the requested output language during generation.
    const enTaggedButPortuguese = makeTopic({
      id: 'topic-en-wrong',
      language: 'en',
      translated_from: null,
      title: 'Fila de Eventos',
      summary: 'O Event Loop é o mecanismo que permite ao Node.js executar operações não bloqueantes.',
      when_to_use: 'Use quando estiver construindo servidores com alta concorrência.',
    })
    const ptCorrect = makeTopic({ id: 'topic-pt-correct', language: 'pt', translated_from: 'topic-en-wrong' })

    const listBuilder = makeListBuilder({ data: [enTaggedButPortuguese, ptCorrect], error: null })
    const updateBuilder = makeQueryBuilder({
      data: makeTopic({ id: 'topic-en-wrong', language: 'en', translated_from: null, title: 'Event Queue' }),
      error: null,
    })

    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValueOnce({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn()
        .mockReturnValueOnce(listBuilder)
        .mockReturnValueOnce(updateBuilder),
    } as any)

    mockTranslateTopic.mockResolvedValueOnce({
      title: 'Event Queue',
      summary: 'The Event Loop is the mechanism that allows Node.js to perform non-blocking I/O.',
      when_to_use: 'Use it when building highly concurrent servers.',
      pros: [], cons: [], quick_qa: [], tags: [],
    } as any)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(mockTranslateTopic).toHaveBeenCalledTimes(1)
    expect(mockTranslateTopic.mock.calls[0][0].targetLanguage).toBe('en')
    expect(updateBuilder.update).toHaveBeenCalledTimes(1)
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'topic-en-wrong')
    const fixedTopic = json.find((t: { id: string }) => t.id === 'topic-en-wrong')
    expect(fixedTopic.title).toBe('Event Queue')
  })

  it('does not touch anything when both sides of a pair already read correctly', async () => {
    const en = makeTopic({ id: 'topic-en', language: 'en', translated_from: null })
    const pt = makeTopic({ id: 'topic-pt', language: 'pt', translated_from: 'topic-en' })
    const listBuilder = makeListBuilder({ data: [en, pt], error: null })

    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValueOnce({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn().mockReturnValueOnce(listBuilder),
    } as any)

    const res = await GET()

    expect(res.status).toBe(200)
    expect(mockTranslateTopic).not.toHaveBeenCalled()
  })

  it('does not let a backlog of gaps starve an older mismatch fix', async () => {
    // The mismatch is the OLDEST issue overall — it must be healed even though
    // there are more gaps than fit in the per-request budget. Before this fix,
    // findTranslationGaps ran to completion before findLanguageMismatches ever
    // got a turn, so a large gap backlog would starve mismatches indefinitely.
    const mismatchEn = makeTopic({
      id: 'topic-mismatch-en',
      language: 'en',
      translated_from: null,
      title: 'Fila de Eventos',
      summary: 'O Event Loop é o mecanismo que permite ao Node.js executar operações não bloqueantes.',
      when_to_use: 'Use quando estiver construindo servidores com alta concorrência.',
      created_at: '2024-01-01T00:00:00.000Z',
    })
    const mismatchPt = makeTopic({
      id: 'topic-mismatch-pt',
      language: 'pt',
      translated_from: 'topic-mismatch-en',
      created_at: '2024-01-01T00:00:00.000Z',
    })
    const gapOrphans = ['a', 'b', 'c', 'd', 'e'].map((label, i) =>
      makeTopic({
        id: `topic-gap-${label}`,
        language: 'en',
        translated_from: null,
        created_at: `2024-01-0${i + 2}T00:00:00.000Z`, // all newer than the mismatch
      })
    )

    const listBuilder = makeListBuilder({ data: [mismatchEn, mismatchPt, ...gapOrphans], error: null })
    const updateBuilder = makeQueryBuilder({ data: makeTopic({ id: 'topic-mismatch-en', language: 'en' }), error: null })
    const insertBuilders = [1, 2].map(() =>
      makeQueryBuilder({ data: makeTopic({ id: 'healed', language: 'pt' }), error: null })
    )

    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValueOnce({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn()
        .mockReturnValueOnce(listBuilder)
        .mockReturnValueOnce(updateBuilder)   // the mismatch — oldest, processed first
        .mockReturnValueOnce(insertBuilders[0]) // then the 2 oldest gaps
        .mockReturnValueOnce(insertBuilders[1]),
    } as any)

    mockTranslateTopic.mockResolvedValue({
      title: 't', summary: 's', when_to_use: 'w', pros: [], cons: [], quick_qa: [], tags: [],
    } as any)

    const res = await GET()

    expect(res.status).toBe(200)
    expect(mockTranslateTopic).toHaveBeenCalledTimes(3) // budget of 3, shared fairly
    expect(updateBuilder.update).toHaveBeenCalledTimes(1) // the mismatch got its turn
    expect(insertBuilders[0].insert).toHaveBeenCalledTimes(1)
    expect(insertBuilders[1].insert).toHaveBeenCalledTimes(1)
  })
})
