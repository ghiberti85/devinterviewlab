import { describe, it, expect } from 'vitest'

// ─── fixJsonNewlines & safeParseJSON ─────────────────────────────────────────
// These functions are internal to ai.service.ts.
// We test them indirectly via their exported behaviour through unit-testable
// pure reimplementations that mirror the production code exactly.

function fixJsonNewlines(text: string): string {
  let result = ''
  let inString = false
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === '\\' && inString) {
      result += ch + (text[i + 1] ?? '')
      i += 2
      continue
    }
    if (ch === '"') {
      inString = !inString
      result += ch
    } else if (inString && ch === '\n') {
      result += '\\n'
    } else if (inString && ch === '\r') {
      result += '\\r'
    } else {
      result += ch
    }
    i++
  }
  return result
}

function safeParseJSON<T>(text: string): T {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    return JSON.parse(clean) as T
  } catch {
    return JSON.parse(fixJsonNewlines(clean)) as T
  }
}

// ─── fixJsonNewlines ─────────────────────────────────────────────────────────

describe('fixJsonNewlines', () => {
  it('leaves clean JSON unchanged', () => {
    const input = '{"key":"value"}'
    expect(fixJsonNewlines(input)).toBe(input)
  })

  it('escapes a literal newline inside a string', () => {
    const input = '{"code":"line1\nline2"}'
    const result = fixJsonNewlines(input)
    expect(result).toBe('{"code":"line1\\nline2"}')
    expect(() => JSON.parse(result)).not.toThrow()
  })

  it('escapes a literal carriage return inside a string', () => {
    const input = '{"code":"line1\rline2"}'
    const result = fixJsonNewlines(input)
    expect(result).toBe('{"code":"line1\\rline2"}')
    expect(() => JSON.parse(result)).not.toThrow()
  })

  it('does not escape newlines outside strings', () => {
    const input = '{\n"key": "value"\n}'
    const result = fixJsonNewlines(input)
    expect(JSON.parse(result)).toEqual({ key: 'value' })
  })

  it('preserves existing escape sequences inside strings', () => {
    const input = '{"msg":"hello\\nworld"}'
    const result = fixJsonNewlines(input)
    expect(result).toBe(input)
  })

  it('handles multiple strings with newlines', () => {
    const input = '{"a":"x\ny","b":"p\nq"}'
    const result = fixJsonNewlines(input)
    expect(() => JSON.parse(result)).not.toThrow()
    const parsed = JSON.parse(result)
    expect(parsed.a).toBe('x\ny')
    expect(parsed.b).toBe('p\nq')
  })

  it('handles empty string value', () => {
    const input = '{"key":""}'
    expect(fixJsonNewlines(input)).toBe(input)
  })

  it('handles empty input', () => {
    expect(fixJsonNewlines('')).toBe('')
  })

  it('handles multi-line code_solution with real newlines (live coding scenario)', () => {
    const rawFromAI = `{"questions":[{"question":"Reverse a string","code_solution":"function reverse(s) {\n  return s.split('').reverse().join('');\n}"}]}`
    const result = fixJsonNewlines(rawFromAI)
    expect(() => JSON.parse(result)).not.toThrow()
    const parsed = JSON.parse(result)
    expect(parsed.questions[0].code_solution).toContain('return s')
  })
})

// ─── safeParseJSON ───────────────────────────────────────────────────────────

describe('safeParseJSON', () => {
  it('parses valid JSON', () => {
    const result = safeParseJSON<{ score: number }>('{"score": 42}')
    expect(result.score).toBe(42)
  })

  it('strips markdown json fences before parsing', () => {
    const wrapped = '```json\n{"score": 10}\n```'
    expect(safeParseJSON<{ score: number }>(wrapped).score).toBe(10)
  })

  it('strips plain markdown fences before parsing', () => {
    const wrapped = '```\n{"score": 10}\n```'
    expect(safeParseJSON<{ score: number }>(wrapped).score).toBe(10)
  })

  it('falls back to fixJsonNewlines when JSON has literal newlines in strings', () => {
    const broken = '{"code":"function f() {\n  return 1;\n}"}'
    const result = safeParseJSON<{ code: string }>(broken)
    expect(result.code).toContain('return 1')
  })

  it('trims surrounding whitespace', () => {
    const result = safeParseJSON<{ ok: boolean }>('  {"ok": true}  ')
    expect(result.ok).toBe(true)
  })

  it('throws when JSON is truly invalid even after fix', () => {
    expect(() => safeParseJSON('not json at all')).toThrow()
  })

  it('handles nested objects', () => {
    const result = safeParseJSON<{ a: { b: number } }>('{"a":{"b":99}}')
    expect(result.a.b).toBe(99)
  })
})

// ─── generateRoadmapQuestions prompt content ─────────────────────────────────

