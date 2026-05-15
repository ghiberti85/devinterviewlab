# DevInterviewLab — Contexto do Projeto

## Visão Geral
Plataforma pessoal de prática para entrevistas técnicas e aprendizado contínuo.
Atualmente uso pessoal, com planos de abrir para outros usuários no futuro.

**URL em produção:** https://devinterviewlab.vercel.app
**Repositório:** https://github.com/ghiberti85/devinterviewlab
**Autor:** Fernando Ghiberti (ghiberti85@gmail.com)

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 (App Router), React, TypeScript, Tailwind CSS |
| UI | Radix UI, Lucide React, Recharts, React Flow, Monaco Editor |
| Estado | Zustand + React Query (@tanstack/react-query) |
| Auth + DB | Supabase (PostgreSQL + Auth + Storage + RLS) |
| IA | Groq (llama-3.3-70b-versatile) via OpenAI-compatible API |
| Transcrição de voz | Groq Whisper (whisper-large-v3-turbo) |
| Deploy | Vercel (Hobby plan) |
| Monitoramento | Sentry (tunnel via /monitoring) |
| Testes | Vitest (unit) + Playwright (E2E) |

---

## Variáveis de Ambiente (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=https://idgpscsnbgszhwvhtedy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
OPENAI_API_KEY=<groq key>
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=llama-3.3-70b-versatile
SENTRY_DSN=<sentry dsn>
NEXT_PUBLIC_SENTRY_DSN=<mesmo dsn>
```

---

## Arquitetura do Banco de Dados (Supabase)

Todas as tabelas têm RLS habilitado. Schema: `public`. Total: **16 tabelas**.

### Tabelas

**profiles** — estende auth.users
- id (uuid, FK auth.users)
- username (text, unique, max 50)
- preferred_language (text, default 'en', check: 'en'|'pt') — sincronizado via PATCH /api/profile/language
- created_at

**categories** — categorias de questões (seeded)
- id, name (unique), slug (unique), created_at
- Valores: JavaScript, TypeScript, React, Node.js, System Design, Algorithms, CSS, Behavioral

**questions** — questões de entrevista
- id, user_id (FK profiles), category_id (FK categories, nullable)
- title (text, max 500), body (text, max 20k, nullable)
- ideal_answer (text, max 20k, nullable)
- difficulty (check: easy|medium|hard), is_behavioral (bool)
- language (check: en|pt, default en)
- fts (tsvector gerado, índice GIN para full-text search)
- created_at, updated_at

**practice_history** — histórico de sessões de prática
- id, user_id, question_id (nullable)
- session_type (check: flashcard|random|simulation)
- confidence (int, check: 1-5)
- duration_sec, next_review_at (SM-2 com Easiness Factor)
- created_at

**ai_evaluations** — avaliações de respostas pela IA
- id, user_id, question_id (nullable)
- user_answer (text, max 50k)
- transcript (text, max 50k, nullable) — texto bruto da transcrição de voz *(adicionado em 2026-05-15)*
- score (numeric), feedback (jsonb)
- missing_concepts (text[]), model_used, prompt_version
- created_at
- Migration: `supabase/migrations/20260515000001_ai_evaluations_transcript.sql`

**concepts** — grafo de conhecimento
- id, user_id, name (max 200), description (max 5k)
- score (numeric, check: 0-100)
- created_at

**concept_relations**
- id, source_id (FK concepts), target_id (FK concepts)
- relation_type (check: requires|related|part_of)

**question_concepts**, **question_tags**, **tags** — tabelas de junção

**user_documents** — CV e documentos do usuário
- id, user_id, name (max 255), doc_type (check: cv|other)
- file_path (Supabase Storage), text_content (max 500k)
- file_size, keep_stored (bool), created_at, updated_at
- Índice único parcial: apenas 1 CV por usuário

**usage_logs** — rastreamento de chamadas de IA
- id, user_id, endpoint, tokens_est, duration_ms
- status (ok|error|rate_limited), created_at

**coding_sessions** — sessões do Live Coding Simulator *(adicionada em 2026-05-15)*
- id, user_id (FK profiles)
- problem_title (text, max 300), problem_description (text, max 5k, nullable)
- language (varchar 50, default 'javascript')
- code (text, max 100k)
- score (numeric 0-100, nullable), feedback (jsonb, nullable)
- time_spent_sec, timer_duration_sec
- hints_requested (int, default 0), hints_shown (int, default 0), idle_pauses (int, default 0) *(adicionado em 2026-05-15)*
- created_at
- Políticas: SELECT/INSERT/DELETE por user_id
- Migrations: `supabase/migrations/20260515000000_coding_sessions.sql`, `20260515000002_coding_sessions_hints.sql`

**score_cards** — relatórios visuais de desempenho *(adicionada em 2026-05-15)*
- id, user_id (FK profiles)
- session_label (text, max 200, nullable)
- evaluation_ids (uuid[], referências às avaliações incluídas)
- overall_score (numeric 5,2, 0-100)
- radar (jsonb — scores por dimensão: correctness/completeness/clarity/depth)
- strengths (text[]), gaps (text[]), missing_concepts (text[])
- recommendation (text, nullable)
- created_at
- Políticas: SELECT/INSERT/DELETE por user_id
- Migration: `supabase/migrations/20260515000003_score_cards.sql`

**study_roadmaps** — roadmaps de estudo personalizados *(adicionada em 2026-05-15)*
- id, user_id (FK profiles)
- job_title (text, max 200, nullable), job_description (text, max 8k, nullable)
- cv_text_snapshot (text, max 20k, nullable)
- gap_analysis (jsonb — match_score, matched_skills, missing_skills, suggestions)
- roadmap (jsonb — phases array com 30/60/90 dias, cada fase tem topics[])
- status (text, check: active|completed|archived, default active)
- created_at, updated_at
- Políticas: SELECT/INSERT/UPDATE/DELETE por user_id
- Migration: `supabase/migrations/20260515000004_study_roadmaps.sql`

**roadmap_topic_progress** — progresso por tópico do roadmap *(adicionada em 2026-05-15)*
- id, roadmap_id (FK study_roadmaps), user_id (FK profiles)
- topic_name (text), questions_done (int, default 0), questions_goal (int, default 5)
- last_practiced_at (timestamptz, nullable), created_at
- Políticas: SELECT/INSERT/UPDATE por user_id
- Migration: `supabase/migrations/20260515000004_study_roadmaps.sql`

**user_documents** — (atualizada em 2026-05-15)
- extracted_text (text, nullable) — texto extraído do PDF para uso no roadmap sem re-processar
- Migration: `supabase/migrations/20260515000005_user_documents_extracted_text.sql`

### Funções PostgreSQL
- `get_user_daily_usage(user_id, endpoint?)` — retorna contagem de chamadas hoje

### Storage
- Bucket `user-documents` (privado, 10MB, PDF/txt/doc/docx)

---

## Estrutura de Arquivos

```
app/
  (app)/              # Rotas protegidas (requer auth)
    layout.tsx        # Sidebar com NavLinks, ThemeToggle, LanguageSelector
    dashboard/        # DailyLoopWidget + stats cards + heatmap
    questions/[id]/
    practice/
    interview/
    generate/
    live-coding/      # Live Coding Simulator (Monaco Editor + Pair Programmer IA)
    history/          # Histórico paginado de avaliações
    history/[id]/     # Replay: resposta + transcrição + feedback IA
    score-cards/      # Score Cards visuais com radar chart + PDF export
    roadmap/          # Análise de CV vs vaga + roadmap 30/60/90 dias
    concept-graph/
    stats/
    voice-test/       # Página de diagnóstico (redireciona em produção)
  (auth)/             # Rotas públicas
    login/
    register/
  api/
    auth/[action]/    # signin, signup, signout, callback
    questions/        # CRUD + [id]/evaluations
    practice/         # SM-2 com EF — busca histórico antes de calcular intervalo
    interview/        # avaliação de resposta
    interview/followup/ # réplica e tréplica
    concepts/[id]/
    analytics/
    coding/           # GET histórico + POST avaliar código (Live Coding)
    coding/hint/      # POST dica socrática (Edge Runtime, 20/dia)
    evaluations/      # GET paginada + GET [id] detalhe
    score-cards/      # GET lista + POST gerar com IA + GET/DELETE [id]
    roadmaps/         # GET lista + POST ndjson stream + GET/DELETE [id]
    roadmaps/[id]/progress/  # PATCH incrementar progresso de tópico
    dashboard/
      daily-loop/     # GET streak + conceito fraco + flashcards pendentes
    profile/
      language/       # PATCH preferred_language em profiles
    ai/
      evaluate/       # avalia resposta do candidato (Edge Runtime)
      generate/       # gera questões do CV + contexto (Node Runtime)
      transcribe/     # Groq Whisper para voz
    documents/[id]/   # CV e documentos adicionais
    documents/
      extract-text/   # POST extração de texto de PDF (Node Runtime, isolado)
    monitoring/       # tunnel do Sentry (sempre retorna 200)

