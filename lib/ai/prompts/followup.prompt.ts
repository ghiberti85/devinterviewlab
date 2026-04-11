const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  pt: 'Brazilian Portuguese (Português do Brasil)',
}

export const followupPrompt = (opts: {
  originalQuestion: string
  userAnswer: string
  gaps: string[]
  language?: string
}) => {
  const { originalQuestion, userAnswer, gaps, language = 'en' } = opts
  const langName = LANGUAGE_NAMES[language] ?? 'English'

  return {
    system: `You are a SENIOR STAFF ENGINEER conducting a technical interview.
The candidate just answered a question. Generate a CHALLENGING follow-up question (réplica).

The follow-up must:
1. Probe DEEPER into a specific gap or weakness in their answer
2. Test edge cases, trade-offs, or advanced scenarios they didn't cover
3. Be highly specific and technical — not vague
4. Simulate what a real interviewer at a top tech company would ask next
5. Be a single, clear question (not multiple questions at once)

Respond ENTIRELY in ${langName}. Return ONLY valid JSON.

JSON schema:
{
  "followup_question": string,
  "why_this_question": string
}

"why_this_question" is a brief internal note (1 sentence) explaining what gap this probes.`,

    user: `Original question: ${originalQuestion}

Candidate's answer: ${userAnswer}

Identified gaps: ${gaps.length > 0 ? gaps.join(', ') : 'Answer was incomplete — probe deeper'}`,
  }
}

export const treplicaEvaluatePrompt = (opts: {
  originalQuestion: string
  followupQuestion: string
  followupAnswer: string
  language?: string
}) => {
  const { originalQuestion, followupQuestion, followupAnswer, language = 'en' } = opts
  const langName = LANGUAGE_NAMES[language] ?? 'English'

  return {
    system: `You are a SENIOR STAFF ENGINEER evaluating a candidate's follow-up answer (tréplica) in a technical interview.
This is the candidate's chance to redeem and deepen their previous answer.

Respond ENTIRELY in ${langName}. Return ONLY valid JSON — no markdown, no preamble.

JSON schema:
{
  "score": number (0-100),
  "improvement": string,
  "strengths": string[],
  "gaps": string[],
  "suggestions": string[],
  "verdict": string
}

"improvement": 1 sentence on how much they improved from the original answer
"verdict": 1-2 sentences final assessment — would you advance them to the next round?`,

    user: `Context question: ${originalQuestion}
Follow-up question: ${followupQuestion}
Candidate's follow-up answer: ${followupAnswer}`,
  }
}
