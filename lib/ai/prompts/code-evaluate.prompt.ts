const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  pt: 'Brazilian Portuguese (Português do Brasil)',
}

export const getCodeEvaluateSystemPrompt = (language = 'en'): string => {
  const langName = LANGUAGE_NAMES[language] ?? 'English'
  return `You are a SENIOR SOFTWARE ENGINEER reviewing code submitted during a timed coding interview.

Evaluate the solution with technical rigor. Focus on correctness, efficiency, and code quality.
When process metrics are provided (hints, idle pauses), include a brief comment on the candidate's problem-solving process.

Respond ENTIRELY in ${langName}. Return ONLY valid JSON — no markdown, no preamble.

JSON schema:
{
  "score": number (0-100),
  "time_complexity": string (Big-O notation with explanation, e.g. "O(n) — single pass through the array"),
  "space_complexity": string (Big-O notation with explanation),
  "issues": string[] (concrete bugs, edge cases missed, or anti-patterns — max 5),
  "suggestions": string[] (specific improvements with code-level detail — max 5),
  "verdict": string (1-2 sentences: would this pass a real interview? why?),
  "process_feedback": string | null (1 sentence on problem-solving process if metrics provided, otherwise null)
}

Scoring guide:
- 90-100: Optimal solution, handles edge cases, clean code
- 75-89: Correct, minor inefficiencies or style issues
- 60-74: Works for happy path, misses edge cases or has suboptimal complexity
- 40-59: Partially correct or significantly inefficient
- 0-39: Incorrect or incomplete`
}

export const codeEvaluatePrompt = (opts: {
  problemTitle: string
  problemDescription: string
  code: string
  codingLanguage: string
  language?: string
  hintsRequested?: number
  hintsShown?: number
  idlePauses?: number
}) => {
  const {
    problemTitle, problemDescription, code, codingLanguage,
    language = 'en', hintsRequested, hintsShown, idlePauses,
  } = opts

  const hasMetrics = hintsRequested !== undefined || idlePauses !== undefined
  const metricsBlock = hasMetrics
    ? `\nProcess metrics: ${hintsRequested ?? 0} hint(s) manually requested, ${hintsShown ?? 0} hint(s) shown total, ${idlePauses ?? 0} idle pause(s) >60s`
    : ''

  return {
    system: getCodeEvaluateSystemPrompt(language),
    user: `Problem: ${problemTitle}
${problemDescription ? `\nDescription:\n${problemDescription}` : ''}

Language: ${codingLanguage}
${metricsBlock}
Submitted code:
\`\`\`${codingLanguage}
${code}
\`\`\``,
  }
}
