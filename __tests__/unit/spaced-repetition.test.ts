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

describe('computeNextReview — SM-2 algorithm', () => {
  it('confidence 1 → next review in 1 day', () => {
    const result = computeNextReview(1)
    expect(result.getTime()).toBe(daysFromNow(1).getTime())
  })

  it('confidence 2 → next review in 1 day', () => {
    const result = computeNextReview(2)
    expect(result.getTime()).toBe(daysFromNow(1).getTime())
  })

  it('confidence 3 → next review in 3 days', () => {
    const result = computeNextReview(3)
    expect(result.getTime()).toBe(daysFromNow(3).getTime())
  })

  it('confidence 4 → next review in 7 days', () => {
    const result = computeNextReview(4)
    expect(result.getTime()).toBe(daysFromNow(7).getTime())
  })

  it('confidence 5 → next review in 14 days', () => {
    const result = computeNextReview(5)
    expect(result.getTime()).toBe(daysFromNow(14).getTime())
  })

  it('returns a Date instance for all valid confidence levels', () => {
    for (let c = 1; c <= 5; c++) {
      expect(computeNextReview(c)).toBeInstanceOf(Date)
    }
  })

  it('future review date is always after now', () => {
    for (let c = 1; c <= 5; c++) {
      expect(computeNextReview(c).getTime()).toBeGreaterThan(FIXED_NOW.getTime())
    }
  })

  it('higher confidence yields a later review date (monotonically ordered)', () => {
    const dates = [1, 2, 3, 4, 5].map(computeNextReview)
    // confidence 1 and 2 map to the same interval; 3, 4, 5 should strictly increase
    expect(dates[2].getTime()).toBeGreaterThan(dates[1].getTime())
    expect(dates[3].getTime()).toBeGreaterThan(dates[2].getTime())
    expect(dates[4].getTime()).toBeGreaterThan(dates[3].getTime())
  })

  it('unknown confidence level falls back to 3 days', () => {
    const result = computeNextReview(99)
    expect(result.getTime()).toBe(daysFromNow(3).getTime())
  })
})
