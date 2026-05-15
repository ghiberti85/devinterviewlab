import OpenAI from 'openai'
import { getEvaluateSystemPrompt, evaluatePrompt } from './prompts/evaluate.prompt'
import { getBehavioralSystemPrompt, behavioralPrompt } from './prompts/behavioral.prompt'
import { generatePrompt } from './prompts/generate.prompt'
import { generateFromContextPrompt } from './prompts/generate-from-context.prompt'
import {
  getFollowupSystemPrompt,
  getTreplicaSystemPrompt,
  followupPrompt,
  treplicaEvaluatePrompt,
} from './prompts/followup.prompt'
import {
  getCodeEvaluateSystemPrompt,
  codeEvaluatePrompt,
} from './prompts/code-evaluate.prompt'
import type { Question, EvaluationFeedback, Difficulty } from '@/lib/supabase/types'

function getModel(): string {
  if (process.env.OPENAI_MODEL) return process.env.OPENAI_MODEL
  const base = process.env.OPENAI_BASE_URL ?? ''
  if (base.includes('groq.com')) return 'llama-3.3-70b-versatile'
  if (base.includes('googleapis.com')) return 'gemini-1.5-flash'
  return 'gpt-4o'
}

function hasApiKey(): boolean {
  return !!process.env.OPENAI_API_KEY
}

// Singleton client — created once per process, reused across all requests
let _client: OpenAI | null = null
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? 'no-key',
      baseURL: process.env.OPENAI_BASE_URL,
    })
  }
  return _client
}

// Memoize static system prompts that only vary by language.
// Each unique (promptType + language) key is computed once and cached for the process lifetime.
const _systemPromptCache = new Map<string, string>()
function cachedSystemPrompt(key: string, factory: () => string): string {
  if (!_systemPromptCache.has(key)) _systemPromptCache.set(key, factory())
  return _systemPromptCache.get(key)!
}

const PROMPT_VERSION = 'v2.0'

function safeParseJSON<T>(text: string): T {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(clean) as T
}

const noKeyEvaluation = (question: Question, userAnswer: string) => ({
  question_id: question.id,
  user_answer: userAnswer,
  score: 0,
  feedback: {
    strengths: [],
    gaps: ['AI evaluation is not configured. Add a Groq or Gemini API key to enable this feature.'],
    suggestions: ['Check the README for free AI provider setup instructions.'],
    score_breakdown: { correctness: 0, completeness: 0, clarity: 0, depth: 0 },
    missing_concepts: [],
  } satisfies EvaluationFeedback,
  missing_concepts: [],
  model_used: 'none',
  prompt_version: PROMPT_VERSION,
})

