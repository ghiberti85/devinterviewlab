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
import { codingHintPrompt, getCodingHintSystemPrompt } from './prompts/coding-hint.prompt'
import { codingGeneratePrompt, getCodingGenerateSystemPrompt, type ProblemDifficulty } from './prompts/coding-generate.prompt'
import { getScoreCardSystemPrompt, scoreCardPrompt } from './prompts/score-card.prompt'
import { getRoadmapSystemPrompt, roadmapAnalysisPrompt } from './prompts/roadmap.prompt'
import { topicAnalysisPrompt, topicTranslatePrompt, getTopicSystemPrompt } from './prompts/topic.prompt'
import type { Question, EvaluationFeedback, Difficulty, GapAnalysis, RoadmapPhase } from '@/lib/supabase/types'

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
    hintsRequested?: number
    hintsShown?: number
    idlePauses?: number
  }) {
    if (!hasApiKey()) return {
      score: 0,
      feedback: {
        time_complexity: 'N/A', space_complexity: 'N/A',
        issues: ['AI not configured.'], suggestions: [], verdict: '', process_feedback: null,
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
      process_feedback?: string | null
    }>(res.choices[0].message.content ?? '{}')

    return {
      score: raw.score ?? 0,
      feedback: {
        time_complexity: raw.time_complexity ?? '',
        space_complexity: raw.space_complexity ?? '',
        issues: raw.issues ?? [],
        suggestions: raw.suggestions ?? [],
        verdict: raw.verdict ?? '',
        process_feedback: raw.process_feedback ?? null,
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

  async generateCodingHint(opts: {
    problemTitle: string
    problemDescription: string
    code: string
    codingLanguage: string
    language?: string
  }): Promise<{ hint: string }> {
    if (!hasApiKey()) return { hint: 'AI not configured.' }
    const openai = getClient()
    const { language = 'en' } = opts
    const systemPrompt = cachedSystemPrompt(
      `coding-hint:${language}`,
      () => getCodingHintSystemPrompt(language)
    )
    const prompt = codingHintPrompt(opts)

    const res = await openai.chat.completions.create({
      model: getModel(),
      response_format: { type: 'json_object' },
      max_tokens: 200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.user },
      ],
    })

    const raw = safeParseJSON<{ hint: string }>(res.choices[0].message.content ?? '{}')
    return { hint: raw.hint ?? '' }
  },

  async generateCodingProblem(opts: {
    difficulty: ProblemDifficulty
    topic?: string
    codingLanguage?: string
    language?: string
  }): Promise<{ title: string; description: string }> {
    if (!hasApiKey()) return { title: 'AI not configured', description: '' }
    const openai = getClient()
    const { language = 'en' } = opts
    const systemPrompt = cachedSystemPrompt(
      `coding-generate:${language}`,
      () => getCodingGenerateSystemPrompt(language)
    )
    const prompt = codingGeneratePrompt(opts)

    const res = await openai.chat.completions.create({
      model: getModel(),
      response_format: { type: 'json_object' },
      max_tokens: 800,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.user },
      ],
    })

    const raw = safeParseJSON<{ title: string; description: string }>(
      res.choices[0].message.content ?? '{}'
    )
    return { title: raw.title ?? '', description: raw.description ?? '' }
  },

  async generateTopic(opts: {
    topicName: string
    difficulty?: 'easy' | 'medium' | 'hard'
    language?: string
  }): Promise<{
    title: string
    summary: string
    when_to_use: string | null
    pros: string[]
    cons: string[]
    code_snippet: string | null
    quick_qa: Array<{ q: string; a: string }>
    tags: string[]
  }> {
    if (!hasApiKey()) return {
      title: opts.topicName,
      summary: 'AI not configured.',
      when_to_use: null,
      pros: [],
      cons: [],
      code_snippet: null,
      quick_qa: [],
      tags: [],
    }
    const openai = getClient()
    const { language = 'en' } = opts
    const prompt = topicAnalysisPrompt(opts)
    const systemPrompt = cachedSystemPrompt(
      `topic:${language}`,
      () => getTopicSystemPrompt(language)
    )

    const res = await openai.chat.completions.create({
      model: getModel(),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.user },
      ],
    })

    return safeParseJSON<{
      title: string
      summary: string
      when_to_use: string | null
      pros: string[]
      cons: string[]
      code_snippet: string | null
      quick_qa: Array<{ q: string; a: string }>
      tags: string[]
    }>(res.choices[0].message.content ?? '{}')
  },

  async translateTopic(opts: {
    topic: {
      title: string
      summary: string
      when_to_use: string | null
      pros: string[]
      cons: string[]
      quick_qa: Array<{ q: string; a: string }>
      tags: string[]
    }
    targetLanguage: string
  }): Promise<{
    title: string
    summary: string
    when_to_use: string | null
    pros: string[]
    cons: string[]
    quick_qa: Array<{ q: string; a: string }>
    tags: string[]
  }> {
    if (!hasApiKey()) return {
      title: opts.topic.title,
      summary: opts.topic.summary,
      when_to_use: opts.topic.when_to_use,
      pros: opts.topic.pros,
      cons: opts.topic.cons,
      quick_qa: opts.topic.quick_qa,
      tags: opts.topic.tags,
    }
    const openai = getClient()
    const { system, user } = topicTranslatePrompt(opts)
    const res = await openai.chat.completions.create({
      model: getModel(),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    })
    return safeParseJSON<{
      title: string
      summary: string
      when_to_use: string | null
      pros: string[]
      cons: string[]
      quick_qa: Array<{ q: string; a: string }>
      tags: string[]
    }>(res.choices[0].message.content ?? '{}')
  },

  async generateScoreCard(
    evaluations: Array<{ score: number; strengths: string[]; gaps: string[]; missing_concepts: string[] }>,
    language = 'en'
  ): Promise<{ recommendation: string; top_strengths: string[]; top_gaps: string[]; missing_concepts: string[] }> {
    if (!hasApiKey()) {
      return { recommendation: '', top_strengths: [], top_gaps: [], missing_concepts: [] }
    }
    const openai = getClient()
    const systemPrompt = cachedSystemPrompt(
      `score-card:${language}`,
      () => getScoreCardSystemPrompt(language)
    )
    const prompt = scoreCardPrompt(evaluations, language)

    const res = await openai.chat.completions.create({
      model: getModel(),
      response_format: { type: 'json_object' },
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.user },
      ],
    })

    const raw = safeParseJSON<{
      recommendation: string
      top_strengths: string[]
      top_gaps: string[]
      missing_concepts: string[]
    }>(res.choices[0].message.content ?? '{}')

    return {
      recommendation: raw.recommendation ?? '',
      top_strengths: raw.top_strengths ?? [],
      top_gaps: raw.top_gaps ?? [],
      missing_concepts: raw.missing_concepts ?? [],
    }
  },

  async generateRoadmapQuestions(opts: {
    topicName: string
    phaseName: string
    language?: string
    existingQuestions?: string[]
    questionType?: 'theoretical' | 'live_coding'
  }): Promise<Array<{ question: string; answer: string }>> {
    if (!hasApiKey()) return []
    const openai = getClient()
    const { topicName, phaseName, language = 'en', existingQuestions = [], questionType = 'theoretical' } = opts
    const langLabel = language === 'pt' ? 'Portuguese (Brazilian)' : 'English'
    const isLiveCoding = questionType === 'live_coding'

    const avoidBlock = existingQuestions.length > 0
      ? `\n\nDo NOT repeat or rephrase these already-existing questions:\n${existingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : ''

    const systemPrompt = isLiveCoding
      ? `You are a technical coding interview coach. Generate exactly 5 live coding challenges. Return only valid JSON, no markdown.`
      : `You are a technical interview coach. Generate exactly 5 interview questions with detailed answers. Return only valid JSON, no markdown.`

    const userPrompt = isLiveCoding
      ? `Generate exactly 5 live coding challenges for the topic "${topicName}" in the context of "${phaseName}" for a software engineering interview.

Return a JSON object with this exact format:
{
  "questions": [
    {
      "question": "...",
      "answer": "..."
    }
  ]
}

Requirements:
- Each "question" must describe a concrete coding problem to implement (function signature, example input/output)
- Each "answer" must include: 1) complete working code solution (inside a markdown code block), 2) brief explanation (2-3 sentences), 3) alternative approaches section
- Answer format: \`\`\`language\\n// code here\\n\`\`\`\\n\\n**Explanation:** ...\\n\\n**Alternative approaches:** ...
- Language: ${langLabel}${avoidBlock}`
      : `Generate exactly 5 interview questions with detailed answers for the topic "${topicName}" in the context of "${phaseName}" for a software engineering interview.

Return a JSON object with this exact format:
{
  "questions": [
    {
      "question": "...",
      "answer": "..."
    }
  ]
}

Requirements:
- Questions must be realistic interview questions
- Answers must be detailed (150-300 words each), demonstrating mastery
- Cover different aspects of the topic
- Language: ${langLabel}${avoidBlock}`

    const res = await openai.chat.completions.create({
      model: getModel(),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const raw = safeParseJSON<{ questions: Array<{ question: string; answer: string }> }>(
      res.choices[0].message.content ?? '{}'
    )
    return raw.questions ?? []
  },

  async analyzeAndGenerateRoadmap(opts: {
    cvText?: string
    jobDescription: string
    language?: string
  }): Promise<{
    job_title: string
    gap_analysis: GapAnalysis
    roadmap: { phases: RoadmapPhase[] }
  }> {
    const { language = 'en' } = opts
    if (!hasApiKey()) {
      return {
        job_title: 'Software Engineer',
        gap_analysis: {
          match_score: 0,
          matched_skills: [],
          missing_skills: ['AI not configured. Add a Groq or Gemini API key to enable this feature.'],
          summary: 'AI evaluation is not configured.',
        },
        roadmap: { phases: [] },
      }
    }
    const openai = getClient()
    const systemPrompt = cachedSystemPrompt(
      `roadmap:${language}`,
      () => getRoadmapSystemPrompt(language)
    )
    const prompt = roadmapAnalysisPrompt(opts)

    const res = await openai.chat.completions.create({
      model: getModel(),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.user },
      ],
    })

    const raw = safeParseJSON<{
      job_title: string
      gap_analysis: GapAnalysis
      roadmap: { phases: RoadmapPhase[] }
    }>(res.choices[0].message.content ?? '{}')

    return {
      job_title: raw.job_title ?? '',
      gap_analysis: raw.gap_analysis ?? { match_score: 0, matched_skills: [], missing_skills: [], summary: '' },
      roadmap: raw.roadmap ?? { phases: [] },
    }
  },
}
