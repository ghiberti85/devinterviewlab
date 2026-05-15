import { describe, it, expect } from 'vitest'
import { getTopicSystemPrompt, topicAnalysisPrompt, topicTranslatePrompt } from '@/lib/ai/prompts/topic.prompt'

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

const SAMPLE_TOPIC = {
  title: 'Event Loop',
  summary: 'The Event Loop is the mechanism that allows Node.js to perform non-blocking I/O.',
  when_to_use: 'Use when building async-heavy applications.',
  quick_qa: [
    { q: 'What is the call stack?', a: 'A LIFO structure that tracks function execution.' },
  ],
  tags: ['javascript', 'async', 'node'],
}

describe('topicTranslatePrompt', () => {
  it('returns system and user fields', () => {
    const result = topicTranslatePrompt({ topic: SAMPLE_TOPIC, targetLanguage: 'pt' })
    expect(result).toHaveProperty('system')
    expect(result).toHaveProperty('user')
  })

  it('includes target language in the system prompt', () => {
    const { system } = topicTranslatePrompt({ topic: SAMPLE_TOPIC, targetLanguage: 'pt' })
    expect(system).toContain('Brazilian Portuguese')
  })

  it('includes target language English in the system prompt', () => {
    const { system } = topicTranslatePrompt({ topic: SAMPLE_TOPIC, targetLanguage: 'en' })
    expect(system).toContain('English')
  })

  it('includes the topic title in the user message', () => {
    const { user } = topicTranslatePrompt({ topic: SAMPLE_TOPIC, targetLanguage: 'pt' })
    expect(user).toContain('Event Loop')
  })

  it('includes the summary in the user message', () => {
    const { user } = topicTranslatePrompt({ topic: SAMPLE_TOPIC, targetLanguage: 'pt' })
    expect(user).toContain('non-blocking I/O')
  })

  it('instructs model to preserve technical terms', () => {
    const { system } = topicTranslatePrompt({ topic: SAMPLE_TOPIC, targetLanguage: 'pt' })
    expect(system).toContain('technical terms')
  })

  it('instructs model to not translate code snippets', () => {
    const { system } = topicTranslatePrompt({ topic: SAMPLE_TOPIC, targetLanguage: 'pt' })
    expect(system).toContain('Code snippets')
  })

  it('instructs model to return only valid JSON', () => {
    const { system } = topicTranslatePrompt({ topic: SAMPLE_TOPIC, targetLanguage: 'pt' })
    expect(system).toContain('ONLY valid JSON')
  })

  it('includes required JSON schema keys in system prompt', () => {
    const { system } = topicTranslatePrompt({ topic: SAMPLE_TOPIC, targetLanguage: 'pt' })
    for (const key of ['title', 'summary', 'when_to_use', 'quick_qa', 'tags']) {
      expect(system).toContain(`"${key}"`)
    }
  })
})
