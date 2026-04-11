import OpenAI from 'openai'
import { evaluatePrompt } from './prompts/evaluate.prompt'
import { behavioralPrompt } from './prompts/behavioral.prompt'
import { generatePrompt } from './prompts/generate.prompt'
import { generateFromContextPrompt } from './prompts/generate-from-context.prompt'
import { followupPrompt, treplicaEvaluatePrompt } from './prompts/followup.prompt'
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

function createClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? 'no-key',
    baseURL: process.env.OPENAI_BASE_URL,
  })
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
    const openai = createClient()
    const MODEL = getModel()
    const prompt = question.is_behavioral
      ? behavioralPrompt(question, userAnswer, language)
      : evaluatePrompt(question, userAnswer, language)

    const res = await openai.chat.completions.create({
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt.system },
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
    const openai = createClient()
    const prompt = followupPrompt(opts)
    const res = await openai.chat.completions.create({
      model: getModel(),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt.system },
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
    const openai = createClient()
    const prompt = treplicaEvaluatePrompt(opts)
    const res = await openai.chat.completions.create({
      model: getModel(),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt.system },
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
    const openai = createClient()
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

  async generateFromContext(opts: {
    context: string; cvText?: string; difficulty: Difficulty | 'mixed'
    count: number; categoryName?: string; isBehavioral?: boolean; language?: string
  }) {
    if (!hasApiKey()) return { questions: [], skills_detected: [], summary: 'AI not configured.' }
    const openai = createClient()
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