export const aiService = {
  async evaluateAnswer(question: Question, userAnswer: string, language = 'en') {
    if (!hasApiKey()) return noKeyEvaluation(question, userAnswer)
    const openai = getClient()
    const MODEL = getModel()
    const systemPrompt = question.is_behavioral
      ? cachedSystemPrompt(`behavioral:${language}`, () => getBehavioralSystemPrompt(language))
      : cachedSystemPrompt(`evaluate:${language}`, () => getEvaluateSystemPrompt(language))
    const prompt = question.is_behavioral
      ? behavioralPrompt(question, userAnswer, language)
      : evaluatePrompt(question, userAnswer, language)

    const res = await openai.chat.completions.create({
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.user },
      ],
    })

    const raw = safeParseJSON<EvaluationFeedback & { score: number }>(
      res.choices[0].message.content ?? '{}'
    )

    return {
      question_id: question.id,
      user_answer: userAnswer,
      score: raw.score ?? 0,
      feedback: {
        strengths: raw.strengths ?? [],
        gaps: raw.gaps ?? [],
        suggestions: raw.suggestions ?? [],
        star_analysis: raw.star_analysis,
        score_breakdown: raw.score_breakdown ?? { correctness: 0, completeness: 0, clarity: 0, depth: 0 },
        missing_concepts: raw.missing_concepts ?? [],
      } satisfies EvaluationFeedback,
      missing_concepts: raw.missing_concepts ?? [],
      model_used: MODEL,
      prompt_version: PROMPT_VERSION,
    }
  },

  async generateFollowup(opts: {
    originalQuestion: string
    userAnswer: string
    gaps: string[]
    language?: string
  }) {
    if (!hasApiKey()) return { followup_question: 'AI not configured.', why_this_question: '' }
    const openai = getClient()
    const { language = 'en' } = opts
    const systemPrompt = cachedSystemPrompt(`followup:${language}`, () => getFollowupSystemPrompt(language))
    const prompt = followupPrompt(opts)

    const res = await openai.chat.completions.create({
      model: getModel(),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.user },
      ],
    })
    return safeParseJSON<{ followup_question: string; why_this_question: string }>(
      res.choices[0].message.content ?? '{}'
    )
  },

  async evaluateFollowup(opts: {
    originalQuestion: string
    followupQuestion: string
    followupAnswer: string
    language?: string
  }) {
    if (!hasApiKey()) return { score: 0, improvement: 'AI not configured.', strengths: [], gaps: [], suggestions: [], verdict: '' }
    const openai = getClient()
    const { language = 'en' } = opts
    const systemPrompt = cachedSystemPrompt(`treplica:${language}`, () => getTreplicaSystemPrompt(language))
    const prompt = treplicaEvaluatePrompt(opts)

    const res = await openai.chat.completions.create({
      model: getModel(),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.user },
      ],
    })
    return safeParseJSON<{
      score: number; improvement: string; strengths: string[]
      gaps: string[]; suggestions: string[]; verdict: string
    }>(res.choices[0].message.content ?? '{}')
  },

  async generateQuestions(topic: string, difficulty: Difficulty, count = 5) {
    if (!hasApiKey()) return []
    const openai = getClient()
    const MODEL = getModel()
    const prompt = generatePrompt(topic, difficulty, count)
    const res = await openai.chat.completions.create({
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
    })
    const { questions } = safeParseJSON<{ questions: Partial<Question>[] }>(
      res.choices[0].message.content ?? '{}'
    )
    return questions
  },

  async evaluateCode(opts: {
    problemTitle: string
    problemDescription: string
    code: string
    codingLanguage: string
    language?: string
  }) {
    if (!hasApiKey()) return {
      score: 0,
      feedback: {
        time_complexity: 'N/A', space_complexity: 'N/A',
        issues: ['AI not configured.'], suggestions: [], verdict: '',
      },
    }
    const openai = getClient()
    const { language = 'en' } = opts
    const systemPrompt = cachedSystemPrompt(`code-evaluate:${language}`, () => getCodeEvaluateSystemPrompt(language))
    const prompt = codeEvaluatePrompt(opts)

    const res = await openai.chat.completions.create({
      model: getModel(),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.user },
      ],
    })
    const raw = safeParseJSON<{
      score: number
      time_complexity: string
      space_complexity: string
      issues: string[]
      suggestions: string[]
      verdict: string
    }>(res.choices[0].message.content ?? '{}')

    return {
      score: raw.score ?? 0,
      feedback: {
        time_complexity: raw.time_complexity ?? '',
        space_complexity: raw.space_complexity ?? '',
        issues: raw.issues ?? [],
        suggestions: raw.suggestions ?? [],
        verdict: raw.verdict ?? '',
      },
    }
  },

  async generateFromContext(opts: {
    context: string; cvText?: string; difficulty: Difficulty | 'mixed'
    count: number; categoryName?: string; isBehavioral?: boolean; language?: string
  }) {
    if (!hasApiKey()) return { questions: [], skills_detected: [], summary: 'AI not configured.' }
    const openai = getClient()
    // generateFromContext system prompt varies by many params — not memoized
    const prompt = generateFromContextPrompt(opts)
    const res = await openai.chat.completions.create({
      model: getModel(),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
    })
    return safeParseJSON<{
      questions: (Partial<Question> & { detected_skills?: string[] })[]
      skills_detected: string[]
      summary: string
    }>(res.choices[0].message.content ?? '{}')
  },
}
