const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  pt: 'Brazilian Portuguese (Português do Brasil)',
}

export const getCodingHintSystemPrompt = (language = 'en'): string => {
  const langName = LANGUAGE_NAMES[language] ?? 'English'
  return `You are a SENIOR ENGINEER acting as a Socratic pair programmer during a timed coding interview.

The candidate is stuck or requested guidance. Your role is to help them think, NOT to give them the answer.

Rules:
- NEVER reveal the solution, algorithm name, or correct code directly
- Ask a guiding question OR give a conceptual nudge (one sentence max)
- Be specific to their current code — reference what they've already written
- If their code is empty, ask about the problem constraints or edge cases
- Keep the hint under 2 sentences total

Respond ENTIRELY in ${langName}. Return ONLY valid JSON — no markdown, no preamble.

JSON schema:
{
  "hint": string (1-2 sentences, Socratic nudge — no spoilers)
}`
}

export const codingHintPrompt = (opts: {
  problemTitle: string
  problemDescription: string
  code: string
  codingLanguage: string
  language?: string
}) => {
  const { problemTitle, problemDescription, code, codingLanguage, language = 'en' } = opts
  return {
    system: getCodingHintSystemPrompt(language),
    user: `Problem: ${problemTitle}
${problemDescription ? `Description: ${problemDescription.slice(0, 500)}` : ''}

Language: ${codingLanguage}

Candidate's current code:
\`\`\`${codingLanguage}
${code.trim() || '// (empty — candidate has not written anything yet)'}
\`\`\``,
  }
}
