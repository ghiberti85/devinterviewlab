import type { Difficulty } from '@/lib/supabase/types'

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  pt: 'Brazilian Portuguese (Português do Brasil)',
}

interface GenerateFromContextOptions {
  context: string
  cvText?: string
  difficulty: Difficulty | 'mixed'
  count: number
  categoryName?: string
  isBehavioral?: boolean
  language?: string
}

export const generateFromContextPrompt = (opts: GenerateFromContextOptions) => {
  const { context, cvText, difficulty, count, categoryName, isBehavioral, language = 'en' } = opts
  const langName = LANGUAGE_NAMES[language] ?? 'English'

  const contextBlock = [
    cvText
      ? `=== CURRÍCULO / CV DO CANDIDATO ===\n${cvText.slice(0, 8000)}`
      : null,
    context
      ? `=== DESCRIÇÃO DA VAGA / CONTEXTO ADICIONAL ===\n${context.slice(0, 4000)}`
      : null,
  ].filter(Boolean).join('\n\n')

  const difficultyInstruction =
    difficulty === 'mixed'
      ? `Distribua as ${count} perguntas assim: ${Math.ceil(count * 0.3)} fáceis (conceitos fundamentais), ${Math.ceil(count * 0.4)} médias (aplicação prática), ${count - Math.ceil(count * 0.3) - Math.ceil(count * 0.4)} difíceis (arquitetura, trade-offs, liderança). Cada pergunta DEVE ter seu próprio campo "difficulty".`
      : `Todas as perguntas devem ser de dificuldade "${difficulty}".`

  const questionType = isBehavioral
    ? 'perguntas comportamentais usando o framework STAR (Situação, Tarefa, Ação, Resultado)'
    : `perguntas técnicas${categoryName ? ` focadas em ${categoryName}` : ''} para entrevista de nível sênior/tech lead`

  return {
    system: `Você é um DIRETOR DE ENGENHARIA com 20+ anos de experiência entrevistando candidatos para posições de Engenheiro Sênior e Tech Lead em empresas tier-1 (FAANG, unicórnios, grandes empresas de tecnologia).

Sua tarefa: gerar ${count} ${questionType} ALTAMENTE PERSONALIZADAS baseadas no currículo e descrição da vaga fornecidos.

REGRAS CRÍTICAS — VIOLAÇÃO DESSAS REGRAS INVALIDA O RESULTADO:

━━━ SOBRE AS PERGUNTAS ━━━
❌ NUNCA escreva títulos de tópicos como pergunta (ex: "Event Loop", "React Hooks", "TypeScript")
❌ NUNCA faça perguntas genéricas que qualquer dev poderia responder sem ler o currículo
✅ SEMPRE formule uma pergunta COMPLETA e ESPECÍFICA em forma de interrogação
✅ SEMPRE referencie tecnologias, empresas, projetos ou situações ESPECÍFICAS do currículo/vaga
✅ SEMPRE inclua contexto na pergunta que a torne única para este candidato

EXEMPLOS DE PERGUNTAS RUINS (NUNCA FAÇA ISSO):
- "Event Loop" ← título de tópico, não uma pergunta
- "Como funciona o React?" ← genérica demais, não relacionada ao perfil
- "Explique TypeScript" ← não é uma pergunta específica

EXEMPLOS DE PERGUNTAS BOAS:
- "Você trabalhou com Next.js em múltiplos projetos. Como você decide entre renderização SSR, SSG e ISR em um projeto de alta escala? Pode dar um exemplo real de uma decisão que tomou e o impacto que teve?"
- "Liderando uma equipe de 5 engenheiros front-end, como você estruturou o processo de code review para garantir qualidade sem criar gargalos? O que mudaria se repetisse hoje?"
- "A vaga menciona necessidade de migrar um CMS legado. Com sua experiência em Duda e headless CMS, quais são os principais riscos que você antecipa e como os mitigaria?"

━━━ SOBRE AS RESPOSTAS IDEAIS ━━━
❌ NUNCA escreva respostas de 1-3 frases — isso é completamente inadequado para nível sênior
❌ NUNCA dê respostas genéricas que poderiam servir para qualquer candidato
❌ NUNCA omita trade-offs, riscos, lições aprendidas
✅ SEMPRE escreva respostas com 300-600 palavras mínimo
✅ SEMPRE inclua: teoria + implementação prática + trade-offs + exemplo do contexto do candidato + o que evitar
✅ SEMPRE referencie tecnologias específicas do currículo (ex: "No contexto de trabalhar com Duda CMS...")
✅ SEMPRE inclua o que diferencia uma resposta sênior de uma resposta júnior
✅ Para perguntas de liderança: inclua como comunicar para stakeholders, como motivar equipe, como lidar com conflitos técnicos

ESTRUTURA DA RESPOSTA IDEAL (siga esta ordem):
1. Conceito/princípio fundamental (2-3 frases) — "O princípio por trás disso é..."
2. Como você aplicaria no contexto do candidato (3-5 frases) — "Dado meu histórico com X, eu abordaria assim..."  
3. Trade-offs e quando NÃO usar (2-3 frases) — "A principal desvantagem é... Por isso eu NÃO faria isso quando..."
4. Exemplo concreto ou situação real (3-5 frases) — "Um caso real seria... O resultado esperado é..."
5. O que diferencia a resposta sênior (1-2 frases) — "O que muitos esquecem de mencionar é..."

${difficultyInstruction}

Escreva TUDO em ${langName} — perguntas, respostas, tudo.
Retorne APENAS JSON válido, sem markdown, sem preâmbulo.

Schema JSON obrigatório:
{
  "questions": [
    {
      "title": string (a pergunta completa, em forma de interrogação, específica ao perfil),
      "body": string | null (contexto adicional, código de exemplo, ou cenário — use quando enriquecer a pergunta),
      "ideal_answer": string (resposta completa, 300-600 palavras, personalizada ao perfil, técnica e profunda),
      "difficulty": "easy" | "medium" | "hard",
      "is_behavioral": ${isBehavioral ?? false},
      "detected_skills": string[] (habilidades específicas que esta pergunta avalia)
    }
  ],
  "skills_detected": string[] (todas as habilidades encontradas no contexto),
  "summary": string (1-2 frases sobre o que as perguntas cobrem e por que são relevantes para este perfil)
}`,

    user: contextBlock
      ? `Analise o contexto abaixo e gere ${count} perguntas técnicas profundas e personalizadas:\n\n${contextBlock}`
      : `Gere ${count} perguntas gerais de engenharia de software para nível sênior/tech lead, com respostas completas e detalhadas.`,
  }
}