components/
  DifficultyBadge.tsx
  NavLinks.tsx        # inclui Live Coding na navegação
  ThemeToggle.tsx
  LanguageSelector.tsx # sincroniza idioma com profiles.preferred_language

features/
  questions/{components,hooks}
  practice/{components,hooks}   # Flashcard com SM-2 + EF
  interview/{components,hooks}
  live-coding/hooks/            # useCodingSessions, useSubmitCode
  evaluations/hooks/            # useEvaluations(page) — lista paginada
  score-cards/
    components/                 # RadarChart, ScoreCardView, ExportPdfButton, ScoreCardList
    hooks/                      # useScoreCards, useCreateScoreCard, useDeleteScoreCard
  roadmaps/
    components/                 # RoadmapSetup, GapAnalysisCard, RoadmapTimeline
    hooks/                      # useRoadmaps, useRoadmap, useCreateRoadmap, useUpdateTopicProgress
  concepts/hooks/
  analytics/
    hooks/                      # useAnalytics, useDailyLoop
    components/                 # DailyLoopWidget
  documents/hooks/

lib/
  supabase/{client,server,types}.ts  # inclui CodingSession, DailyLoopData
  ai/
    ai.service.ts               # singleton client + cache de system prompts
    prompts/
      evaluate.prompt.ts        # avaliação técnica — getEvaluateSystemPrompt()
      behavioral.prompt.ts      # avaliação STAR — getBehavioralSystemPrompt()
      generate-from-context.prompt.ts
      followup.prompt.ts        # getFollowupSystemPrompt(), getTreplicaSystemPrompt()
      generate.prompt.ts
      code-evaluate.prompt.ts   # avaliação de código + process_feedback (hints/idle)
      coding-hint.prompt.ts     # Pair Programmer socrático — nunca revela solução
      score-card.prompt.ts      # síntese de múltiplas avaliações em top 3 forças/gaps
      roadmap.prompt.ts         # roadmap 30/60/90 dias com análise de gap vs vaga
  i18n/
    translations.ts             # EN/PT — inclui liveCoding e dashboard.dailyLoop
    useT.ts
  api/
    rate-limit.ts
    brute-force.ts
    stream.ts                   # ndjsonStream + readNdjsonStream
  services/
    spaced-repetition.service.ts # SM-2 com Easiness Factor (history: number[])
  file-validation.ts
  logger.ts
  utils.ts
  utils/
    score-card.utils.ts         # aggregateRadar(), averageScore() — funções puras

