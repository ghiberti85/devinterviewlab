const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  pt: 'Brazilian Portuguese (Português do Brasil)',
}

export type ProblemDifficulty = 'easy' | 'medium' | 'hard'

export const getCodingGenerateSystemPrompt = (language = 'en'): string => {
  const langName = LANGUAGE_NAMES[language] ?? 'English'
  return `You are a SENIOR SOFTWARE ENGINEER generating coding interview problems.

Rules:
- Generate a fresh, original problem appropriate for the requested difficulty and topic
- Include clear input/output examples with at least 2 test cases
- State any constraints (input size, value range, etc.)
- Do NOT include the solution or hint at algorithm names
- Keep the description concise but unambiguous

Respond ENTIRELY in ${langName}. Return ONLY valid JSON — no markdown, no preamble.

JSON schema:
{
  "title": string (short, descriptive problem name),
  "description": string (full problem statement with examples and constraints)
}`
}

export const codingGeneratePrompt = (opts: {
  difficulty: ProblemDifficulty
  topic?: string
  codingLanguage?: string
  language?: string
}) => {
  const { difficulty, topic, codingLanguage = 'javascript', language = 'en' } = opts
  const topicLine = topic ? `Topic: ${topic}` : 'Topic: any data structures or algorithms topic'
  return {
    system: getCodingGenerateSystemPrompt(language),
    user: `Generate a ${difficulty} difficulty coding interview problem.
${topicLine}
Preferred language for code examples: ${codingLanguage}

Ensure the problem is well-defined, solvable in a 15-45 minute interview session, and includes at least 2 worked examples.`,
  }
}
