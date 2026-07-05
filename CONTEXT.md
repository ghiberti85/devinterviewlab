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

Todas as tabelas têm RLS habilitado. Schema: `public`. Total: **19 tabelas**.

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

**roadmap_questions** — questões de entrevista geradas por IA para cada tópico do roadmap *(adicionada em 2026-05-30)*
- id (uuid, PK), roadmap_id (uuid, FK study_roadmaps ON DELETE CASCADE), user_id (uuid, FK auth.users ON DELETE CASCADE)
- phase_name (text), topic_name (text), question (text), answer (text)
- question_type (text, check: theoretical|live_coding, default 'theoretical') *(adicionado em 2026-05-31)*
- language (text, check: en|pt, default 'en') *(adicionado em 2026-05-31)*
- question_order (int, default 0), created_at
- Políticas: SELECT/INSERT/DELETE por user_id
- Índices: idx_roadmap_questions_roadmap_id, idx_roadmap_questions_user_id
- Migration: `supabase/migrations/20260529000000_roadmap_questions.sql`, `20260531000001_roadmap_questions_type.sql`

**user_documents** — (atualizada em 2026-05-15)
- extracted_text (text, nullable) — texto extraído do PDF para uso no roadmap sem re-processar
- Migration: `supabase/migrations/20260515000005_user_documents_extracted_text.sql`

**topics** — Flash Topics gerados por IA *(adicionada em 2026-05-15)*
- id, user_id (FK profiles), category_id (FK categories, nullable)
- title (text, max 200), difficulty (check: easy|medium|hard, default medium)
- summary (text, max 2000), when_to_use (text, max 1000, nullable)
- pros (text[], default '{}') — vantagens geradas por IA *(adicionado em 2026-05-31)*
- cons (text[], default '{}') — desvantagens/trade-offs gerados por IA *(adicionado em 2026-05-31)*
- code_snippet (text, max 3000, nullable), quick_qa (jsonb, array de {q, a})
- tags (text[]), language (text, check: en|pt, default en)
- translated_from (uuid, FK topics self-referencing, nullable) — liga traduções ao original
- created_at
- Políticas: SELECT/INSERT/DELETE por user_id
- Migrations: `20260515000006_topics.sql`, `20260515000007_topics_language.sql`, `20260531000000_topics_pros_cons.sql`

**brute_force_log** — persistência de proteção brute-force *(adicionada em 2026-06-28)*
- ip (TEXT, PK), count (INTEGER, default 0), first_at (TIMESTAMPTZ, default NOW()), blocked_at (TIMESTAMPTZ, nullable)
- RLS habilitado; `authenticated` e `anon` sem acesso direto à tabela
- Acesso exclusivo via RPCs SECURITY DEFINER (ver abaixo)
- Índice: `brute_force_log_first_at_idx` em `first_at`
- Migration: `supabase/migrations/20260628000000_brute_force_log.sql`

### Funções PostgreSQL
- `get_user_daily_usage(user_id, endpoint?)` — retorna contagem de chamadas hoje
- `bf_check(p_ip TEXT)` — retorna `(allowed BOOLEAN, retry_after_sec INTEGER)` — SECURITY DEFINER, grant para anon + authenticated
- `bf_record_failure(p_ip TEXT)` — incrementa contagem e define `blocked_at` ao atingir MAX_ATTEMPTS — SECURITY DEFINER
- `bf_reset(p_ip TEXT)` — apaga a linha do IP (usado após login bem-sucedido) — SECURITY DEFINER

### Storage
- Bucket `user-documents` (privado, 10MB, PDF/txt/doc/docx)

---

## Estrutura de Arquivos

