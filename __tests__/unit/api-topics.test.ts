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

import { POST } from '@/app/api/topics/route'
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
  const chainMethods = ['select', 'eq', 'ilike', 'or', 'order', 'not', 'limit']
  for (const m of chainMethods) {
    builder[m] = vi.fn().mockReturnValue(builder)
  }
  builder.single = vi.fn().mockResolvedValue(result)
  builder.maybeSingle = vi.fn().mockResolvedValue(result)
  builder.insert = vi.fn().mockImplementation(() => Object.assign(Promise.resolve(result), builder))
  return builder
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
