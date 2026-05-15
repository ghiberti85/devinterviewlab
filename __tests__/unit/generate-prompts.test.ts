import { describe, it, expect } from 'vitest'
import { generatePrompt } from '@/lib/ai/prompts/generate.prompt'
import { generateFromContextPrompt } from '@/lib/ai/prompts/generate-from-context.prompt'

// ─── generatePrompt ───────────────────────────────────────────────────────────

describe('generatePrompt', () => {
  it('returns system and user fields', () => {
    const result = generatePrompt('React', 'medium', 5)
    expect(result).toHaveProperty('system')
    expect(result).toHaveProperty('user')
  })

  it('includes the topic in the user message', () => {
    expect(generatePrompt('Node.js', 'easy', 3).user).toContain('Node.js')
  })

  it('includes the difficulty in the user message', () => {
    expect(generatePrompt('CSS', 'hard', 2).user).toContain('hard')
  })

  it('includes the count in the user message', () => {
    expect(generatePrompt('TypeScript', 'medium', 7).user).toContain('7')
  })

  it('system prompt includes the required JSON schema keys', () => {
    const { system } = generatePrompt('Go', 'easy', 1)
    for (const key of ['title', 'body', 'ideal_answer', 'difficulty']) {
      expect(system).toContain(`"${key}"`)
    }
  })

  it('system prompt instructs model to return only valid JSON', () => {
    expect(generatePrompt('Python', 'medium', 1).system).toContain('ONLY valid JSON')
  })
})

// ─── generateFromContextPrompt ────────────────────────────────────────────────

describe('generateFromContextPrompt', () => {
  const base = {
    context: 'Senior front-end engineer role at a fintech startup.',
    difficulty: 'medium' as const,
    count: 5,
    language: 'en',
  }

  it('returns system and user fields', () => {
    const result = generateFromContextPrompt(base)
    expect(result).toHaveProperty('system')
    expect(result).toHaveProperty('user')
  })

  it('includes the context in the user message', () => {
    expect(generateFromContextPrompt(base).user).toContain(base.context)
  })

  it('includes cv text in the user message when provided', () => {
    const result = generateFromContextPrompt({ ...base, cvText: 'John Doe — React engineer' })
    expect(result.user).toContain('John Doe')
  })

  it('omits CV block when cvText is not provided', () => {
    expect(generateFromContextPrompt(base).user).not.toContain('CURRÍCULO')
  })

  it('truncates cv text to 8000 chars', () => {
    const longCv = 'x'.repeat(10_000)
    const result = generateFromContextPrompt({ ...base, cvText: longCv })
    // 8000-char slice of 'x'.repeat(10000) should appear; nothing beyond
    expect(result.user).toContain('x'.repeat(8000))
    expect(result.user).not.toContain('x'.repeat(8001))
  })

  it('truncates context to 4000 chars', () => {
    const longContext = 'y'.repeat(6_000)
    const result = generateFromContextPrompt({ ...base, context: longContext })
    expect(result.user).toContain('y'.repeat(4000))
    expect(result.user).not.toContain('y'.repeat(4001))
  })

  it('includes categoryName in system prompt when provided', () => {
    const result = generateFromContextPrompt({ ...base, categoryName: 'System Design' })
    expect(result.system).toContain('System Design')
  })

  it('uses English language name in system prompt', () => {
    expect(generateFromContextPrompt({ ...base, language: 'en' }).system).toContain('English')
  })

  it('uses Portuguese language name in system prompt', () => {
    expect(generateFromContextPrompt({ ...base, language: 'pt' }).system).toContain('Brazilian Portuguese')
  })

  it('falls back to English for unknown language', () => {
    expect(generateFromContextPrompt({ ...base, language: 'de' }).system).toContain('English')
  })

  it('includes mixed difficulty distribution when difficulty is "mixed"', () => {
    const result = generateFromContextPrompt({ ...base, difficulty: 'mixed', count: 10 })
    expect(result.system).toContain('fáceis')
    expect(result.system).toContain('médias')
    expect(result.system).toContain('difíceis')
    expect(result.system).toContain('Cada pergunta DEVE ter seu próprio campo')
  })

  it('uses fixed difficulty instruction when difficulty is not "mixed"', () => {
    const result = generateFromContextPrompt({ ...base, difficulty: 'hard' })
    expect(result.system).toContain('"hard"')
    expect(result.system).not.toContain('fáceis')
  })

  it('marks is_behavioral as false in schema by default', () => {
    expect(generateFromContextPrompt(base).system).toContain('"is_behavioral": false')
  })

  it('marks is_behavioral as true in schema when isBehavioral=true', () => {
    const result = generateFromContextPrompt({ ...base, isBehavioral: true })
    expect(result.system).toContain('"is_behavioral": true')
    expect(result.system).toContain('STAR')
  })

  it('includes required JSON schema keys in system prompt', () => {
    const { system } = generateFromContextPrompt(base)
    for (const key of ['title', 'body', 'ideal_answer', 'difficulty', 'detected_skills', 'skills_detected', 'summary']) {
      expect(system).toContain(`"${key}"`)
    }
  })

  it('generates a generic user message when no context is provided', () => {
    const result = generateFromContextPrompt({ ...base, context: '' })
    expect(result.user).toContain('perguntas gerais')
  })
})

