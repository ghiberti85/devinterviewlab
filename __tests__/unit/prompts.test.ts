import { describe, it, expect } from 'vitest'

import {
  getCodeEvaluateSystemPrompt,
  codeEvaluatePrompt,
} from '@/lib/ai/prompts/code-evaluate.prompt'
import {
  getEvaluateSystemPrompt,
  evaluatePrompt,
} from '@/lib/ai/prompts/evaluate.prompt'
import {
  getBehavioralSystemPrompt,
  behavioralPrompt,
} from '@/lib/ai/prompts/behavioral.prompt'
import {
  getFollowupSystemPrompt,
  getTreplicaSystemPrompt,
  followupPrompt,
  treplicaEvaluatePrompt,
} from '@/lib/ai/prompts/followup.prompt'
import type { Question } from '@/lib/supabase/types'

// ─── helpers ─────────────────────────────────────────────────────────────────

const makeQuestion = (overrides: Partial<Question> = {}): Question =>
  ({
    id: 'q1',
    title: 'Explain the Event Loop',
    body: 'Focus on microtasks vs macrotasks.',
    ideal_answer: 'The event loop processes microtasks before macrotasks.',
    is_behavioral: false,
    topic_id: 't1',
    difficulty: 'medium',
    created_at: new Date().toISOString(),
    user_id: 'u1',
    ...overrides,
  } as Question)

// ─── code-evaluate.prompt ────────────────────────────────────────────────────

describe('getCodeEvaluateSystemPrompt', () => {
  it('defaults to English when no language is supplied', () => {
    const prompt = getCodeEvaluateSystemPrompt()
    expect(prompt).toContain('English')
    expect(prompt).not.toContain('Portuguese')
  })

  it('uses English for language="en"', () => {
    expect(getCodeEvaluateSystemPrompt('en')).toContain('English')
  })

  it('uses Portuguese for language="pt"', () => {
    const prompt = getCodeEvaluateSystemPrompt('pt')
    expect(prompt).toContain('Brazilian Portuguese')
    expect(prompt).not.toContain('Respond ENTIRELY in English')
  })

  it('falls back to English for an unknown language code', () => {
    expect(getCodeEvaluateSystemPrompt('de')).toContain('English')
  })

  it('includes the JSON schema keys required by the AI service', () => {
    const prompt = getCodeEvaluateSystemPrompt()
    for (const key of ['score', 'time_complexity', 'space_complexity', 'issues', 'suggestions', 'verdict']) {
      expect(prompt).toContain(`"${key}"`)
    }
  })

  it('instructs the model to return only valid JSON without markdown', () => {
    const prompt = getCodeEvaluateSystemPrompt()
    expect(prompt).toContain('Return ONLY valid JSON')
    expect(prompt).toContain('no markdown')
  })
})

describe('codeEvaluatePrompt', () => {
  const base = {
    problemTitle: 'Two Sum',
    problemDescription: 'Return indices of the two numbers that add to target.',
    code: 'function twoSum(nums, target) { return [0,1] }',
    codingLanguage: 'javascript',
  }

  it('returns an object with system and user fields', () => {
    const result = codeEvaluatePrompt(base)
    expect(result).toHaveProperty('system')
    expect(result).toHaveProperty('user')
  })

  it('includes the problem title in the user message', () => {
    const result = codeEvaluatePrompt(base)
    expect(result.user).toContain('Two Sum')
  })

  it('includes the submitted code in a fenced code block', () => {
    const result = codeEvaluatePrompt(base)
    expect(result.user).toContain('```javascript')
    expect(result.user).toContain(base.code)
  })

  it('includes the problem description when provided', () => {
    const result = codeEvaluatePrompt(base)
    expect(result.user).toContain(base.problemDescription)
  })

  it('omits the description section when problemDescription is empty', () => {
    const result = codeEvaluatePrompt({ ...base, problemDescription: '' })
    expect(result.user).not.toContain('Description:')
  })

  it('uses the correct coding language tag', () => {
    const result = codeEvaluatePrompt({ ...base, codingLanguage: 'python' })
    expect(result.user).toContain('```python')
  })

  it('defaults system prompt to English when language is not provided', () => {
    const result = codeEvaluatePrompt(base)
    expect(result.system).toContain('English')
  })

  it('generates Portuguese system prompt when language="pt"', () => {
    const result = codeEvaluatePrompt({ ...base, language: 'pt' })
    expect(result.system).toContain('Brazilian Portuguese')
  })
})

// ─── evaluate.prompt ─────────────────────────────────────────────────────────

