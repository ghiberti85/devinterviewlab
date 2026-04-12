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
| UI | Shadcn/ui, Lucide React, Recharts, React Flow |
| Estado | Zustand + React Query (@tanstack/react-query) |
| Auth + DB | Supabase (PostgreSQL + Auth + Storage + RLS) |
| IA | Groq (llama-3.3-70b-versatile) via OpenAI-compatible API |
| Transcrição de voz | Groq Whisper (whisper-large-v3-turbo) |
| Deploy | Vercel (Hobby plan) |
| Monitoramento | Sentry (tunnel via /monitoring) |
| Testes | Nenhum ainda — próximo passo |

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

Todas as tabelas têm RLS habilitado. Schema: `public`.

### Tabelas

**profiles** — estende auth.users
- id (uuid, FK auth.users)
- username (text, unique, max 50)
- preferred_language (text, default 'en', check: 'en'|'pt')
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
- duration_sec, next_review_at (SM-2 spaced repetition)
- created_at

**ai_evaluations** — avaliações de respostas pela IA
- id, user_id, question_id (nullable)
- user_answer (text, max 50k)
- score (numeric), feedback (jsonb)
- missing_concepts (text[]), model_used, prompt_version
- created_at

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
    dashboard/
    questions/[id]/
    practice/
    interview/
    generate/
    concept-graph/
    stats/
    voice-test/       # Página de diagnóstico (redireciona em produção)
  (auth)/             # Rotas públicas
    login/
    register/
  api/
    auth/[action]/    # signin, signup, signout, callback
    questions/        # CRUD + [id]/evaluations
    practice/
    interview/        # avaliação de resposta
    interview/followup/ # réplica e tréplica
    concepts/[id]/
    analytics/
    ai/
      evaluate/       # avalia resposta do candidato
      generate/       # gera questões do CV + contexto
      transcribe/     # Groq Whisper para voz
    documents/[id]/   # CV e documentos adicionais
    sentry-example-api/ # gerado pelo wizard Sentry
  monitoring/         # tunnel do Sentry (sempre retorna 200)
  sentry-example-page/ # gerado pelo wizard Sentry
  global-error.tsx    # gerado pelo wizard Sentry
  icon.tsx            # favicon gerado dinamicamente
  layout.tsx          # root layout com Providers
  providers.tsx       # QueryClient + ThemeProvider

components/
  DifficultyBadge.tsx # Fácil/Médio/Difícil por idioma
  NavLinks.tsx        # navegação com active state
  ThemeToggle.tsx     # dark/light/system
  LanguageSelector.tsx # EN/PT

features/
  questions/{components,hooks}  # QuestionForm, QuestionCard, useQuestions
  practice/{components,hooks}   # Flashcard (SM-2), usePractice
  interview/{components,hooks}  # AIFeedbackPanel, VoiceInput, useInterview
  concepts/hooks/               # useConcepts
  analytics/hooks/              # useAnalytics
  documents/hooks/              # useDocuments

lib/
  supabase/{client,server,types}.ts
  ai/
    ai.service.ts               # evaluateAnswer, generateFromContext, generateFollowup, evaluateFollowup
    prompts/
      evaluate.prompt.ts        # avaliação técnica (Staff Engineer level)
      behavioral.prompt.ts      # avaliação STAR
      generate-from-context.prompt.ts  # geração personalizada do CV
      followup.prompt.ts        # réplica e tréplica
      generate.prompt.ts
  i18n/
    translations.ts             # strings EN/PT completas
    useT.ts                     # hook que retorna typeof translations['en']
  api/
    rate-limit.ts               # rate limiting por usuário
    brute-force.ts              # proteção por IP no login
  services/
    spaced-repetition.service.ts # algoritmo SM-2
  file-validation.ts            # magic bytes + MIME type
  logger.ts                     # logger estruturado JSON + Sentry
  utils.ts                      # cn() helper

store/
  session.store.ts              # timer de sessão de prática
  settings.store.ts             # language: 'en'|'pt' (default 'pt', persistido)

middleware.ts                   # CSRF, proteção de rotas, refresh de sessão
instrumentation.ts              # inicialização Sentry no servidor
instrumentation-client.ts       # inicialização Sentry no cliente (tunnel: '/monitoring')
sentry.client.config.ts         # config Sentry cliente
sentry.server.config.ts         # config Sentry servidor
sentry.edge.config.ts           # config Sentry edge
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
- Prompts com regras explícitas: perguntas reais (não títulos de tópicos), respostas de 300-600 palavras

### Coach de Entrevista com IA
- Score breakdown: Correção, Completude, Clareza, Profundidade (0-100 cada)
- Análise STAR para questões comportamentais
- Resposta ideal revelada após avaliação (colapsável)
- Réplica — pergunta de acompanhamento baseada nas lacunas
- Tréplica — avaliação da resposta com veredicto final
- Gravação de voz (MediaRecorder) + transcrição Groq Whisper
- Histórico de avaliações por questão

### Prática com Flashcards
- Modo aleatório e repetição espaçada (SM-2)
- Mostra título completo + enunciado + contexto
- Confiança de 1-5, resumo da sessão

### Grafo de Conceitos
- React Flow com drag & connect
- Cor do nó = pontuação (vermelho/amarelo/verde)
- Relações: requires / related / part_of

