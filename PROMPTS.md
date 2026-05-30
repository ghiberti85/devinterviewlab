# PROMPTS.md — Catálogo de Prompts de IA

Documentação de todos os prompts usados no `aiService` (`lib/ai/ai.service.ts`).
Para cada prompt: propósito, input, output esperado, token budget e restrições.

---

## Modelo padrão

`llama-3.3-70b-versatile` via Groq (configurável por env vars — ver `DECISIONS.md` ADR-001).

Temperatura padrão: `0.7` (equilíbrio entre criatividade e consistência).  
Limite global do Groq free: **6k tokens/min · 500k tokens/dia**.

---

## 1. `evaluateAnswer` — Avaliação de resposta de entrevista

**Arquivo:** `lib/ai/prompts/evaluate.prompt.ts`  
**Método:** `aiService.evaluateAnswer(question, userAnswer, language)`  
**Usado em:** `POST /api/interview/evaluate`

**Input:**
- `question`: objeto `Question` (texto + resposta esperada + dificuldade)
- `userAnswer`: string (resposta do usuário)
- `language`: `'en' | 'pt'`

**Output JSON esperado:**
```json
{
  "score": 0-100,
  "feedback": {
    "strengths": ["string"],
    "gaps": ["string"],
    "suggestions": ["string"],
    "score_breakdown": {
      "correctness": 0-100,
      "completeness": 0-100,
      "clarity": 0-100,
      "depth": 0-100
    },
    "missing_concepts": ["string"]
  }
}
```

**Token budget:** ~800 tokens input + ~400 tokens output  
**Restrições:** `score_breakdown` deve ter exatamente os 4 campos. Nunca remover `missing_concepts` do schema — o flashcard system usa esse campo.

---

## 2. `generateFollowup` — Réplica da entrevista (follow-up)

**Arquivo:** `lib/ai/prompts/followup.prompt.ts`  
**Método:** `aiService.generateFollowup(opts)`  
**Usado em:** `POST /api/interview/followup`

**Input:**
- `question`: pergunta original
- `userAnswer`: resposta do usuário
- `evaluation`: feedback da avaliação anterior
- `language`: `'en' | 'pt'`

**Output:** string (pergunta de aprofundamento do entrevistador)

**Comportamento:** O sistema simula um entrevistador que faz uma réplica baseada nos gaps identificados na avaliação. Deve soar natural, não didático.

---

## 3. `evaluateFollowup` — Tréplica (avaliação da réplica)

**Arquivo:** `lib/ai/prompts/followup.prompt.ts`  
**Método:** `aiService.evaluateFollowup(opts)`  
**Usado em:** `POST /api/interview/tréplica`

**Input:** pergunta original + resposta original + follow-up + resposta ao follow-up + language  
**Output JSON:** mesmo schema do `evaluateAnswer`

---

## 4. `generateQuestions` — Gerar questões de entrevista por tópico

**Arquivo:** `lib/ai/prompts/generate.prompt.ts`  
**Método:** `aiService.generateQuestions(topic, difficulty, count)`  
**Usado em:** `POST /api/questions/generate`

**Input:**
- `topic`: string (ex: "React Hooks")
- `difficulty`: `'easy' | 'medium' | 'hard'`
- `count`: número de questões (padrão 5)

**Output JSON:**
```json
[
  {
    "text": "string",
    "expected_answer": "string",
    "difficulty": "easy|medium|hard",
    "tags": ["string"]
  }
]
```

**Token budget:** ~300 tokens input + ~600 tokens output (5 questões)

---

## 5. `generateFromContext` — Gerar questões a partir de contexto (Flash Topics)

**Arquivo:** `lib/ai/prompts/generate-from-context.prompt.ts`  
**Método:** `aiService.generateFromContext(opts)`  
**Usado em:** Flash Topics → "Generate Q&A"

**Input:** `context` (texto do tópico), `language`  
**Output JSON:** array de `{ question, answer }`

**Particularidade:** As questões geradas são mais curtas e diretas que as do `generateQuestions` — voltadas para revisão rápida, não simulação de entrevista.

---

## 6. `generateCodingProblem` — Gerar problema de live coding

**Arquivo:** `lib/ai/prompts/coding-generate.prompt.ts`  
**Método:** `aiService.generateCodingProblem(opts)`  
**Usado em:** `POST /api/coding/generate-problem`

**Input:**
- `topic`: string (ex: "Binary Search")
- `difficulty`: `'easy' | 'medium' | 'hard'`
- `language`: linguagem de programação (ex: "Python")

**Output JSON:**
```json
{
  "title": "string",
  "description": "string",
  "examples": [{ "input": "string", "output": "string", "explanation": "string" }],
  "constraints": ["string"],
  "hints": ["string"],
  "starter_code": "string"
}
```

**Token budget:** ~400 tokens input + ~800 tokens output  
**Restrições:** `starter_code` deve ser código válido na linguagem solicitada, com comentários indicando onde o usuário deve implementar.

---

## 7. `generateCodingHint` — Dica socrática para live coding

**Arquivo:** `lib/ai/prompts/coding-hint.prompt.ts`  
**Método:** `aiService.generateCodingHint(opts)`  
**Usado em:** Botão "Hint" no Live Coding Simulator

**Input:** `problem` (descrição), `code` (código atual do usuário), `language`  
**Output:** string (dica socrática — pergunta que guia, não a solução)

**Comportamento:** O prompt instrui o modelo a **nunca dar a solução diretamente** — apenas fazer perguntas que levem o usuário a descobrir. Se o modelo começar a dar código, o prompt está com defeito.

---

## 8. `evaluateCode` — Avaliar código de live coding

