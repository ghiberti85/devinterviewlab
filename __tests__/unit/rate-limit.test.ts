import { describe, it, expect, vi, afterEach } from 'vitest'
import { validateTextInput, sanitizeError } from '@/lib/api/rate-limit'

afterEach(() => {
  vi.unstubAllEnvs()
})

// ─── validateTextInput ────────────────────────────────────────────────────────

describe('validateTextInput — answer field (limit: 50 000)', () => {
  it('accepts a normal string', () => {
    const result = validateTextInput('This is my answer.', 'answer')
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.value).toBe('This is my answer.')
  })

  it('trims leading and trailing whitespace', () => {
    const result = validateTextInput('  hello  ', 'answer')
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.value).toBe('hello')
  })

  it('accepts a string exactly at the limit', () => {
    const atLimit = 'a'.repeat(50_000)
    const result = validateTextInput(atLimit, 'answer')
    expect(result.valid).toBe(true)
  })

  it('rejects a string one character over the limit', () => {
    const overLimit = 'a'.repeat(50_001)
    const result = validateTextInput(overLimit, 'answer')
    expect(result.valid).toBe(false)
  })

  it('rejects a non-string value', () => {
    const result = validateTextInput(42, 'answer')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toMatch(/deve ser texto/)
  })
})

describe('validateTextInput — context field (limit: 8 000)', () => {
  it('accepts a string within limit', () => {
    const result = validateTextInput('context', 'context')
    expect(result.valid).toBe(true)
  })

  it('rejects a string over 8 000 characters', () => {
    const result = validateTextInput('x'.repeat(8_001), 'context')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toMatch(/8,000|8000/)
  })
})

describe('validateTextInput — question field (limit: 500)', () => {
  it('accepts a string within limit', () => {
    const result = validateTextInput('What is React?', 'question')
    expect(result.valid).toBe(true)
  })

  it('rejects a string over 500 characters', () => {
    const result = validateTextInput('q'.repeat(501), 'question')
    expect(result.valid).toBe(false)
  })
})

describe('validateTextInput — body field (limit: 20 000)', () => {
  it('accepts a string within limit', () => {
    const result = validateTextInput('Some body text', 'body')
    expect(result.valid).toBe(true)
  })

  it('rejects a string over 20 000 characters', () => {
    const result = validateTextInput('b'.repeat(20_001), 'body')
    expect(result.valid).toBe(false)
  })
})

// ─── sanitizeError ────────────────────────────────────────────────────────────

describe('sanitizeError — development mode', () => {
  it('returns the original error message', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const err = new Error('DB connection refused')
    const msg = sanitizeError(err)
    expect(msg).toBe('DB connection refused')
  })

  it('returns stringified value for non-Error', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const msg = sanitizeError('raw string error')
    expect(msg).toBe('raw string error')
  })
})

describe('sanitizeError — production mode', () => {
  it('returns a generic message for unknown errors', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const err = new Error('Internal DB detail that should not leak')
    const msg = sanitizeError(err)
    expect(msg).toBe('Erro interno. Tente novamente.')
  })

  it('returns a rate-limit message when error mentions rate limit', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const err = new Error('rate limit exceeded')
    const msg = sanitizeError(err)
    expect(msg).toMatch(/temporariamente indisponível/)
  })

  it('returns a rate-limit message when error mentions quota', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const err = new Error('quota exceeded for this project')
    const msg = sanitizeError(err)
    expect(msg).toMatch(/temporariamente indisponível/)
  })

  it('returns a timeout message when error mentions timeout', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const err = new Error('request timeout')
    const msg = sanitizeError(err)
    expect(msg).toMatch(/Requisição demorou/)
  })

  it('returns a generic message for non-Error values', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const msg = sanitizeError('something bad')
    expect(msg).toBe('Erro interno. Tente novamente.')
  })
})
