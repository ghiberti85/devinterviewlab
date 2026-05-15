import { describe, it, expect } from 'vitest'
import { aggregateRadar, averageScore } from '@/lib/utils/score-card.utils'

describe('aggregateRadar', () => {
  it('with array of 1 evaluation returns values directly', () => {
    const evals = [
      { feedback: { score_breakdown: { correctness: 80, completeness: 70, clarity: 90, depth: 60 } } },
    ]
    const result = aggregateRadar(evals)
    expect(result).toEqual({ correctness: 80, completeness: 70, clarity: 90, depth: 60 })
  })

  it('with array of 2 evaluations returns correct averages', () => {
    const evals = [
      { feedback: { score_breakdown: { correctness: 80, completeness: 60, clarity: 100, depth: 40 } } },
      { feedback: { score_breakdown: { correctness: 60, completeness: 80, clarity: 80, depth: 60 } } },
    ]
    const result = aggregateRadar(evals)
    expect(result).toEqual({ correctness: 70, completeness: 70, clarity: 90, depth: 50 })
  })

  it('with empty array returns zeros', () => {
    const result = aggregateRadar([])
    expect(result).toEqual({ correctness: 0, completeness: 0, clarity: 0, depth: 0 })
  })
})

describe('averageScore', () => {
  it('with scores [80, 60] returns 70', () => {
    expect(averageScore([80, 60])).toBe(70)
  })

  it('with empty array returns 0', () => {
    expect(averageScore([])).toBe(0)
  })

  it('with single score returns that score', () => {
    expect(averageScore([85])).toBe(85)
  })
})
