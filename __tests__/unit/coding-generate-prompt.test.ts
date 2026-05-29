import { describe, it, expect } from 'vitest'
import {
  getCodingGenerateSystemPrompt,
  codingGeneratePrompt,
  type ProblemDifficulty,
} from '@/lib/ai/prompts/coding-generate.prompt'

describe('getCodingGenerateSystemPrompt', () => {
  it('returns English prompt by default', () => {
    const prompt = getCodingGenerateSystemPrompt()
    expect(prompt).toContain('English')
    expect(prompt).toContain('JSON schema')
    expect(prompt).toContain('"title"')
    expect(prompt).toContain('"description"')
  })

  it('returns PT prompt when language is pt', () => {
    const prompt = getCodingGenerateSystemPrompt('pt')
    expect(prompt).toContain('Brazilian Portuguese')
  })

  it('falls back to English for unknown language', () => {
    const prompt = getCodingGenerateSystemPrompt('fr')
    expect(prompt).toContain('English')
  })

  it('instructs not to reveal solution', () => {
    const prompt = getCodingGenerateSystemPrompt('en')
    expect(prompt).toContain('NOT include the solution')
  })

  it('demands valid JSON output only', () => {
    const prompt = getCodingGenerateSystemPrompt('en')
    expect(prompt).toContain('ONLY valid JSON')
  })
})

describe('codingGeneratePrompt', () => {
  it('includes difficulty in user message', () => {
    const p = codingGeneratePrompt({ difficulty: 'hard' })
    expect(p.user).toContain('hard')
  })

  it('includes topic when provided', () => {
    const p = codingGeneratePrompt({ difficulty: 'easy', topic: 'graphs' })
    expect(p.user).toContain('graphs')
  })

  it('uses generic topic line when topic is omitted', () => {
    const p = codingGeneratePrompt({ difficulty: 'medium' })
    expect(p.user).toContain('any data structures')
  })

  it('includes coding language', () => {
    const p = codingGeneratePrompt({ difficulty: 'medium', codingLanguage: 'python' })
    expect(p.user).toContain('python')
  })

  it('returns system prompt in the result', () => {
    const p = codingGeneratePrompt({ difficulty: 'medium' })
    expect(p.system).toBeDefined()
    expect(p.system.length).toBeGreaterThan(0)
  })

  it.each<ProblemDifficulty>(['easy', 'medium', 'hard'])(
    'handles difficulty: %s',
    (difficulty) => {
      const p = codingGeneratePrompt({ difficulty })
      expect(p.user).toContain(difficulty)
    }
  )
})