```
app/
  (app)/              # Rotas protegidas (requer auth)
    layout.tsx        # Sidebar (desktop 4 itens) + BottomNav (mobile 4 tabs) + MobileTopBar (back button + SettingsDrawer)
    dashboard/        # "Hoje" — DailyLoopWidget + stats cards + heatmap + atalhos
    simular/          # Hub: cards Entrevista + Live Coding + tópicos para praticar + 5 sessões recentes
    revisar/          # Tabs integradas: Questions (roadmap questions + gerar) | Topics (Flash Topics, grid, seleção por long-press)
    plano/            # Roadmap: CV-only ou CV+JD, múltiplos roadmaps, geração de questões por tipo, delete com cascade
    questions/[id]/
    interview/        # mantida (acessível via URL direta)
    generate/
    live-coding/      # Live Coding Simulator — Monaco desktop, textarea mobile; botões IA/Salvos/Custom; Salvar para depois
    history/          # Histórico paginado de avaliações
    history/[id]/     # Replay: resposta + transcrição + feedback IA
    score-cards/      # Relatórios visuais de desempenho (acessível via /plano → Progresso)
    concept-graph/
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
    coding/hint/      # POST dica socrática (Node Runtime, 20/dia)
    coding/generate/  # POST gerar problema com IA (dificuldade + tópico + linguagem)
    coding/save-problem/ # POST salvar stub de problema (title+desc, código vazio, score null)
    topics/bulk-delete/ # POST apagar múltiplos tópicos
    evaluations/      # GET paginada + GET [id] detalhe
    score-cards/      # GET lista + POST gerar com IA + GET/DELETE [id]
    roadmaps/         # GET lista + POST ndjson stream + GET/DELETE [id]
    roadmaps/[id]/progress/         # PATCH incrementar progresso de tópico
    roadmaps/[id]/generate-questions/ # GET lista questões · DELETE limpa todas · POST gera por tópico (append, sem delete)
    topics/           # GET todos os tópicos do usuário (ambos idiomas) + POST gerar
    topics/[id]/      # GET + DELETE
    topics/[id]/translate/  # POST traduzir e persistir (Node Runtime, 50/dia, idempotente)
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
  NavLinks.tsx        # 4 itens: Hoje / Plano / Revisar / Simular (desktop)
  BottomNav.tsx       # 4 tabs fixas no mobile — mesma ordem: Hoje / Plano / Revisar / Simular
  MobileTopBar.tsx    # Top bar mobile: logo nos hubs, logo + ChevronLeft nas sub-páginas
                      # Ícone ⚙ abre SettingsDrawer com ThemeToggle, LanguageSelector e Logout
                      # PARENT_ROUTE mapeia sub-rotas ao hub pai — concept-graph → /revisar, generate → /revisar, score-cards → /plano
  ThemeToggle.tsx
  LanguageSelector.tsx # sincroniza idioma com profiles.preferred_language

features/
  questions/{components,hooks}
  practice/{components,hooks}   # Flashcard com SM-2 + EF
  interview/{components,hooks}
  live-coding/hooks/            # useCodingSessions, useSubmitCode, useRequestHint, useGenerateProblem
  evaluations/hooks/            # useEvaluations(page) — lista paginada
  score-cards/
    components/                 # RadarChart, ScoreCardView, ExportPdfButton, ScoreCardList
    hooks/                      # useScoreCards, useCreateScoreCard, useDeleteScoreCard
  roadmaps/
    components/                 # RoadmapSetup, GapAnalysisCard, RoadmapTimeline
    hooks/                      # useRoadmaps, useCreateRoadmap, useDeleteRoadmap, useUpdateTopicProgress
                                # useRoadmapQuestions, useBulkDeleteRoadmapQuestions, useGenerateTopicQuestions
  topics/
    components/                 # TopicCard (tradução persistida, texto completo, tags com +N popup), TopicGenerator
    hooks/                      # useTopics(language), useGenerateTopic, useTranslateTopic, useDeleteTopic, useBulkDeleteTopics
  documents/hooks/              # useDocuments, useSavedCV, useUploadDocument, useDeleteDocument, formatFileSize
  concepts/hooks/               # useConcepts, useCreateConcept, useCreateRelation, useDeleteConcept
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
      coding-generate.prompt.ts # Geração de problema por IA: dificuldade + tópico + linguagem
      score-card.prompt.ts      # síntese de múltiplas avaliações em top 3 forças/gaps
      roadmap.prompt.ts         # roadmap 30/60/90 dias com análise de gap vs vaga
      topic.prompt.ts           # getTopicSystemPrompt, topicAnalysisPrompt, topicTranslatePrompt
  i18n/
    translations.ts             # EN/PT — inclui liveCoding, dashboard.dailyLoop, review.generateQuestions, practice.skip, roadmap.cvOnly/cvOrJdRequired
    useT.ts
  api/
    rate-limit.ts
    brute-force.ts
    brute-force-persistent.ts   # checkBruteForcePersistent / recordFailedAttemptPersistent / resetAttemptsPersistent — usa Supabase RPCs (SECURITY DEFINER), fallback in-memory
    stream.ts                   # ndjsonStream + readNdjsonStream
  services/
    spaced-repetition.service.ts # SM-2 com Easiness Factor (history: number[])
  file-validation.ts
  logger.ts
  utils.ts
  utils/
    score-card.utils.ts         # aggregateRadar(), averageScore() — funções puras
    topic-pairs.ts              # groupIntoPairs(topics, language) → TopicPair[] — função pura testável

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
    20260515000006_topics.sql
    20260515000007_topics_language.sql
    20260529000000_roadmap_questions.sql
    20260531000000_topics_pros_cons.sql
    20260531000001_roadmap_questions_type.sql
    20260628000000_brute_force_log.sql  # tabela brute_force_log + RPCs bf_check/bf_record_failure/bf_reset (SECURITY DEFINER)

e2e/                            # Playwright E2E
  fixtures.ts                   # login helper → redireciona para /plano
  auth.spec.ts                  # redirect para /login, login com credenciais, persistência, signout
  demo.spec.ts                  # rota pública /demo — sem autenticação; seguro para CI sem credenciais de teste
  interview.spec.ts             # /interview — seletor de questão, textarea, botão avaliar, shuffle
  questions.spec.ts             # /revisar — navegação, abas Flash Topics/Questões
  practice.spec.ts              # /plano e /stats — roadmap list, page title, stats render
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
- Setup: usuário cola texto do CV (obrigatório) + descrição da vaga (opcional — aceita CV-only; API valida: deve ter JD ou CV)
- **Análise de Gap**: match_score (%), habilidades presentes vs ausentes vs extras
- **Roadmap 30/60/90 dias**: 3 fases com tópicos, recursos sugeridos, metas de prática
- Geração via streaming NDJSON (Edge Runtime)
- **Múltiplos roadmaps**: dropdown para alternar entre roadmaps salvos; se único, exibe título como texto simples
- **Progresso manual** por tópico: botão "+1 concluído" persiste em `roadmap_topic_progress`
- Timeline visual com barras de progresso por fase
- Rate limit: 5 roadmaps/dia

### Questões de Entrevista por Roadmap *(atualizado em 2026-06-02)*
- **Aba Revisar → Questões** é a primeira aba (padrão ao abrir `/revisar`)
- **Tipo de questão**: seletor Teórica / Live Coding (full-width no card do Plano) controla o tipo gerado
  - Teórica: `{ question, answer }` — texto detalhado 150-300 palavras
  - Live Coding: `{ question, code_solution }` — enunciado com assinatura + constraints + exemplos; código completo sem hints
- **Geração sequencial** EN depois PT (evita timeout Vercel 10s) — sem `Promise.all`
- **Deduplicação**: API verifica questões existentes por tópico antes de inserir (sem limpar o banco)
- **Progresso real**: barra + percentual calculado a partir do índice do tópico atual
- **Parsing robusto**: `safeParseJSON` com fallback `fixJsonNewlines` (escapa newlines literais em strings JSON gerados pela IA)
- **Contagem por idioma**: API retorna `{ count, perLanguage }` — UI usa `perLanguage` para mostrar total correto
- **Links diretos**: botão Practice de cada tópico navega para `/revisar?tab=questions&topic=<nome>` — aba Questões abre pré-filtrada
- **Botão Practice global**: navega para `/revisar?tab=questions`
- **Aba Revisar**: lê params `tab` e `topic` via `useSearchParams` para pré-selecionar estado inicial
- Delete individual via botão lixeira; delete em lote com seleção múltipla
- Botão "Adicionar conceito" em cada questão → cria Flash Topic a partir do `topic_name`
- Filtro por tópico + botão "Gerar mais" para o tópico selecionado
- **QuestionCard**: texto da questão em largura total; tags Teórica / Live Coding na mesma linha; toggle resposta abaixo
- API: `POST /api/roadmaps/[id]/generate-questions` (corpo: `{ topicName, phaseName, language, existingQuestions?, questionType }`) retorna `{ count, perLanguage }`
- Segurança: todas as rotas têm `getUser()` + `checkRateLimit()` + `sanitizeError()`

### Nova Navegação por Hubs *(refatoração)*
- Navegação reduzida de 12 itens para 4 — agrupamento por **intenção do usuário**, não por feature
- Ordem: **Hoje · Plano · Revisar · Simular** (em BottomNav e NavLinks)
- **`/simular`** — hub com: cards Entrevista + Live Coding · lista de tópicos para praticar · 5 sessões/entrevistas recentes
- **`/demo`** — rota **pública** (sem auth), dados mockados, 4 abas interativas (Plan, Review, Simulate, Stats), layout responsivo desktop/mobile, CTA "Sign up free"
- **`/revisar`** — tabs: **Questions** (seletor de roadmap + tópico, gerador de questões inline, cards com resposta expansível, gerar conceito → Flash Topics) | **Topics/Flash Topics** (gerador, grid 3 colunas, long-press → select mode → bulk delete, filtro por roadmap)
- **`/plano`** — lista de roadmaps (múltiplos), gap analysis com score, fases + tópicos colapsáveis, seletor de tipo de questão, botão delete com cascade (roadmap_questions + roadmap_topic_progress + Flash Topics relacionados)
- **`MobileTopBar`** — top bar mobile com botão voltar (ChevronLeft) nas sub-páginas; hubs mostram logo + ícone ⚙ que abre SettingsDrawer (ThemeToggle, LanguageSelector, Logout)
- **Simplificação**: 4 páginas standalone removidas — `/practice`, `/stats`, `/topics`, `/roadmap`; funcionalidades integradas nas abas dos hubs correspondentes
- **`/login`** — exibe link "Ver modo demo" abaixo do card de login

### Simplificação de Navegação *(refatoração)*
- **4 páginas standalone removidas**: `/practice`, `/stats`, `/topics`, `/roadmap`
- Funcionalidades integradas nas abas dos hubs:
  - `/practice` → aba Flashcards em `/revisar`
  - `/topics` → aba Topics em `/revisar`
  - `/stats` → aba Progresso em `/plano`
  - `/roadmap` → aba Roadmap em `/plano`
- Páginas auxiliares (`/generate`, `/score-cards`, `/concept-graph`, `/history`) mantidas e acessadas via links internos nos hubs
- Configurações (tema/idioma/logout) acessíveis via ícone ⚙ na MobileTopBar — sem página de settings separada

### CV Upload + Documentos Armazenados
- `RoadmapSetup` tem botão "Upload PDF" — faz POST `/api/documents` (multipart, keepStored: true), extrai texto do PDF, preenche o textarea CV automaticamente
- Botão "Usar CV salvo" aparece se já houver CV no banco — carrega `text_content` sem re-upload
- Lista de arquivos armazenados (nome, tamanho, data, botão excluir) exibida no setup do roadmap
- Hooks: `useSavedCV`, `useUploadDocument`, `useDeleteDocument` (em `features/documents/hooks/useDocuments.ts`)

### Flash Topics — Auto-populate Flashcards, Concepts e Simulate
- **Ao gerar um tópico** (POST `/api/topics`): cria automaticamente:
  1. Uma `Question` por par `{q, a}` do `quick_qa` → aparecem em Flashcards e AI Interview
  2. Um `Concept` para o título do tópico (description = summary)
  3. Um `Concept` por tag, com relação `part_of` → nó raiz do tópico
  - Deduplicação por nome (consulta existentes antes de inserir); falha não bloqueia o tópico
- **Aba Topics em `/revisar`**: grid 3 colunas de TopicCards (teoria + quando usar + prós/contras + Q&A + código); long-press ativa select mode para bulk delete; filtro por roadmap via dropdown

### Geração de Problemas de Live Coding com IA
- Seletor de fonte redesenhado: 3 botões destacados (IA / Salvos / Custom) — botão ativo tem destaque visual
- Botão "Gerar com IA" dentro do painel IA: seletor de dificuldade (Easy/Medium/Hard com cores) + campo de tópico opcional
- API: POST `/api/coding/generate` → `{ title, description }` gerados pelo LLM
- **Salvar para depois**: botão visível antes do timer iniciar → chama `useSaveProblem()` → POST `/api/coding/save-problem` (salva stub com código vazio, score null)
- Prompt em `coding-generate.prompt.ts`: exige exemplos, constraints, nunca revela solução

### Flash Topics / Conceitos *(atualizado em 2026-06-02)*
- Aba **Conceitos** em `/revisar` (renomeada de "Tópicos" — "Tópicos" ficou reservado para o Plano/Roadmap)
- Cada tópico: resumo 150-250 palavras + "quando usar/evitar" + prós & contras + snippet de código + 4 Q&A de entrevista
- **TopicCard com acordeons**: seções Teoria (aberta por padrão) / Quando usar / Prós & Contras — colapsáveis individualmente
- **Prós & Contras**: grid `sm:grid-cols-2` (coluna única no mobile, duas colunas no desktop)
- **Tags com truncamento**: máximo 2 tags visíveis + botão `+N` abre popup com as restantes (fecha ao clicar fora)
- **Cada tópico**: resumo 150-250 palavras + "quando usar/evitar" (texto completo, sem truncamento) + snippet de código + 4 Q&A de entrevista
- **Tradução persistida**: botão "Traduzir → EN/PT" no card gera versão no outro idioma via IA e salva no banco
  — ao trocar idioma no app a lista mostra automaticamente a versão já traduzida, sem nova chamada à IA
- **Modelo de pares**: API retorna todos os tópicos (ambos idiomas); `groupIntoPairs()` agrupa por `rootId = translated_from ?? id`
  — garante mesma quantidade e ordem de tópicos em PT e EN, mesmo que criados em momentos diferentes
  — `TopicPair { rootId, rootCreatedAt, current: Topic|null, other: Topic|null }` — `current` é o idioma ativo, `other` é o outro
  — se `current` for null (sem tradução), o card **nunca** exibe o texto de `other` — mostra um placeholder neutro + botão de tradução (ver "Flash Topics — garantia de bilinguismo")
  — `rootCreatedAt` = menor `created_at` do par → ordenação estável independente do idioma
- `translated_from` (uuid, self-ref FK) liga a tradução ao original; idempotente (409 se tradução já existe)
- Translate route usa Node Runtime (não Edge) — singleton OpenAI incompatível com isolates do Edge Runtime
- Rate limit: 30 tópicos/dia, 50 traduções/dia
- Prompts: `topic.prompt.ts` (geração) + `topicTranslatePrompt` (tradução — preserva termos técnicos, mantém code_snippet intacto)

### Experiência Mobile / PWA *(novo)*
- **Bottom tab bar** com 4 abas fixas: Hoje · Simular · Revisar · Meu Plano (sem sheet "Mais")
- Top bar mobile simplificada (logo + backdrop blur), desktop sidebar inalterado com os mesmos 4 itens
- PWA: `app/manifest.ts` (display standalone, tema índigo escuro)
- Meta tags iOS: apple-mobile-web-app-capable, apple-touch-icon (180px)
- `env(safe-area-inset-bottom)` para iPhone com notch/Dynamic Island
- Ícones gerados via sharp: `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`
- **Live Coding mobile**: Monaco Editor substituído por `<textarea>` em ≤768px (Monaco não carrega em PWA/WebView)

### Daily Learning Loop *(novo)*
- Widget no Dashboard com 4 cards: streak de dias, conceito mais fraco, flashcards pendentes, atalho de simulação
- Streak calculado a partir de `practice_history` sem nova coluna no banco
- API com 3 queries paralelas (Promise.all)
- Links apontam para os novos hubs: /revisar, /simular, /plano

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
| RLS | Todas as 19 tabelas com USING + WITH CHECK explícito |
| Constraints DB | Tamanho de texto, domínios de enum, score 0-100 |
| Security Headers | CSP dinâmico via middleware (route-scoped: `unsafe-eval` só em `/live-coding` para Monaco), HSTS, X-Frame-Options, X-Content-Type-Options |
| Rate Limiting | 50 evaluate/dia, 20 generate/dia, 30 transcribe/dia, 40 followup/dia, 15 coding/dia, 20 coding-hint/dia, 15 score-card/dia, 5 roadmap/dia, 30 topic/dia, 50 topic-translate/dia, N roadmap-generate-questions/dia |
| Brute Force | 10 tentativas / 15min por IP, bloqueio de 15min — **persistido em `brute_force_log` via RPCs SECURITY DEFINER** (`bf_check`, `bf_record_failure`, `bf_reset`); fallback in-memory se Supabase indisponível |
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

### Flash Topics — garantia de bilinguismo *(atualizado em 2026-07-04)*
Duas camadas de defesa — uma na escrita, uma na leitura — garantem que a aba Conceitos nunca exiba texto em um idioma diferente do ativo, mesmo que a geração original tenha falhado por qualquer motivo.

**1. Escrita (`POST /api/topics`)**
- Gera o tópico no `language` recebido e traduz para o outro idioma **sincronamente** (aguardado na mesma requisição) — nunca "fire and forget"
- **Trava de idioma no prompt**: `topicAnalysisPrompt`/`getTopicSystemPrompt` instruem explicitamente a traduzir o `topicName` de entrada (que pode vir em outro idioma — ex.: `topic_name` de uma `roadmap_question` gerado quando o roadmap foi criado em PT) para o idioma alvo, incluindo o campo `title`; nunca ecoar o nome de entrada sem tradução
- **Backfill no request**: se já existir um tópico com o mesmo título no idioma pedido, a rota verifica se o par (`translated_from`) no outro idioma existe; se não existir, traduz e insere antes de retornar

**2. Leitura — auto-cura (`GET /api/topics`)** *(novo em 2026-07-04)*
- A cada carregamento da aba Conceitos, `findTranslationGaps()` varre os tópicos do usuário e identifica pares com apenas um idioma presente (cobre qualquer lacuna pré-existente, de antes desta garantia existir, ou de qualquer edge case futuro — não depende do usuário reabrir o gerador)
- Cura até `MAX_GAPS_HEALED_PER_REQUEST = 3` lacunas por requisição (mais antigas primeiro), para nunca arriscar estourar o timeout da serverless function — o restante se resolve sozinho nas próximas cargas da página
- Os tópicos recém-traduzidos entram na própria resposta do GET, sem round-trip adicional no cliente

**3. Renderização (`TopicCard.tsx`) — garantia visual**
- `TopicCard` **nunca** lê campos de texto (`title`, `summary`, `when_to_use`, `pros`, `cons`, `tags`) de `pair.other` — apenas de `pair.current` (a versão no idioma ativo)
- Se `pair.current` for `null`, renderiza um placeholder neutro (mensagem traduzida via `t.topics.notTranslatedYet` + botão manual de tradução) em vez do conteúdo estrangeiro — o antigo comportamento de "fallback com badge amarelo mostrando o texto no outro idioma" foi removido
- Esse estado é esperado ser transitório: a auto-cura do GET fecha a lacuna sozinha; o botão manual permite forçar a tradução imediatamente

Helper `insertTranslatedTopic()` em `app/api/topics/route.ts` é compartilhado pelas 3 chamadas (geração nova, backfill no POST, auto-cura no GET).

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
| Arquivo | Testes | O que cobre |
|---|---|---|
| `brute-force.test.ts` | 14 | checkBruteForce (bloqueio, janela deslizante, reset), getClientIP (x-forwarded-for, x-real-ip, fallback) |
| `rate-limit.test.ts` | 13 | checkRateLimit (requer Supabase — cobertura parcial ~37%) |
| `file-validation.test.ts` | 10 | validateFileBuffer — magic bytes, MIME, tamanho |
| `spaced-repetition.test.ts` | 25 | SM-2 EF completo: histórico, reset, intervalos |
| `prompts.test.ts` | 63 | code-evaluate, evaluate, behavioral, followup — EN/PT, schema JSON |
| `generate-prompts.test.ts` | 32 | generate, generate-from-context, coding-hint (incluindo fallback idioma desconhecido e description vazia), cn() |
| `stream.test.ts` | 9 | ndjsonStream (server) + readNdjsonStream (client), incluindo flush de buffer residual |
| `interview-payload.test.ts` | 5 | serialização do body com transcript |
| `score-card-utils.test.ts` | 6 | aggregateRadar(), averageScore() |
| `roadmap-prompt.test.ts` | 6 | idioma, truncagem CV/JD, schema JSON |
| `topic-prompt.test.ts` | 29 | getTopicSystemPrompt, topicAnalysisPrompt, topicTranslatePrompt — incl. regras de trava de idioma de saída |
| `topic-pairs.test.ts` | 10 | groupIntoPairs — vazio, par único, fallback, original+tradução, dois independentes, ordenação, rootCreatedAt, estabilidade entre idiomas, misto, orfão |
| `score-card-prompt.test.ts` | 11 | getScoreCardSystemPrompt (EN/PT, JSON-only, 3 forças/gaps), scoreCardPrompt (count, campos, vazio, numeração) |
| `coding-generate-prompt.test.ts` | 13 | getCodingGenerateSystemPrompt (EN, PT, fallback, no-solution, JSON-only), codingGeneratePrompt (difficulty, topic, generic fallback, coding language, system prompt, todos os níveis) |
| `roadmap-questions-prompt.test.ts` | 28 | fixJsonNewlines (newlines em strings, escapes existentes, multiline, edge cases), safeParseJSON (markdown fences, fallback, invalid), prompts teórico e live coding (EN/PT, avoidBlock, schema keys) |
| `brute-force-persistent.test.ts` | 8 | caminho RPC Supabase (allowed, blocked, retryAfterSec), fallback in-memory ao erro, reset, no-throw |
| `api-evaluate.test.ts` | 4 | camadas de guarda 401/429/400 na rota `/api/ai/evaluate` |
| `api-roadmaps.test.ts` | 3 | 401 sem auth, 200 lista vazia, campo progress presente em `/api/roadmaps` |
| `api-topics.test.ts` | 8 | 401/400 no POST, backfill de tradução ausente, não re-traduz se par já existe, auto-cura + limite de 3 lacunas por request no GET |

**Total: 318 testes** — todos passando, zero falhas toleradas. Rodar: `npm test` · com coverage: `npm run test:coverage`

### Cobertura global (v8)
| Métrica | % | Threshold |
|---|---|---|
| Statements | 97% | — |
| Branches | 90% | 85% ✅ |
| Functions | 100% | 90% ✅ |
| Lines | 98% | — |

Branches remanescentes não cobertas são dead code ou dependem de infra externa:
- `generate.prompt.ts` — branch PT inexistente (prompt sempre em inglês)
- `followup.prompt.ts` — branch de idioma alternativo raramente acionado
- `stream.ts` — linha interna do reader V8 não exercitável via unit test

> Módulos sem cobertura unitária (requerem Supabase/IA mockados): `ai.service.ts`, rotas de API, hooks React Query — cobertos pelo E2E.

### E2E (Playwright) — `e2e/`
- `demo.spec.ts` — rota pública `/demo` (sem auth) — seguro em CI sem credenciais; verifica heading, abas, link de cadastro
- `auth.spec.ts` — redirect para `/login`, login com credenciais válidas, persistência de sessão, signout via `/api/auth/signout`
- `questions.spec.ts` — navegação para `/revisar`, abas Flash Topics / Questões, conteúdo ou empty state
- `interview.spec.ts` — `/interview`: seletor de questão (select/combobox), textarea, botão avaliar desabilitado sem resposta, shuffle
- `practice.spec.ts` — `/plano`: título, roadmap list / CTA; `/stats`: navegação e conteúdo

Setup local: `cp .env.test.example .env.test` → preencher `TEST_EMAIL` e `TEST_PASSWORD` → `npx playwright install` → `npm run test:e2e`

---

## O Que Está Pendente

### Features Implementadas Recentemente (2026-06-07)
- **Modo Demo** (`/demo`) — rota pública com dados mockados, 4 abas interativas (Plan, Review, Simulate, Stats), layout desktop 2-colunas, CTA de cadastro; link visível na tela de login
- **Anti-repetição em geração de questões** — taxonomia de 5 ângulos obrigatórios (Conceitual, Prático/Cenário, Trade-off, Debug, Evolução) + frases banidas ("em 30 dias", "seu time tem N dias"); aplicado em `generate.prompt.ts`, `generate-from-context.prompt.ts` e `ai.service.ts` (generateRoadmapQuestions)
- **Feedback de geração de conceito** — após gerar conceito de uma questão, mostra link "Flash Topics →" que troca de aba automaticamente; exibe erro visível se falhar
- **Delete de roadmap com cascade** — apaga roadmap_questions, roadmap_topic_progress e Flash Topics relacionados (match por título); confirmação inline no card
- **Bulk delete de questões e conceitos** — long-press ativa select mode; selecionar todos, apagar selecionados, cancelar
- **Filtro de roadmap nas abas Questões e Conceitos** — dropdown seleciona roadmap; conceitos filtrados por match de título com tópicos do roadmap
- **Geração de questões inline em Revisar** — painel com input de tópico (datalist autocomplete), seletor de tipo (Theoretical/Live Coding) e botão gerar
- **Histórico de Avaliações** (`/history`) — lista paginada com score, questão, data e badge de dificuldade
- **Replay de Entrevista** (`/history/[id]`) — resposta + transcrição de voz lado a lado + feedback completo da IA
- **F8 — Pair Programmer IA no Live Coding** — dicas socráticas on-demand + idle detection 60s, métricas de processo
- **F2 — Score Card Visual** (`/score-cards`) — radar chart, top forças/lacunas, histórico, export PDF
- **Flash Topics** (aba em `/revisar`) — referências rápidas com Q&A integrado, tradução persistida EN↔PT, tags com popup +N
- **PWA + Mobile App** — bottom tab bar, manifest, ícones, safe-area iOS

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

10. **`topic_name` de roadmap_questions é monolíngue** — `study_roadmaps.roadmap` (fases/tópicos) é gerado uma única vez, no idioma ativo no momento da criação do roadmap. Ao gerar `roadmap_questions` em ambos os idiomas (`POST /api/roadmaps/[id]/generate-questions`), o campo `topic_name` é o mesmo texto literal para as linhas `en` e `pt` — ou seja, pode estar no idioma "errado" em relação à linha que o acompanha. Isso significa que o `topicName` enviado para `POST /api/topics` (botão "Adicionar conceito") pode estar em um idioma diferente do `language` solicitado. A rota de tópicos compensa isso instruindo a IA a traduzir o `topicName` de entrada para o idioma alvo (ver "Flash Topics — garantia de bilinguismo" acima) — nunca remover essa instrução do prompt.
