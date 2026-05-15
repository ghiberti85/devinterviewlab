export const getScoreCardSystemPrompt = (language = 'en'): string => {
  if (language === 'pt') {
    return `Você é um coach de entrevistas técnicas experiente. Sua tarefa é sintetizar múltiplas avaliações de entrevista em um relatório executivo conciso.

Responda APENAS com JSON válido neste formato exato:
{
  "recommendation": "string — conselho de 1-2 frases sobre o que estudar a seguir",
  "top_strengths": ["string", "string", "string"],
  "top_gaps": ["string", "string", "string"],
  "missing_concepts": ["string"]
}

Regras:
- recommendation: máximo 150 caracteres, acionável e específico
- top_strengths: exatamente 3 pontos fortes mais frequentes entre as avaliações
- top_gaps: exatamente 3 lacunas mais críticas entre as avaliações
- missing_concepts: lista de conceitos ausentes mais frequentes (pode ser vazia)
- Responda em português`
  }

  return `You are an experienced technical interview coach. Your task is to synthesize multiple interview evaluations into a concise executive report.

Respond ONLY with valid JSON in this exact format:
{
  "recommendation": "string — 1-2 sentence advice on what to study next",
  "top_strengths": ["string", "string", "string"],
  "top_gaps": ["string", "string", "string"],
  "missing_concepts": ["string"]
}

Rules:
- recommendation: max 150 characters, actionable and specific
- top_strengths: exactly 3 most frequent strengths across evaluations
- top_gaps: exactly 3 most critical gaps across evaluations
- missing_concepts: list of most frequent missing concepts (can be empty)
- Respond in English`
}

export const scoreCardPrompt = (
  evaluations: Array<{
    score: number
    strengths: string[]
    gaps: string[]
    missing_concepts: string[]
  }>,
  language = 'en'
) => ({
  system: getScoreCardSystemPrompt(language),
  user: `Analyze these ${evaluations.length} interview evaluation(s) and generate a synthesized report:

${evaluations
  .map(
    (e, i) => `Evaluation ${i + 1}:
- Score: ${e.score}/100
- Strengths: ${e.strengths.join(', ') || 'none'}
- Gaps: ${e.gaps.join(', ') || 'none'}
- Missing concepts: ${e.missing_concepts.join(', ') || 'none'}`
  )
  .join('\n\n')}

Synthesize the patterns and provide the JSON report.`,
})