store/
  session.store.ts
  settings.store.ts

supabase/
  migrations/
    20260515000000_coding_sessions.sql
    20260515000001_ai_evaluations_transcript.sql
    20260515000002_coding_sessions_hints.sql
    20260515000003_score_cards.sql
    20260515000004_study_roadmaps.sql
    20260515000005_user_documents_extracted_text.sql

e2e/                            # Playwright E2E
  fixtures.ts
  auth.spec.ts
  questions.spec.ts
  interview.spec.ts
  practice.spec.ts
```

---

## Funcionalidades Implementadas

### Gestão de Questões
- CRUD completo com título, enunciado, resposta ideal, dificuldade, categoria
- Questões técnicas e comportamentais (STAR)
- Full-text search com índice GIN no PostgreSQL
- Filtros por dificuldade, idioma e categoria
- Tags e conceitos vinculados

### Geração com IA
- CV em PDF salvo permanentemente — usado automaticamente em todas as gerações
- Arquivos adicionais (descrição da vaga) temporários ou salvos
- Geração personalizada baseada em CV + contexto da vaga
- Distribuição mista de dificuldades
- Endpoint separado para extração de PDF (`/api/documents/extract-text`)

### Coach de Entrevista com IA
- Score breakdown: Correção, Completude, Clareza, Profundidade (0-100 cada)
- Análise STAR para questões comportamentais
- Resposta ideal revelada após avaliação (colapsável)
- Réplica — pergunta de acompanhamento baseada nas lacunas
- Tréplica — avaliação da resposta com veredicto final
- Gravação de voz (MediaRecorder) + transcrição Groq Whisper
- Histórico de avaliações por questão

### Prática com Flashcards
- Modo aleatório e repetição espaçada (SM-2 com Easiness Factor)
- Intervalo adaptativo: rep=1→1d, rep=2→6d, rep≥3→round(prev×EF)
- EF inicia em 2.5, ajusta por qualidade, mínimo 1.3; reset de intervalo em falha preserva EF
- Confiança de 1-5, resumo da sessão

### Live Coding Simulator com Pair Programmer IA *(F8)*
- Monaco Editor com 7 linguagens (JS, TS, Python, Java, C++, Go, Rust)
- 3 problemas pré-definidos + modo de problema personalizado
- Timer configurável 15/30/45 min com pause/resume
- Avaliação de IA: score, complexidade O(n), issues, sugestões, veredicto, process_feedback
- **Pair Programmer socrático** — botão "Pedir Dica" + idle detection (60s), nunca revela a solução diretamente, máx 2 frases
- Métricas de processo: hints_requested, hints_shown, idle_pauses gravados em `coding_sessions`
- HintPanel colapsável na UI
- Rate limit: 15 sessões/dia + 20 dicas/dia
- Histórico de sessões persistido em `coding_sessions`

### Histórico de Avaliações + Replay *(novo)*
- `/history` — lista paginada com score, questão, data e badge de dificuldade
- `/history/[id]` — replay completo: resposta digitada + transcrição de voz lado a lado + breakdown de score + feedback IA
- API: `GET /api/evaluations` (paginada, 20/página) · `GET /api/evaluations/[id]`
- Hook: `useEvaluations(page)` com React Query

### Score Card Visual *(F2)*
- Gerado a partir de múltiplas avaliações selecionadas pelo usuário
- Radar chart 4 eixos: Correção, Completude, Clareza, Profundidade
- Top 3 forças + top 3 lacunas + conceitos ausentes + recomendação da IA
- Histórico de Score Cards salvo em `score_cards` para acompanhar evolução
- **Export PDF** via html2canvas + jspdf (import dinâmico, sem SSR)
- Rate limit: 15 score cards/dia

### Análise de CV + Roadmap de Estudo Personalizado *(F3)*
- Setup: usuário cola descrição da vaga (opcional) e texto do CV
- **Análise de Gap**: match_score (%), habilidades presentes vs ausentes vs extras
- **Roadmap 30/60/90 dias**: 3 fases com tópicos, recursos sugeridos, metas de prática
- Geração via streaming NDJSON (Edge Runtime)
- **Progresso manual** por tópico: botão "+1 concluído" persiste em `roadmap_topic_progress`
- Timeline visual com barras de progresso por fase
- Rate limit: 5 roadmaps/dia

### Daily Learning Loop *(novo)*
- Widget no Dashboard com 4 cards: streak de dias, conceito mais fraco, flashcards pendentes, atalho Live Coding
- Streak calculado a partir de `practice_history` sem nova coluna no banco
- API com 3 queries paralelas (Promise.all)

### Grafo de Conceitos
- React Flow com drag & connect
- Cor do nó = pontuação (vermelho/amarelo/verde)
- Relações: requires / related / part_of

### Estatísticas
- Radar chart por tópico, bar chart de conceitos fracos
- Heatmap de atividade diária

### Internacionalização
- PT-BR e EN completos — toda a UI traduzida
- Troca de idioma sincroniza `profiles.preferred_language` no banco (fire-and-forget)

---

## Segurança Implementada

| Item | Detalhes |
|---|---|
| RLS | Todas as 12 tabelas com USING + WITH CHECK explícito |
| Constraints DB | Tamanho de texto, domínios de enum, score 0-100 |
| Security Headers | CSP, X-Frame-Options, HSTS, X-Content-Type-Options, etc. |
| Rate Limiting | 50 evaluate/dia, 20 generate/dia, 30 transcribe/dia, 40 followup/dia, 15 coding/dia, 20 coding-hint/dia, 15 score-card/dia, 5 roadmap/dia |
| Brute Force | 10 tentativas / 15min por IP, bloqueio de 15min |
| Anti-enumeração | Mesma mensagem para email existente/inexistente |
| Magic bytes | Valida conteúdo real do arquivo, não só MIME type |
| CSRF | Validação de Origin em todos os POSTs de API |
| Sentry | Tunnel via /monitoring, captura erros em produção |
| Logger | JSON estruturado com userId, endpoint, duração |
| Zero TS errors | ignoreBuildErrors removido, build 100% type-safe |
| Supabase Auth | Email verification, secure email/password change, min 8 chars |
| usage_logs | Rastreia todas as chamadas de IA por usuário |

---

## Padrões e Decisões Técnicas

### IA
- Provider: Groq (gratuito, llama-3.3-70b-versatile)
- Cliente OpenAI: singleton por processo (`_client`) — evita instanciar a cada chamada
- System prompts: memoizados por chave `tipo:idioma` (`_systemPromptCache`) — computados uma vez por processo
- Todos os prompts retornam JSON — `response_format: { type: 'json_object' }`
- generateFromContext não é memoizado — varia por count/difficulty/category/language

### SM-2 (Espaçamento)
- `computeNextReview(confidence, history)` — history é array de confidences anteriores da questão
- EF inicial 2.5, mínimo 1.3; atualizado por: `EF + 0.1 - (5-q)(0.08 + (5-q)×0.02)`
- rep=1→1 dia, rep=2→6 dias, rep≥3→round(prev_interval × EF)
- Falha (quality < 3): reseta repetições e intervalo, preserva EF

### Streaming
- `ndjsonStream()` em `lib/api/stream.ts` — ReadableStream com eventos `thinking|complete|error`
- Edge Runtime nas rotas de avaliação e followup (30s timeout)
- Node Runtime em `/api/ai/generate` (pdf-parse requer Node); `/api/documents/extract-text` isola essa dependência

### Auth
- `@supabase/ssr` com cookies em Server Components
- Middleware faz refresh automático da sessão

### Sentry
- Tunnel via `app/monitoring/route.ts` (sempre retorna 200, fire-and-forget)
- `instrumentation-client.ts` tem `tunnel: '/monitoring'` — NÃO remover
- NUNCA adicionar `enableLogs: true` ao Sentry init — tipo não existe

### Idioma
- `useSettingsStore()` retorna `language: 'en' | 'pt'` (localStorage, source of truth da UI)
- Troca de idioma dispara `PATCH /api/profile/language` (sync assíncrono com banco)
- `useT()` retorna `typeof translations['en']`

---

## Testes

### Unitários (Vitest) — `__tests__/unit/`
| Arquivo | Testes | Cobertura |
|---|---|---|
| `brute-force.test.ts` | 11 | ~84% statements |
| `rate-limit.test.ts` | 13 | ~37% statements (checkRateLimit requer Supabase) |
| `file-validation.test.ts` | 10 | ~96% statements |
| `spaced-repetition.test.ts` | 25 | 100% (SM-2 EF, histórico, reset) |
| `prompts.test.ts` | 63 | 100% (code-evaluate, evaluate, behavioral, followup) |
| `generate-prompts.test.ts` | 29 | 100% (generate, generate-from-context, cn()) |
| `stream.test.ts` | 8 | 100% (ndjsonStream server + readNdjsonStream client) |
| `interview-payload.test.ts` | 5 | 100% (serialização do body com transcript) |
| `score-card-utils.test.ts` | 6 | 100% (aggregateRadar, averageScore) |
| `roadmap-prompt.test.ts` | 6 | 100% (idioma, truncagem CV/JD, schema JSON) |
| `generate-prompts.test.ts` (coding-hint) | +10 incluídos acima | 100% (socrático, idioma, schema) |

**Total: 193 testes** — todos passando, zero falhas toleradas. Rodar: `npm test` · com coverage: `npm run test:coverage`

> Módulos sem cobertura unitária (requerem Supabase/IA mockados): `ai.service.ts`, rotas de API, hooks React Query — cobertos pelo E2E.

### E2E (Playwright) — `e2e/`
- `auth.spec.ts` — redirect, login, persistência de sessão
- `questions.spec.ts` — navegação, criar questão
- `interview.spec.ts` — fluxo completo avaliar resposta
- `practice.spec.ts` — modos de prática

Setup local: `cp .env.test.example .env.test` → preencher credenciais → `npx playwright install` → `npm run test:e2e`

---

## O Que Está Pendente

### Features Implementadas Recentemente (2026-05-15)
- **Histórico de Avaliações** (`/history`) — lista paginada com score, questão, data e badge de dificuldade
- **Replay de Entrevista** (`/history/[id]`) — resposta + transcrição de voz lado a lado + feedback completo da IA
- **F8 — Pair Programmer IA no Live Coding** — dicas socráticas on-demand + idle detection 60s, métricas de processo, HintPanel colapsável
- **F2 — Score Card Visual** (`/score-cards`) — radar chart, top forças/lacunas, histórico, export PDF
- **F3 — Análise CV + Roadmap** (`/roadmap`) — gap analysis, roadmap 30/60/90 dias via streaming, progresso manual por tópico

### Features Planejadas
1. **Migrar `/api/ai/generate` para Edge Runtime** — extração já isolada em `/api/documents/extract-text`; passar texto pré-extraído resolve timeout 10s Vercel Hobby
2. **OAuth Google/GitHub** — reduzir atrito no cadastro
3. **F1 — Mock Interview Bidirecional com Voz** — entrevistador IA que faz perguntas em tempo real
4. **Daily Learning Loop melhorado** — streak visual, metas diárias, notificações
5. **Quiz Mode** — múltipla escolha, completar código, encontrar bug
6. **Testes E2E completos** — executar com usuário de teste real no Supabase (infra pronta)

### Antes de Abrir para Outros Usuários
- Supabase Pro ($25/mês) — remove pausa automática após 7 dias sem acesso
- Vercel Pro ($20/mês) — timeout de 60s nas functions (atual: 10s)
- Sistema de quotas por plano (gratuito vs pago)
- Página de landing pública

---

## Armadilhas Conhecidas

1. **Sentry tunnel** — `app/monitoring/route.ts` deve sempre retornar 200. Nunca propagar status da resposta do Sentry.

2. **instrumentation-client.ts** — tem `tunnel: '/monitoring'`. Se o wizard Sentry for rodado novamente, verificar se ainda está lá.

3. **next.config.js** — wizard do Sentry tende a duplicar `withSentryConfig`. Se aparecer `SyntaxError: Identifier already declared`, é duplicata.

4. **Supabase upsert com índice parcial** — `onConflict` não funciona com índices parciais via PostgREST. Usar check-then-update/insert manual.

5. **Web Speech API** — bloqueada por firewall em algumas redes. Solução: MediaRecorder + Groq Whisper via `/api/ai/transcribe`.

6. **Vercel timeout 10s** — `/api/ai/generate` usa Node Runtime por causa do pdf-parse. Rotas de avaliação usam Edge Runtime (30s). Solução completa: Vercel Pro ou migrar generate para Edge (extração já isolada).

7. **Supabase pausa automática** — projetos gratuitos pausam após 7 dias sem acesso. Upgrade para Pro antes de abrir para usuários.

8. **Monaco Editor SSR** — carregado com `dynamic(() => import('@monaco-editor/react'), { ssr: false })`. Nunca importar diretamente em Server Components.

9. **SM-2 com histórico** — `computeNextReview(confidence, history)` requer busca prévia no banco. A rota `POST /api/practice` faz essa query antes de salvar — não chamar o serviço sem passar o histórico.