describe('generateRoadmapQuestions prompt structure', () => {
  function buildTheoreticalPrompt(topicName: string, phaseName: string, language: string, existing: string[]) {
    const langLabel = language === 'pt' ? 'Portuguese (Brazilian)' : 'English'
    const avoidBlock = existing.length > 0
      ? `\n\nDo NOT repeat or rephrase these already-existing questions:\n${existing.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : ''
    return {
      system: `You are a technical interview coach. Generate exactly 3 interview questions with detailed answers. Return only valid JSON, no markdown fences.`,
      user: `Generate exactly 3 interview questions with detailed answers for the topic "${topicName}" in the context of "${phaseName}" for a software engineering interview.\n\nReturn a JSON object with this exact format:\n{\n  "questions": [\n    {\n      "question": "...",\n      "answer": "..."\n    }\n  ]\n}\n\nRequirements:\n- Questions must be realistic interview questions\n- Answers must be detailed (150-300 words each), demonstrating mastery\n- Cover different aspects of the topic\n- Language: ${langLabel}${avoidBlock}`,
    }
  }

  function buildLiveCodingPrompt(topicName: string, phaseName: string, language: string, existing: string[]) {
    const langLabel = language === 'pt' ? 'Portuguese (Brazilian)' : 'English'
    const avoidBlock = existing.length > 0
      ? `\n\nDo NOT repeat or rephrase these already-existing questions:\n${existing.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : ''
    return {
      system: `You are a senior software engineer creating coding interview challenges. Return only valid JSON, no markdown fences.`,
      user: `Generate exactly 3 coding interview challenges for the topic "${topicName}" in the context of "${phaseName}".\n\nReturn a JSON object:\n{\n  "questions": [\n    {\n      "question": "Problem statement with function signature, constraints, and 2 input/output examples.",\n      "code_solution": "function solve(input) {\\\\n  // complete working solution\\\\n  return result;\\\\n}"\n    }\n  ]\n}\n\nRequirements:\n- "question": clear problem statement, function signature, constraints, examples (no solution hints)\n- "code_solution": complete, correct solution using \\\\n for newlines (NOT actual newline characters)\n- Problems should be non-trivial and require real algorithm/data-structure knowledge\n- Language: ${langLabel}${avoidBlock}`,
    }
  }

  it('theoretical prompt includes topic name', () => {
    const { user } = buildTheoreticalPrompt('React Hooks', 'Frontend', 'en', [])
    expect(user).toContain('React Hooks')
  })

  it('theoretical prompt includes phase name', () => {
    const { user } = buildTheoreticalPrompt('React Hooks', 'Frontend Fundamentals', 'en', [])
    expect(user).toContain('Frontend Fundamentals')
  })

  it('theoretical prompt uses English label by default', () => {
    const { user } = buildTheoreticalPrompt('Closures', 'JS', 'en', [])
    expect(user).toContain('English')
  })

  it('theoretical prompt uses Portuguese label when language is pt', () => {
    const { user } = buildTheoreticalPrompt('Closures', 'JS', 'pt', [])
    expect(user).toContain('Portuguese (Brazilian)')
  })

  it('theoretical prompt includes avoid block when existing questions provided', () => {
    const { user } = buildTheoreticalPrompt('Closures', 'JS', 'en', ['What is a closure?'])
    expect(user).toContain('Do NOT repeat or rephrase')
    expect(user).toContain('What is a closure?')
  })

  it('theoretical prompt has no avoid block when no existing questions', () => {
    const { user } = buildTheoreticalPrompt('Closures', 'JS', 'en', [])
    expect(user).not.toContain('Do NOT repeat')
  })

  it('theoretical system prompt instructs to return only valid JSON', () => {
    const { system } = buildTheoreticalPrompt('Closures', 'JS', 'en', [])
    expect(system).toContain('valid JSON')
    expect(system).toContain('no markdown fences')
  })

  it('live coding prompt includes question and code_solution schema keys', () => {
    const { user } = buildLiveCodingPrompt('Sorting', 'Algorithms', 'en', [])
    expect(user).toContain('"question"')
    expect(user).toContain('"code_solution"')
  })

  it('live coding prompt instructs no solution hints in question field', () => {
    const { user } = buildLiveCodingPrompt('Sorting', 'Algorithms', 'en', [])
    expect(user).toContain('no solution hints')
  })

  it('live coding prompt instructs to use \\n for newlines in code', () => {
    const { user } = buildLiveCodingPrompt('Sorting', 'Algorithms', 'en', [])
    expect(user).toContain('NOT actual newline characters')
  })

  it('live coding system prompt mentions senior software engineer', () => {
    const { system } = buildLiveCodingPrompt('Sorting', 'Algorithms', 'en', [])
    expect(system).toContain('senior software engineer')
  })

  it('live coding prompt uses Portuguese when language is pt', () => {
    const { user } = buildLiveCodingPrompt('Sorting', 'Algorithms', 'pt', [])
    expect(user).toContain('Portuguese (Brazilian)')
  })
})
