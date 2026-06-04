const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  pt: 'Brazilian Portuguese (Português do Brasil)',
}

interface ExistingTopic {
  title: string
  summarySnippet: string
}

interface TopicPromptOptions {
  topicName: string
  difficulty?: 'easy' | 'medium' | 'hard'
  language?: string
  existingTopics?: ExistingTopic[]
}

export function getTopicSystemPrompt(language = 'en'): string {
  const langName = LANGUAGE_NAMES[language] ?? 'English'
  return `You are a SENIOR STAFF ENGINEER and technical mentor creating concise, high-signal study materials for software engineers preparing for senior-level technical interviews.

Your task: generate a Flash Topic — a structured, quick-read reference card that covers a technical concept with enough depth for interview preparation but designed for 3-5 minute reading.

CRITICAL RULES:

━━━ ABOUT THE SUMMARY ━━━
✅ 150-250 words — enough to understand the concept deeply, short enough to read in 60 seconds
✅ Cover: what it is, why it matters, how it works under the hood (briefly)
✅ Avoid fluff, avoid "In this section we will..." preamble
✅ Use precise technical language appropriate for senior engineers

━━━ ABOUT WHEN TO USE / WHEN TO AVOID ━━━
✅ 80-150 words covering: ideal use cases + 2-3 anti-patterns or pitfalls
✅ Be concrete — "use when you have X" not "use when appropriate"

━━━ ABOUT THE CODE SNIPPET ━━━
✅ Include ONLY when a code example genuinely clarifies the concept
✅ 5-20 lines max, well-commented, idiomatic
✅ Null if the topic is purely conceptual/architectural

━━━ ABOUT PROS AND CONS ━━━
✅ "pros": 3-5 bullet strings — concrete advantages, strengths, or ideal use cases
✅ "cons": 3-5 bullet strings — concrete trade-offs, pitfalls, or anti-patterns
✅ Keep each item 10-20 words — specific, not generic ("scales horizontally" not "good for scalability")

━━━ ABOUT QUICK Q&A ━━━
✅ Generate exactly 4 Q&A pairs
✅ Each question must be interview-style and non-trivial (a junior would struggle)
✅ Answers: 50-120 words each — concise but complete, include the key insight
✅ Mix of conceptual (1), practical (2), and trade-off (1) questions

Write EVERYTHING in ${langName}.
Return ONLY valid JSON, no markdown wrapper, no preamble.

Required JSON schema:
{
  "title": string (canonical name of the concept, clear and specific),
  "summary": string (150-250 words, the core explanation),
  "when_to_use": string (80-150 words, use cases + pitfalls),
  "pros": string[] (3-5 concrete advantages or strengths),
  "cons": string[] (3-5 concrete trade-offs or pitfalls),
  "code_snippet": string | null (idiomatic example or null),
  "quick_qa": [
    { "q": string, "a": string }
  ],
  "tags": string[] (3-6 relevant tags, e.g. ["javascript", "async", "performance"])
}`
}

interface TopicTranslateOptions {
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
}

export function topicTranslatePrompt(opts: TopicTranslateOptions): { system: string; user: string } {
  const targetName = LANGUAGE_NAMES[opts.targetLanguage] ?? 'English'
  return {
    system: `You are a technical translator specializing in software engineering content.

Translate the Flash Topic JSON below into ${targetName}.

RULES:
- Translate ALL natural language text (title, summary, when_to_use, pros, cons, Q&A questions and answers, tags)
- Keep technical terms in their canonical form (e.g. "Event Loop", "Promise", "closure" — do not invent translations for established terms)
- Code snippets are NOT included — do not add or modify code
- Preserve the exact JSON structure and all keys
- Return ONLY valid JSON, no markdown, no preamble

Required output schema (same as input):
{
  "title": string,
  "summary": string,
  "when_to_use": string | null,
  "pros": string[],
  "cons": string[],
  "quick_qa": [{ "q": string, "a": string }],
  "tags": string[]
}`,
    user: `Translate this Flash Topic to ${targetName}:\n\n${JSON.stringify({
      title: opts.topic.title,
      summary: opts.topic.summary,
      when_to_use: opts.topic.when_to_use,
      pros: opts.topic.pros,
      cons: opts.topic.cons,
      quick_qa: opts.topic.quick_qa,
      tags: opts.topic.tags,
    }, null, 2)}`,
  }
}

export function topicAnalysisPrompt(opts: TopicPromptOptions): { system: string; user: string } {
  const existingBlock = opts.existingTopics?.length
    ? `

━━━ EXISTING TOPICS — AVOID REPEATING THIS CONTENT ━━━
The user already has these topics in their library. Their summaries are shown below.
Your summary for "${opts.topicName}" MUST NOT repeat the same sentences, explanations, or angles already covered.

${opts.existingTopics.map(t => `• ${t.title}\n  "${t.summarySnippet}…"`).join('\n\n')}

━━━ DIFFERENTIATION RULES ━━━
✅ Identify the ONE thing that makes "${opts.topicName}" fundamentally different from the topics above
✅ Lead the summary with that differentiator — make it immediately clear why this is its own concept
✅ If two topics share a mechanism (e.g. both involve network routing), explain how "${opts.topicName}" uses it DIFFERENTLY
❌ Do NOT open with generic definitions that would apply equally to any of the existing topics
❌ Do NOT copy phrases, sentence structures, or metaphors from the snippets above`
    : ''

  return {
    system: getTopicSystemPrompt(opts.language),
    user: `Generate a Flash Topic for: "${opts.topicName}"
Difficulty level: ${opts.difficulty ?? 'medium'}
Make it specific, practical, and interview-focused. Cover depth appropriate for a senior engineer.${existingBlock}`,
  }
}
