import { describe, it, expect } from 'vitest'
import { getScoreCardSystemPrompt, scoreCardPrompt } from '@/lib/ai/prompts/score-card.prompt'

const sampleEval = {
  score: 75,
  strengths: ['async handling', 'clean code'],
  gaps: ['scalability', 'error handling'],
  missing_concepts: ['circuit breaker'],
}

describe('getScoreCardSystemPrompt', () => {
  it('returns English prompt by default', () => {
    const prompt = getScoreCardSystemPrompt()
    expect(prompt).toContain('Respond in English')
    expect(prompt).toContain('top_strengths')
    expect(prompt).toContain('top_gaps')
    expect(prompt).toContain('missing_concepts')
    expect(prompt).toContain('recommendation')
  })

  it('returns English prompt when language is "en"', () => {
    const prompt = getScoreCardSystemPrompt('en')
    expect(prompt).toContain('Respond in English')
  })

  it('returns Portuguese prompt when language is "pt"', () => {
    const prompt = getScoreCardSystemPrompt('pt')
    expect(prompt).toContain('Responda em português')
    expect(prompt).toContain('top_strengths')
    expect(prompt).toContain('top_gaps')
    expect(prompt).toContain('missing_concepts')
    expect(prompt).toContain('recommendation')
  })

  it('enforces JSON-only output', () => {
    expect(getScoreCardSystemPrompt('en')).toContain('ONLY with valid JSON')
    expect(getScoreCardSystemPrompt('pt')).toContain('APENAS com JSON válido')
  })

  it('requires exactly 3 strengths and 3 gaps', () => {
    const en = getScoreCardSystemPrompt('en')
    expect(en).toContain('exactly 3')
    const pt = getScoreCardSystemPrompt('pt')
    expect(pt).toContain('exatamente 3')
  })
})

describe('scoreCardPrompt', () => {
  it('returns system and user fields', () => {
    const result = scoreCardPrompt([sampleEval])
    expect(result).toHaveProperty('system')
    expect(result).toHaveProperty('user')
  })

  it('includes evaluation count in user message', () => {
    const result = scoreCardPrompt([sampleEval, sampleEval])
    expect(result.user).toContain('2')
  })

  it('includes score, strengths, gaps, and missing_concepts from each eval', () => {
    const result = scoreCardPrompt([sampleEval])
    expect(result.user).toContain('75')
    expect(result.user).toContain('async handling')
    expect(result.user).toContain('scalability')
    expect(result.user).toContain('circuit breaker')
  })

  it('handles empty arrays gracefully', () => {
    const eval2 = { score: 50, strengths: [], gaps: [], missing_concepts: [] }
    const result = scoreCardPrompt([eval2])
    expect(result.user).toContain('none')
  })

  it('uses PT system prompt when language is "pt"', () => {
    const result = scoreCardPrompt([sampleEval], 'pt')
    expect(result.system).toContain('Responda em português')
  })

  it('numbers each evaluation in user message', () => {
    const result = scoreCardPrompt([sampleEval, sampleEval])
    expect(result.user).toContain('Evaluation 1:')
    expect(result.user).toContain('Evaluation 2:')
  })
})
