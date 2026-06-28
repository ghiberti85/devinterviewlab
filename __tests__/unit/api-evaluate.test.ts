import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  validateTextInput: vi.fn(),
  logUsage: vi.fn(),
  sanitizeError: vi.fn((e: unknown) => (e instanceof Error ? e.message : String(e))),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/api/stream', () => ({
  ndjsonStream: vi.fn(),
}))

vi.mock('@/lib/ai/ai.service', () => ({
  aiService: { evaluateAnswer: vi.fn() },
}))

import { POST } from '@/app/api/ai/evaluate/route'
import { checkRateLimit, validateTextInput } from '@/lib/api/rate-limit'
import { createClient } from '@/lib/supabase/server'

const mockCheckRateLimit = vi.mocked(checkRateLimit)
const mockValidateTextInput = vi.mocked(validateTextInput)
const mockCreateClient = vi.mocked(createClient)

function makeRequest(body: object = {}) {
  return new NextRequest('http://localhost/api/ai/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/ai/evaluate — guard layer', () => {
  it('returns 401 when user is not authenticated (checkRateLimit rejects)', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await POST(makeRequest({ user_answer: 'answer', question_id: 'q1' }))
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      response: NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 }),
    })

    const res = await POST(makeRequest({ user_answer: 'answer', question_id: 'q1' }))
    expect(res.status).toBe(429)
  })

  it('returns 400 when user_answer fails validation', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: true, userId: 'user-1' })
    mockValidateTextInput.mockReturnValueOnce({ valid: false, error: 'Campo "answer" deve ser texto.' })

    const res = await POST(makeRequest({ question_id: 'q1' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('returns 401 when session is missing after rate-limit check', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: true, userId: 'user-1' })
    mockValidateTextInput.mockReturnValueOnce({ valid: true, value: 'my answer' })
    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValueOnce({ data: { user: null } }) },
    } as any)

    const res = await POST(makeRequest({ user_answer: 'my answer', question_id: 'q1' }))
    expect(res.status).toBe(401)
  })
})