### Estatísticas
- Radar chart por tópico, bar chart de conceitos fracos
- Heatmap de atividade diária

### Internacionalização
- PT-BR e EN completos — toda a UI traduzida
- Padrão PT-BR, persistido no localStorage

---

## Segurança Implementada

| Item | Detalhes |
|---|---|
| RLS | Todas as 11 tabelas com USING + WITH CHECK explícito |
| Constraints DB | Tamanho de texto, domínios de enum, score 0-100 |
| Security Headers | CSP, X-Frame-Options, HSTS, X-Content-Type-Options, etc. |
| Rate Limiting | 50 evaluate/dia, 20 generate/dia, 30 transcribe/dia, 40 followup/dia |
| Brute Force | 10 tentativas / 15min por IP, bloqueio de 15min |
| Anti-enumeração | Mesma mensagem para email existente/inexistente |
| Magic bytes | Valida conteúdo real do arquivo, não só MIME type |
| CSRF | Validação de Origin em todos os POSTs de API |
| Sentry | Tunnel via /monitoring, captura erros em produção |
| Logger | JSON estruturado com userId, endpoint, duração |
| Zero TS errors | ignoreBuildErrors removido, build 100% type-safe |
| Zero vulnerabilidades | npm audit limpo |
| Supabase Auth | Email verification, secure email/password change, min 8 chars |
| usage_logs | Rastreia todas as chamadas de IA por usuário |

---

## Padrões e Decisões Técnicas

### IA
- Provider: Groq (gratuito, llama-3.3-70b-versatile)
- Fallback: Gemini, OpenAI (via OPENAI_BASE_URL)
- Todos os prompts retornam JSON — `response_format: { type: 'json_object' }`
- Prompts em PT-BR por padrão

### Auth
- `@supabase/ssr` com cookies em Server Components
- Middleware faz refresh automático da sessão
- Cookies setados na resposta de redirect (não no request)

### Sentry
- Wizard instalado: gera `instrumentation-client.ts`, `instrumentation.ts`, `global-error.tsx`
- Tunnel via `app/monitoring/route.ts` (sempre retorna 200, fire-and-forget)
- `instrumentation-client.ts` tem `tunnel: '/monitoring'` — NÃO remover
- `sentry.client.config.ts` existe mas é redundante — wizard usa `instrumentation-client.ts`
- NUNCA adicionar `enableLogs: true` ao Sentry init — tipo não existe

### Idioma
- `useSettingsStore()` retorna `language: 'en' | 'pt'`
- `useT()` retorna `typeof translations['en']` (cast explícito para compatibilidade)
- Para comparações de idioma na UI: usar `const { language } = useSettingsStore()`, nunca `t.common.language`

### Tipos
- `Language = 'en' | 'pt'` definido em `lib/supabase/types.ts`
- Quando precisar passar language como string e depois usar como Language: cast com `as 'en' | 'pt'`

---

## O Que Está Pendente

### Testes (próximo passo)
- **Vitest** — testes unitários para: `brute-force.ts`, `rate-limit.ts`, `file-validation.ts`, `spaced-repetition.service.ts`
- **Playwright** — E2E para: cadastro → login → gerar questão → avaliar resposta
- Testes de contrato dos prompts de IA (validar schema JSON retornado)

### Features Planejadas (por prioridade)
1. **Live Coding Simulator** — Monaco Editor, desafios cronometrados, avaliação de IA
2. **Daily Learning Loop** — rotina diária automática, streak de dias
3. **Study Tracker** — trilhas de estudo com subtópicos e progresso
4. **AI Summarizer** — resumo de artigos/docs + card de flashcard automático
5. **Quiz Mode** — múltipla escolha, completar código, encontrar bug
6. **Notebook com IA inline** — markdown com IA contextual
7. **OAuth Google/GitHub** — reduzir atrito no cadastro

### Antes de Abrir para Outros Usuários
- Supabase Pro ($25/mês) — remove pausa automática após 7 dias sem acesso
- Vercel Pro ($20/mês) — timeout de 60s nas functions (atual: 10s)
- Streaming nas respostas de IA — resolve timeout do Vercel no plano atual
- Sistema de quotas por plano (gratuito vs pago)
- Página de landing pública

---

## Armadilhas Conhecidas

1. **Sentry tunnel** — `app/monitoring/route.ts` deve sempre retornar 200. Nunca propagar status da resposta do Sentry de volta ao SDK.

2. **instrumentation-client.ts** — gerado pelo wizard, tem `tunnel: '/monitoring'`. Se o wizard for rodado novamente, verificar se o tunnel ainda está lá.

3. **next.config.js** — o wizard do Sentry tende a duplicar `withSentryConfig`. Se aparecer `SyntaxError: Identifier already declared`, é duplicata.

4. **Supabase upsert com índice parcial** — `onConflict` não funciona com índices parciais via PostgREST. Usar check-then-update/insert manual (veja `app/api/documents/route.ts`).

5. **Web Speech API** — bloqueada por firewall em algumas redes (onerror: network). Solução: MediaRecorder + Groq Whisper via `/api/ai/transcribe`.

6. **Vercel timeout 10s** — chamadas de IA longas podem exceder no plano Hobby. Solução futura: streaming.

7. **Supabase pausa automática** — projetos gratuitos pausam após 7 dias sem acesso. Upgrade para Pro antes de abrir para usuários.
