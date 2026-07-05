// Lightweight EN/PT content-language detector — used to catch topics whose
// `language` tag doesn't match their actual text (e.g. the AI generated
// Portuguese content but the row got tagged 'en'). No external dependency:
// ã/õ/ç are decisive (never appear in English prose), and the stopword
// comparison is a fallback for the rare paragraph without them.
const PT_ACCENTS = /[ãõç]/i

const PT_WORDS = [
  'não', 'você', 'também', 'então', 'porém', 'está', 'são', 'isso', 'quando',
  'muito', 'pode', 'sobre', 'entre', 'após', 'ainda', 'onde', 'cada', 'mais',
  'para', 'com', 'uma', 'isto', 'ser', 'ter', 'fazer', 'este', 'essa', 'pelo',
  'pela', 'dos', 'das', 'seu', 'sua', 'já', 'só',
]

const EN_WORDS = [
  'the', 'and', 'that', 'with', 'this', 'for', 'are', 'you', 'your', 'not',
  'when', 'which', 'from', 'into', 'their', 'than', 'then', 'have', 'has',
  'was', 'were', 'been', 'will', 'would', 'can', 'about', 'each', 'other',
]

function countWordHits(text: string, words: string[]): number {
  const lower = text.toLowerCase()
  return words.reduce((count, word) => {
    const matches = lower.match(new RegExp(`\\b${word}\\b`, 'g'))
    return count + (matches?.length ?? 0)
  }, 0)
}

export function detectContentLanguage(text: string): 'pt' | 'en' {
  if (PT_ACCENTS.test(text)) return 'pt'
  const ptHits = countWordHits(text, PT_WORDS)
  const enHits = countWordHits(text, EN_WORDS)
  return ptHits > enHits ? 'pt' : 'en'
}

export function hasLanguageMismatch(topic: {
  language: string
  title: string
  summary: string
  when_to_use: string | null
}): boolean {
  const sample = `${topic.title} ${topic.summary} ${topic.when_to_use ?? ''}`
  return detectContentLanguage(sample) !== topic.language
}