// ─── coding-hint.prompt ──────────────────────────────────────────────────────

import { getCodingHintSystemPrompt, codingHintPrompt } from '@/lib/ai/prompts/coding-hint.prompt'

describe('getCodingHintSystemPrompt', () => {
  it('defaults to English', () => {
    expect(getCodingHintSystemPrompt()).toContain('English')
  })

  it('uses Portuguese for language="pt"', () => {
    expect(getCodingHintSystemPrompt('pt')).toContain('Brazilian Portuguese')
  })

  it('instructs the model NOT to reveal the solution', () => {
    const prompt = getCodingHintSystemPrompt()
    expect(prompt).toContain('NEVER reveal the solution')
  })

  it('includes the required JSON schema key', () => {
    expect(getCodingHintSystemPrompt()).toContain('"hint"')
  })
})

describe('codingHintPrompt', () => {
  const base = {
    problemTitle: 'Two Sum',
    problemDescription: 'Return indices of two numbers that add to target.',
    code: 'function twoSum(nums, target) {}',
    codingLanguage: 'javascript',
  }

  it('returns system and user fields', () => {
    expect(codingHintPrompt(base)).toHaveProperty('system')
    expect(codingHintPrompt(base)).toHaveProperty('user')
  })

  it('includes the problem title in the user message', () => {
    expect(codingHintPrompt(base).user).toContain('Two Sum')
  })

  it('includes the current code in a fenced block', () => {
    expect(codingHintPrompt(base).user).toContain('```javascript')
    expect(codingHintPrompt(base).user).toContain(base.code)
  })

  it('uses empty code placeholder when code is empty', () => {
    const result = codingHintPrompt({ ...base, code: '' })
    expect(result.user).toContain('(empty')
  })

  it('truncates description to 500 chars', () => {
    const longDesc = 'x'.repeat(600)
    const result = codingHintPrompt({ ...base, problemDescription: longDesc })
    expect(result.user).toContain('x'.repeat(500))
    expect(result.user).not.toContain('x'.repeat(501))
  })

  it('generates Portuguese system prompt when language="pt"', () => {
    expect(codingHintPrompt({ ...base, language: 'pt' }).system).toContain('Brazilian Portuguese')
  })
})

// ─── utils.cn ────────────────────────────────────────────────────────────────

import { cn } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'skip', 'keep')).toBe('base keep')
  })

  it('resolves Tailwind conflicts — last wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('resolves Tailwind conflicts with different axes independently', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('returns empty string for no args', () => {
    expect(cn()).toBe('')
  })

  it('handles undefined and null gracefully', () => {
    expect(cn('a', undefined, null as any, 'b')).toBe('a b')
  })

  it('handles array of classes', () => {
    expect(cn(['text-sm', 'font-bold'])).toBe('text-sm font-bold')
  })
})
