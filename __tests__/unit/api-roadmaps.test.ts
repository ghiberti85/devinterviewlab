import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  logUsage: vi.fn(),
  sanitizeError: vi.fn((e: unknown) => (e instanceof Error ? e.message : String(e))),
}))

vi.mock('@/lib/api/stream', () => ({
  ndjsonStream: vi.fn(),
}))

vi.mock('@/lib/ai/ai.service', () => ({
  aiService: { analyzeAndGenerateRoadmap: vi.fn() },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { GET } from '@/app/api/roadmaps/route'
import { createClient } from '@/lib/supabase/server'

const mockCreateClient = vi.mocked(createClient)

function makeQueryBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {}
  const chain = (ret: unknown) => vi.fn().mockReturnValue(ret)
  builder.select = vi.fn().mockReturnThis()
  builder.eq = vi.fn().mockReturnThis()
  builder.order = vi.fn().mockReturnThis()
  builder.limit = vi.fn().mockResolvedValue(result)
  builder.in = vi.fn().mockResolvedValue(result)
  // make builder itself chainable
  Object.values(builder).forEach(fn => {
    if (fn !== builder.limit && fn !== builder.in) {
      fn.mockReturnValue(builder)
    }
  })
  void chain // silence unused warning
  return builder
}

function mockSupabase(user: object | null, roadmaps: object[] = []) {
  const roadmapsBuilder = makeQueryBuilder({ data: roadmaps, error: null })
  const progressBuilder = makeQueryBuilder({ data: [], error: null })

  mockCreateClient.mockResolvedValueOnce({
    auth: {
      getUser: vi.fn().mockResolvedValueOnce({ data: { user } }),
    },
    from: vi.fn()
      .mockReturnValueOnce(roadmapsBuilder)
      .mockReturnValueOnce(progressBuilder),
  } as any)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/roadmaps', () => {
  it('returns 401 when there is no authenticated user', async () => {
    mockSupabase(null)
    const res = await GET()
    expect(res.status).toBe(401)
    const json = JSON.parse(await res.text())
    expect(json.error).toMatch(/Unauthorized/i)
  })

  it('returns 200 with an array when user is authenticated', async () => {
    mockSupabase({ id: 'user-1', email: 'test@example.com' }, [])
    const res = await GET()
    expect(res.status).toBe(200)
    const data = JSON.parse(await res.text())
    expect(Array.isArray(data)).toBe(true)
  })

  it('returns roadmaps with progress field for each item', async () => {
    const fakeRoadmap = { id: 'rm-1', user_id: 'user-1', job_title: 'Engineer' }
    mockSupabase({ id: 'user-1' }, [fakeRoadmap])

    const res = await GET()
    const data = JSON.parse(await res.text())
    expect(data).toHaveLength(1)
    expect(data[0]).toHaveProperty('progress')
    expect(Array.isArray(data[0].progress)).toBe(true)
  })
})