**Arquivo:** `lib/ai/prompts/code-evaluate.prompt.ts`  
**Método:** `aiService.evaluateCode(opts)`  
**Usado em:** `POST /api/coding/evaluate`

**Input:** `problem`, `code`, `language`, `timeTaken` (segundos)  
**Output JSON:**
```json
{
  "score": 0-100,
  "feedback": {
    "correctness": "string",
    "efficiency": "string",
    "style": "string",
    "suggestions": ["string"]
  },
  "time_complexity": "string",
  "space_complexity": "string"
}
```

---

## 9. `generateTopic` — Gerar tópico completo (Flash Topics)

**Arquivo:** `lib/ai/prompts/topic.prompt.ts`  
**Método:** `aiService.generateTopic(opts)`  
**Usado em:** `POST /api/topics`

**Input:** `topicName`, `language`  
**Output JSON:**
```json
{
  "name": "string",
  "summary": "string",
  "when_to_use": "string",
  "pros": ["string"],
  "cons": ["string"],
  "quick_qa": [{ "q": "string", "a": "string" }],
  "tags": ["string"]
}
```

**Token budget:** ~200 tokens input + ~700 tokens output  
**Restrições:** `quick_qa` deve ter entre 3 e 5 pares. `tags` são usadas para criar conceitos filhos no concept graph automaticamente.

---

## 10. `translateTopic` — Traduzir tópico

**Arquivo:** `lib/ai/prompts/topic.prompt.ts`  
**Método:** `aiService.translateTopic(opts)`  
**Usado em:** Botão de tradução EN↔PT no Flash Topics

**Input:** `topic` (objeto completo), `targetLanguage`  
**Output JSON:** mesmo schema do `generateTopic`, traduzido

**Restrição:** Termos técnicos (nomes de algoritmos, padrões de design, siglas) **não devem ser traduzidos**. O prompt instrui isso explicitamente.

---

## 11. `generateScoreCard` — Gerar score card visual

**Arquivo:** `lib/ai/prompts/score-card.prompt.ts`  
**Método:** `aiService.generateScoreCard(opts)`  
**Usado em:** `POST /api/score-cards`

**Input:** array de avaliações (`EvaluationFeedback[]`), `language`  
**Output JSON:**
```json
{
  "overall_score": 0-100,
  "dimensions": {
    "correctness": 0-100,
    "completeness": 0-100,
    "clarity": 0-100,
    "depth": 0-100
  },
  "strengths": ["string"],
  "areas_to_improve": ["string"],
  "recommended_topics": ["string"]
}
```

---

## 12. `analyzeAndGenerateRoadmap` — Analisar CV e gerar roadmap

**Arquivo:** `lib/ai/prompts/roadmap.prompt.ts`  
**Método:** `aiService.analyzeAndGenerateRoadmap(opts)`  
**Usado em:** `POST /api/roadmaps`

**Input:** `cvText` (texto extraído do PDF), `jobDescription?` (opcional), `language`  
**Output JSON:**
```json
{
  "gap_analysis": {
    "strengths": ["string"],
    "gaps": ["string"],
    "priority_areas": ["string"]
  },
  "phases": [
    {
      "name": "30 dias | 60 dias | 90 dias",
      "topics": [
        { "name": "string", "description": "string", "priority": "high|medium|low" }
      ]
    }
  ]
}
```

**Token budget:** ~2000 tokens input (CV pode ser longo) + ~1000 tokens output  
**Restrição:** Sempre 3 fases (30/60/90 dias). O `jobDescription` é opcional — sem ele, o roadmap é baseado apenas nos gaps do CV.

---

## 13. `generateRoadmapQuestions` — Gerar questões de entrevista por tópico do roadmap

**Arquivo:** inline em `lib/ai/ai.service.ts` (sem arquivo de prompt separado)  
**Método:** `aiService.generateRoadmapQuestions(opts)`  
**Usado em:** `POST /api/roadmaps/[id]/generate-questions`

**Input:**
- `topicName`: string
- `phaseName`: string (ex: "30 dias")
- `language`: `'en' | 'pt'`
- `count`: número de questões (padrão 5)
- `existingQuestions?`: `string[]` — questões já geradas para evitar repetição

**Output JSON:**
```json
[
  { "question": "string", "answer": "string" }
]
```

**Restrição crítica:** Quando `existingQuestions` é passado, o prompt adiciona um bloco "Do NOT repeat or rephrase these questions". Sem isso, o modelo repetiria questões ao regerar. Não remover essa lógica de `existingQuestions`.

**Chamada por tópico:** Esta rota é chamada uma vez por tópico (não para o roadmap inteiro). Ver ADR-002.

---

## Padrões gerais de prompt

### System prompt vs User prompt
- **System prompt:** contexto do papel (entrevistador, avaliador, par programador socrático) + idioma
- **User prompt:** dados específicos da chamada (pergunta, código, CV)

### Cache de system prompts
`aiService` usa `cachedSystemPrompt(key, factory)` para memoizar system prompts por `(tipo + idioma)`. Não chamar `get*SystemPrompt()` fora do cache — cria objetos desnecessariamente.

### `safeParseJSON<T>(text)`
Todos os retornos JSON passam por `safeParseJSON` que remove markdown code fences (` ```json `) antes de parsear. Nunca confiar que o modelo retorna JSON puro.

### Testes obrigatórios para novos prompts
Ver seção "O que testar em prompts de IA" no `CLAUDE.md`. Resumo:
1. EN e PT produzem textos diferentes
2. Schema JSON correto (campos obrigatórios presentes)
3. Dados do input aparecem no prompt gerado
4. Edge case: input vazio ou campos opcionais ausentes
