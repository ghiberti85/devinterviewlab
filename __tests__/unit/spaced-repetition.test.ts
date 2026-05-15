import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { computeNextReview } from '@/lib/services/spaced-repetition.service'

const FIXED_NOW = new Date('2024-06-01T12:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

function daysFromNow(days: number): Date {
  const d = new Date(FIXED_NOW)
  d.setDate(d.getDate() + days)
  return d
}

describe('computeNextReview — first session (no history)', () => {
  it('confidence 1 (failed recall) → 1 day', () => {
    expect(computeNextReview(1).getTime()).toBe(daysFromNow(1).getTime())
  })

  it('confidence 2 (failed recall) → 1 day', () => {
    expect(computeNextReview(2).getTime()).toBe(daysFromNow(1).getTime())
  })

  it('confidence 3 (first success) → 1 day (SM-2 rep=1)', () => {
    expect(computeNextReview(3).getTime()).toBe(daysFromNow(1).getTime())
  })

  it('confidence 4 (first success) → 1 day (SM-2 rep=1)', () => {
    expect(computeNextReview(4).getTime()).toBe(daysFromNow(1).getTime())
  })

  it('confidence 5 (first success) → 1 day (SM-2 rep=1)', () => {
    expect(computeNextReview(5).getTime()).toBe(daysFromNow(1).getTime())
  })

  it('unknown confidence falls back to quality 3 (success)', () => {
    expect(computeNextReview(99).getTime()).toBe(daysFromNow(1).getTime())
  })

  it('always returns a Date instance', () => {
    for (let c = 1; c <= 5; c++) {
      expect(computeNextReview(c)).toBeInstanceOf(Date)
    }
  })

  it('always returns a future date', () => {
    for (let c = 1; c <= 5; c++) {
      expect(computeNextReview(c).getTime()).toBeGreaterThan(FIXED_NOW.getTime())
    }
  })
})

describe('computeNextReview — second session (one success in history)', () => {
  const oneSuccess = [5]

  it('confidence 3+ on second session → 6 days (SM-2 rep=2)', () => {
    expect(computeNextReview(3, oneSuccess).getTime()).toBe(daysFromNow(6).getTime())
    expect(computeNextReview(4, oneSuccess).getTime()).toBe(daysFromNow(6).getTime())
    expect(computeNextReview(5, oneSuccess).getTime()).toBe(daysFromNow(6).getTime())
  })

  it('failed recall on second session resets interval to 1 day', () => {
    expect(computeNextReview(1, oneSuccess).getTime()).toBe(daysFromNow(1).getTime())
    expect(computeNextReview(2, oneSuccess).getTime()).toBe(daysFromNow(1).getTime())
  })
})

describe('computeNextReview — third session+ (EF-based intervals)', () => {
  it('two successes history → third session uses EF-scaled interval', () => {
    const twoSuccesses = [5, 5]
    // After rep=2 (interval=6), EF ~2.5 for quality 5 → interval = round(6 * 2.5) = 15
    const result = computeNextReview(5, twoSuccesses)
    expect(result.getTime()).toBeGreaterThan(daysFromNow(6).getTime())
  })

  it('intervals grow monotonically with perfect confidence history', () => {
    const intervals: number[] = []
    const history: number[] = []
    for (let i = 0; i < 5; i++) {
      const next = computeNextReview(5, [...history])
      const days = Math.round((next.getTime() - FIXED_NOW.getTime()) / 86_400_000)
      intervals.push(days)
      history.push(5)
    }
    // Each subsequent interval should be >= previous (EF grows with quality 5)
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1])
    }
  })

  it('low confidence history keeps intervals short (EF degrades)', () => {
    const weakHistory = [3, 3, 3]
    const strongHistory = [5, 5, 5]
    const weakResult = computeNextReview(5, weakHistory)
    const strongResult = computeNextReview(5, strongHistory)
    expect(weakResult.getTime()).toBeLessThanOrEqual(strongResult.getTime())
  })
})

describe('computeNextReview — failed recall resets progress', () => {
  it('failure after long history resets interval to 1 day', () => {
    const longSuccess = [5, 5, 5, 5]
    expect(computeNextReview(1, longSuccess).getTime()).toBe(daysFromNow(1).getTime())
    expect(computeNextReview(2, longSuccess).getTime()).toBe(daysFromNow(1).getTime())
  })

  it('recovery after failure restarts from rep=1 (1 day)', () => {
    // history has a failure in it; current confidence is success
    const historyWithFailure = [5, 5, 1]
    expect(computeNextReview(5, historyWithFailure).getTime()).toBe(daysFromNow(1).getTime())
  })

  it('EF is preserved across failure (only interval resets)', () => {
    // Two successes build EF, then failure, then success → rep=1 → 1 day
    // But the next success after that should use rep=2 → 6 days (EF intact)
    const historyAfterRecovery = [5, 5, 1, 5]
    expect(computeNextReview(5, historyAfterRecovery).getTime()).toBe(daysFromNow(6).getTime())
  })
})
