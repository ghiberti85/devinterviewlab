/**
 * SM-2 spaced repetition algorithm.
 * Returns the next review date based on confidence (1-5).
 */
export function computeNextReview(confidence: number): Date {
  const now = new Date()

  // confidence 1-2 → review in 1 day
  // confidence 3   → review in 3 days
  // confidence 4   → review in 7 days
  // confidence 5   → review in 14 days
  const daysMap: Record<number, number> = {
    1: 1, 2: 1, 3: 3, 4: 7, 5: 14,
  }
  const days = daysMap[confidence] ?? 3
  now.setDate(now.getDate() + days)
  return now
}
