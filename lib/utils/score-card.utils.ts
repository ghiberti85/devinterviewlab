export interface RadarValues {
  correctness: number
  completeness: number
  clarity: number
  depth: number
}

export function aggregateRadar(
  evaluations: Array<{
    feedback: {
      score_breakdown: RadarValues
    }
  }>
): RadarValues {
  if (evaluations.length === 0) {
    return { correctness: 0, completeness: 0, clarity: 0, depth: 0 }
  }
  const sum = evaluations.reduce(
    (acc, e) => ({
      correctness: acc.correctness + (e.feedback.score_breakdown.correctness ?? 0),
      completeness: acc.completeness + (e.feedback.score_breakdown.completeness ?? 0),
      clarity: acc.clarity + (e.feedback.score_breakdown.clarity ?? 0),
      depth: acc.depth + (e.feedback.score_breakdown.depth ?? 0),
    }),
    { correctness: 0, completeness: 0, clarity: 0, depth: 0 }
  )
  const n = evaluations.length
  return {
    correctness: sum.correctness / n,
    completeness: sum.completeness / n,
    clarity: sum.clarity / n,
    depth: sum.depth / n,
  }
}

export function averageScore(scores: number[]): number {
  if (scores.length === 0) return 0
  return scores.reduce((a, b) => a + b, 0) / scores.length
}
