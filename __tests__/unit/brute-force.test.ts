import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { checkBruteForce, recordFailedAttempt, resetAttempts } from '@/lib/api/brute-force'

const IP = '1.2.3.4'

beforeEach(() => {
  resetAttempts(IP)
  vi.useRealTimers()
})

afterEach(() => {
  resetAttempts(IP)
  vi.useRealTimers()
})

describe('checkBruteForce', () => {
  it('allows first attempt (no record)', () => {
    const result = checkBruteForce(IP)
    expect(result.allowed).toBe(true)
  })

  it('allows attempt after a single failure', () => {
    recordFailedAttempt(IP)
    const result = checkBruteForce(IP)
    expect(result.allowed).toBe(true)
  })

  it('allows after 9 failures (one below threshold)', () => {
    for (let i = 0; i < 9; i++) recordFailedAttempt(IP)
    const result = checkBruteForce(IP)
    expect(result.allowed).toBe(true)
  })

  it('blocks after 10 failed attempts', () => {
    for (let i = 0; i < 10; i++) recordFailedAttempt(IP)
    const result = checkBruteForce(IP)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSec).toBeGreaterThan(0)
  })

  it('retryAfterSec is approximately 15 minutes (900s) when just blocked', () => {
    for (let i = 0; i < 10; i++) recordFailedAttempt(IP)
    const result = checkBruteForce(IP)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSec).toBeGreaterThanOrEqual(899)
    expect(result.retryAfterSec).toBeLessThanOrEqual(900)
  })

  it('unblocks after block window expires', () => {
    vi.useFakeTimers()
    for (let i = 0; i < 10; i++) recordFailedAttempt(IP)
    expect(checkBruteForce(IP).allowed).toBe(false)

    // Advance 15 minutes + 1 second past the block
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000)

    const result = checkBruteForce(IP)
    expect(result.allowed).toBe(true)
  })

  it('resets window after the 15-minute sliding window expires without a block', () => {
    vi.useFakeTimers()
    for (let i = 0; i < 5; i++) recordFailedAttempt(IP)
    expect(checkBruteForce(IP).allowed).toBe(true)

    // Advance past the 15-minute window
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000)

    const result = checkBruteForce(IP)
    expect(result.allowed).toBe(true)
  })
})

describe('resetAttempts', () => {
  it('clears block so subsequent check allows the IP', () => {
    for (let i = 0; i < 10; i++) recordFailedAttempt(IP)
    expect(checkBruteForce(IP).allowed).toBe(false)

    resetAttempts(IP)

    expect(checkBruteForce(IP).allowed).toBe(true)
  })

  it('is idempotent on an IP with no record', () => {
    expect(() => resetAttempts('9.9.9.9')).not.toThrow()
  })
})

describe('recordFailedAttempt', () => {
  it('creates a new record on first failure', () => {
    recordFailedAttempt(IP)
    // After 1 failure the IP is still allowed
    expect(checkBruteForce(IP).allowed).toBe(true)
  })

  it('resets count when called outside the sliding window', () => {
    vi.useFakeTimers()
    for (let i = 0; i < 9; i++) recordFailedAttempt(IP)
    expect(checkBruteForce(IP).allowed).toBe(true)

    vi.advanceTimersByTime(15 * 60 * 1000 + 1000)

    // Record one more failure — count should reset to 1
    recordFailedAttempt(IP)
    expect(checkBruteForce(IP).allowed).toBe(true)
  })
})
