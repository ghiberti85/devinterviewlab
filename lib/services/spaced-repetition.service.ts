const EF_INITIAL = 2.5
const EF_MIN = 1.3

// Maps confidence (1-5) to SM-2 quality (0-5).
// Quality < 3 signals a failed recall and resets the repetition counter.
const QUALITY_MAP: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 4, 5: 5 }

function toQuality(confidence: number): number {
  return QUALITY_MAP[confidence] ?? 3
}

function nextEF(ef: number, quality: number): number {
  return Math.max(EF_MIN, ef + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
}

interface SM2State {
  ef: number
  interval: number
  repetitions: number
}

function applyQuality(state: SM2State, quality: number): SM2State {
  if (quality < 3) {
    // Failed recall: reset repetitions and interval, keep EF
    return { ef: state.ef, interval: 1, repetitions: 0 }
  }
  const repetitions = state.repetitions + 1
  let interval: number
  if (repetitions === 1) interval = 1
  else if (repetitions === 2) interval = 6
  else interval = Math.round(state.interval * state.ef)

  return { ef: nextEF(state.ef, quality), interval, repetitions }
}

/**
 * SM-2 spaced repetition algorithm with Easiness Factor.
 *
 * @param confidence - Current session rating (1-5)
 * @param history    - Previous confidence values in chronological order.
 *                     Pass the full question history so the EF and interval
 *                     can be derived without storing state separately.
 * @returns Next review date
 */
export function computeNextReview(confidence: number, history: number[] = []): Date {
  let state: SM2State = { ef: EF_INITIAL, interval: 1, repetitions: 0 }

  for (const prev of history) {
    state = applyQuality(state, toQuality(prev))
  }

  state = applyQuality(state, toQuality(confidence))

  const next = new Date()
  next.setDate(next.getDate() + state.interval)
  return next
}