describe('getEvaluateSystemPrompt', () => {
  it('defaults to English', () => {
    expect(getEvaluateSystemPrompt()).toContain('English')
  })

  it('uses English for language="en"', () => {
    expect(getEvaluateSystemPrompt('en')).toContain('English')
  })

  it('uses Portuguese for language="pt"', () => {
    expect(getEvaluateSystemPrompt('pt')).toContain('Brazilian Portuguese')
  })

  it('falls back to English for an unknown language code', () => {
    expect(getEvaluateSystemPrompt('fr')).toContain('English')
  })

  it('includes the required JSON schema keys', () => {
    const prompt = getEvaluateSystemPrompt()
    for (const key of ['score', 'strengths', 'gaps', 'suggestions', 'missing_concepts', 'score_breakdown']) {
      expect(prompt).toContain(`"${key}"`)
    }
  })

  it('includes score_breakdown sub-keys', () => {
    const prompt = getEvaluateSystemPrompt()
    for (const key of ['correctness', 'completeness', 'clarity', 'depth']) {
      expect(prompt).toContain(`"${key}"`)
    }
  })

  it('instructs model to return only valid JSON without markdown', () => {
    const prompt = getEvaluateSystemPrompt()
    expect(prompt.toLowerCase()).toContain('json')
    expect(prompt).toContain('sem markdown')
  })
})

describe('evaluatePrompt', () => {
  const question = makeQuestion()
  const userAnswer = 'The event loop picks tasks from the queue and runs them.'

  it('returns system and user fields', () => {
    const result = evaluatePrompt(question, userAnswer)
    expect(result).toHaveProperty('system')
    expect(result).toHaveProperty('user')
  })

  it('includes the question title in the user message', () => {
    expect(evaluatePrompt(question, userAnswer).user).toContain(question.title)
  })

  it('includes the question body when present', () => {
    expect(evaluatePrompt(question, userAnswer).user).toContain(question.body!)
  })

  it('omits the body section when question.body is absent', () => {
    const q = makeQuestion({ body: null })
    expect(evaluatePrompt(q, userAnswer).user).not.toContain('Contexto da pergunta:')
  })

  it('includes the ideal answer in the user message', () => {
    expect(evaluatePrompt(question, userAnswer).user).toContain(question.ideal_answer!)
  })

  it('uses fallback text when ideal_answer is absent', () => {
    const q = makeQuestion({ ideal_answer: null })
    expect(evaluatePrompt(q, userAnswer).user).toContain('Não fornecida')
  })

  it('includes the candidate answer', () => {
    expect(evaluatePrompt(question, userAnswer).user).toContain(userAnswer)
  })

  it('generates Portuguese system prompt when language="pt"', () => {
    expect(evaluatePrompt(question, userAnswer, 'pt').system).toContain('Brazilian Portuguese')
  })
})

// ─── behavioral.prompt ───────────────────────────────────────────────────────

describe('getBehavioralSystemPrompt', () => {
  it('defaults to English', () => {
    expect(getBehavioralSystemPrompt()).toContain('English')
  })

  it('uses Portuguese for language="pt"', () => {
    expect(getBehavioralSystemPrompt('pt')).toContain('Brazilian Portuguese')
  })

  it('falls back to English for unknown language', () => {
    expect(getBehavioralSystemPrompt('ja')).toContain('English')
  })

  it('includes STAR framework section', () => {
    const prompt = getBehavioralSystemPrompt()
    expect(prompt).toContain('STAR')
  })

  it('includes all required JSON schema keys', () => {
    const prompt = getBehavioralSystemPrompt()
    for (const key of ['score', 'strengths', 'gaps', 'suggestions', 'missing_concepts', 'score_breakdown', 'star_analysis']) {
      expect(prompt).toContain(`"${key}"`)
    }
  })

  it('includes star_analysis sub-keys', () => {
    const prompt = getBehavioralSystemPrompt()
    for (const key of ['situation', 'task', 'action', 'result']) {
      expect(prompt).toContain(`"${key}"`)
    }
  })

  it('includes detected, score, and notes inside star_analysis', () => {
    const prompt = getBehavioralSystemPrompt()
    expect(prompt).toContain('"detected"')
    expect(prompt).toContain('"notes"')
  })
})

