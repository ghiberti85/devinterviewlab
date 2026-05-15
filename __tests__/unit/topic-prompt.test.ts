import { describe, it, expect } from 'vitest'
import { getTopicSystemPrompt, topicAnalysisPrompt } from '@/lib/ai/prompts/topic.prompt'

describe('getTopicSystemPrompt', () => {
  it('defaults to English', () => {
    expect(getTopicSystemPrompt()).toContain('English')
  })

  it('uses Brazilian Portuguese when language is pt', () => {
    expect(getTopicSystemPrompt('pt')).toContain('Brazilian Portuguese')
  })

  it('falls back to English for unknown language', () => {
    expect(getTopicSystemPrompt('de')).toContain('English')
  })

  it('instructs model to return only valid JSON', () => {
    expect(getTopicSystemPrompt()).toContain('ONLY valid JSON')
  })

  it('includes required JSON schema keys', () => {
    const system = getTopicSystemPrompt()
    for (const key of ['title', 'summary', 'when_to_use', 'code_snippet', 'quick_qa', 'tags']) {
      expect(system).toContain(`"${key}"`)
    }
  })

  it('specifies exactly 4 Q&A pairs', () => {
    expect(getTopicSystemPrompt()).toContain('exactly 4')
  })

  it('enforces answer length guidance (50-120 words)', () => {
    const system = getTopicSystemPrompt()
    expect(system).toContain('50-120')
  })

  it('enforces summary length guidance (150-250 words)', () => {
    expect(getTopicSystemPrompt()).toContain('150-250')
  })
})

describe('topicAnalysisPrompt', () => {
  it('returns system and user fields', () => {
    const result = topicAnalysisPrompt({ topicName: 'Event Loop' })
    expect(result).toHaveProperty('system')
    expect(result).toHaveProperty('user')
  })

  it('includes the topic name in the user message', () => {
    const { user } = topicAnalysisPrompt({ topicName: 'Redis Pub/Sub' })
    expect(user).toContain('Redis Pub/Sub')
  })

  it('includes difficulty in the user message', () => {
    const { user } = topicAnalysisPrompt({ topicName: 'SOLID', difficulty: 'hard' })
    expect(user).toContain('hard')
  })

  it('defaults difficulty to medium when not provided', () => {
    const { user } = topicAnalysisPrompt({ topicName: 'Closures' })
    expect(user).toContain('medium')
  })

  it('uses Portuguese system prompt when language is pt', () => {
    const { system } = topicAnalysisPrompt({ topicName: 'Event Loop', language: 'pt' })
    expect(system).toContain('Brazilian Portuguese')
  })

  it('uses English system prompt when language is en', () => {
    const { system } = topicAnalysisPrompt({ topicName: 'Event Loop', language: 'en' })
    expect(system).toContain('English')
  })
})
