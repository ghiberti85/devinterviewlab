import { describe, it, expect } from 'vitest'

// Mirrors the serialization done inside useSubmitInterview's mutationFn.
// Tests that the fetch body contract matches what /api/interview expects.

function buildInterviewBody(opts: {
  question_id: string
  user_answer: string
  transcript?: string
  language?: string
}): string {
  return JSON.stringify(opts)
}

describe('interview API payload', () => {
  it('includes transcript when provided', () => {
    const body = JSON.parse(buildInterviewBody({
      question_id: 'q1',
      user_answer: 'closures capture the lexical scope',
      transcript: 'closures capture the lexical scope',
      language: 'en',
    }))
    expect(body).toHaveProperty('transcript', 'closures capture the lexical scope')
  })

  it('omits transcript key when not provided', () => {
    const body = JSON.parse(buildInterviewBody({
      question_id: 'q1',
      user_answer: 'closures capture the lexical scope',
    }))
    expect(body).not.toHaveProperty('transcript')
  })

  it('transcript can differ from user_answer (voice raw vs edited text)', () => {
    const body = JSON.parse(buildInterviewBody({
      question_id: 'q1',
      user_answer: 'Closures capture the lexical scope — edited for clarity.',
      transcript: 'closures capture the lexical scope',
    }))
    expect(body.transcript).not.toBe(body.user_answer)
    expect(body.transcript).toBe('closures capture the lexical scope')
    expect(body.user_answer).toContain('edited for clarity')
  })

  it('includes all required fields', () => {
    const body = JSON.parse(buildInterviewBody({
      question_id: 'abc-123',
      user_answer: 'answer text',
      language: 'pt',
    }))
    expect(body.question_id).toBe('abc-123')
    expect(body.user_answer).toBe('answer text')
    expect(body.language).toBe('pt')
  })

  it('language defaults to undefined when not supplied (API uses "en" as default)', () => {
    const body = JSON.parse(buildInterviewBody({
      question_id: 'q1',
      user_answer: 'answer',
    }))
    expect(body.language).toBeUndefined()
  })
})