describe('behavioralPrompt', () => {
  const question = makeQuestion({ is_behavioral: true, title: 'Tell me about a conflict with a peer.' })
  const userAnswer = 'Situation: we disagreed on architecture...'

  it('returns system and user fields', () => {
    const result = behavioralPrompt(question, userAnswer)
    expect(result).toHaveProperty('system')
    expect(result).toHaveProperty('user')
  })

  it('includes the question title', () => {
    expect(behavioralPrompt(question, userAnswer).user).toContain(question.title)
  })

  it('includes the candidate answer', () => {
    expect(behavioralPrompt(question, userAnswer).user).toContain(userAnswer)
  })

  it('includes question body when present', () => {
    expect(behavioralPrompt(question, userAnswer).user).toContain(question.body!)
  })

  it('omits body section when question.body is absent', () => {
    const q = makeQuestion({ body: null, is_behavioral: true })
    expect(behavioralPrompt(q, userAnswer).user).not.toContain('Contexto:')
  })

  it('generates Portuguese system prompt when language="pt"', () => {
    expect(behavioralPrompt(question, userAnswer, 'pt').system).toContain('Brazilian Portuguese')
  })
})

// ─── followup.prompt ─────────────────────────────────────────────────────────

describe('getFollowupSystemPrompt', () => {
  it('defaults to English', () => {
    expect(getFollowupSystemPrompt()).toContain('English')
  })

  it('uses Portuguese for language="pt"', () => {
    expect(getFollowupSystemPrompt('pt')).toContain('Brazilian Portuguese')
  })

  it('falls back to English for unknown language', () => {
    expect(getFollowupSystemPrompt('zh')).toContain('English')
  })

  it('includes required JSON schema keys', () => {
    const prompt = getFollowupSystemPrompt()
    expect(prompt).toContain('"followup_question"')
    expect(prompt).toContain('"why_this_question"')
  })

  it('instructs model to return only valid JSON', () => {
    expect(getFollowupSystemPrompt()).toContain('Return ONLY valid JSON')
  })
})

describe('getTreplicaSystemPrompt', () => {
  it('defaults to English', () => {
    expect(getTreplicaSystemPrompt()).toContain('English')
  })

  it('uses Portuguese for language="pt"', () => {
    expect(getTreplicaSystemPrompt('pt')).toContain('Brazilian Portuguese')
  })

  it('includes required JSON schema keys', () => {
    const prompt = getTreplicaSystemPrompt()
    for (const key of ['score', 'improvement', 'strengths', 'gaps', 'suggestions', 'verdict']) {
      expect(prompt).toContain(`"${key}"`)
    }
  })
})

describe('followupPrompt', () => {
  const base = {
    originalQuestion: 'Explain closures in JavaScript.',
    userAnswer: 'A closure is a function that remembers its lexical scope.',
    gaps: ['Did not mention practical use cases', 'Did not address memory implications'],
  }

  it('returns system and user fields', () => {
    const result = followupPrompt(base)
    expect(result).toHaveProperty('system')
    expect(result).toHaveProperty('user')
  })

  it('includes the original question in the user message', () => {
    expect(followupPrompt(base).user).toContain(base.originalQuestion)
  })

  it('includes the candidate answer in the user message', () => {
    expect(followupPrompt(base).user).toContain(base.userAnswer)
  })

  it('lists the identified gaps in the user message', () => {
    const user = followupPrompt(base).user
    for (const gap of base.gaps) {
      expect(user).toContain(gap)
    }
  })

  it('uses a fallback message when gaps array is empty', () => {
    const result = followupPrompt({ ...base, gaps: [] })
    expect(result.user).toContain('Answer was incomplete')
  })

  it('defaults system prompt to English', () => {
    expect(followupPrompt(base).system).toContain('English')
  })

  it('generates Portuguese system prompt when language="pt"', () => {
    expect(followupPrompt({ ...base, language: 'pt' }).system).toContain('Brazilian Portuguese')
  })
})

describe('treplicaEvaluatePrompt', () => {
  const base = {
    originalQuestion: 'Explain closures.',
    followupQuestion: 'What are the memory implications of closures?',
    followupAnswer: 'Closures can cause memory leaks if references are held unnecessarily.',
  }

  it('returns system and user fields', () => {
    const result = treplicaEvaluatePrompt(base)
    expect(result).toHaveProperty('system')
    expect(result).toHaveProperty('user')
  })

  it('includes original question in user message', () => {
    expect(treplicaEvaluatePrompt(base).user).toContain(base.originalQuestion)
  })

  it('includes follow-up question in user message', () => {
    expect(treplicaEvaluatePrompt(base).user).toContain(base.followupQuestion)
  })

  it('includes candidate follow-up answer in user message', () => {
    expect(treplicaEvaluatePrompt(base).user).toContain(base.followupAnswer)
  })

  it('defaults system prompt to English', () => {
    expect(treplicaEvaluatePrompt(base).system).toContain('English')
  })

  it('generates Portuguese system prompt when language="pt"', () => {
    expect(treplicaEvaluatePrompt({ ...base, language: 'pt' }).system).toContain('Brazilian Portuguese')
  })
})
