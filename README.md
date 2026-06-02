# DevInterviewLab

> Plataforma pessoal de prática para entrevistas técnicas alimentada por IA — geração de questões, simulação de entrevistas, live coding, flashcards e roadmap de estudo personalizados.

**Live:** [devinterviewlab.vercel.app](https://devinterviewlab.vercel.app)  
**CI:** ![Tests](https://img.shields.io/badge/tests-290%20passing-brightgreen) ![TypeScript](https://img.shields.io/badge/TypeScript-zero%20errors-blue) ![Deploy](https://img.shields.io/badge/deploy-Vercel-black)

---

## O que é

DevInterviewLab é uma plataforma full-stack de estudos para entrevistas técnicas que usa IA para criar um ciclo completo de prática: gerar questões por roadmap personalizado, simular entrevistas com feedback detalhado, praticar live coding com pair programmer socrático, revisar conceitos com flashcards por repetição espaçada e acompanhar a evolução com métricas visuais.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router, Server + Client Components) |
| Linguagem | TypeScript — zero erros, sem `ignoreBuildErrors` |
| Auth + DB | Supabase (PostgreSQL + RLS + Auth) |
| IA | Groq `llama-3.3-70b-versatile` via OpenAI-compatible API |
| Estado servidor | React Query (@tanstack/react-query) |
| Estado cliente | Zustand |
| UI | Tailwind CSS + Radix UI + Lucide React |
| Editor | Monaco Editor (desktop) / textarea fallback (mobile) |
| Gráficos | Recharts |
| Grafos | React Flow |
| Monitoramento | Sentry (tunnel via `/monitoring`) |
| Testes | Vitest — 290 testes unitários |
| CI/CD | GitHub Actions + Vercel (deploy automático ao merge na `main`) |

---

## Funcionalidades

### Plano de Estudos
- **Roadmap personalizado** — upload de CV + descrição da vaga gera análise de gap e roadmap 30/60/90 dias
- **Geração de questões por tópico** — Q&A teóricas e live coding geradas por IA para cada tópico do roadmap, em EN e PT, sem repetição ao regerar
- **Links diretos** — botão "Practice" de cada tópico abre a aba Questões já filtrada pelo tópico

### Revisão
- **Questões por roadmap** — aba padrão com filtro por tópico, geração de conceitos a partir de questões, delete em lote
- **Flash Topics (Conceitos)** — referências técnicas rápidas com resumo, quando usar, prós & contras (accordion), Q&A integrado e tradução EN↔PT persistida
- **Flashcards SM-2** — repetição espaçada com Easiness Factor adaptativo

### Simulação
- **AI Interview Coach** — avaliação por dimensão (correção, completude, clareza, profundidade) com réplica e tréplica
- **Live Coding Simulator** — 7 linguagens, timer configurável, Pair Programmer socrático com dicas on-demand, idle detection

### Estatísticas
- Cards de questões por tipo (Total / Teórica / Live Coding) por roadmap
- Gráfico de barras de questões por tópico — responsivo, sem scroll lateral

### Experiência
- **PWA** — instalável, bottom tab bar mobile, safe-area iOS
- **i18n** — EN e PT-BR completos, sincronizado com banco de dados
- **Tema** — claro/escuro

---

## Arquitetura

```
app/
  (app)/          # rotas protegidas (layout com auth)
    plano/        # roadmap + geração de questões
    revisar/      # questões, conceitos, flashcards
    simular/      # interview coach + live coding
    stats/        # métricas e gráficos
  api/            # route handlers (Next.js App Router)
features/         # lógica de domínio (hooks React Query + componentes)
lib/
  ai/             # ai.service.ts + prompts/
  i18n/           # translations.ts + useT()
  supabase/       # client server/browser + types
  api/            # rate-limit, brute-force, logger
store/            # zustand stores
__tests__/unit/   # 290 testes Vitest
```

---

## Segurança

Toda rota de API segue o checklist:

| Item | Implementação |
|---|---|
| Autenticação | `supabase.auth.getUser()` → 401 se não autenticado |
| Rate limiting | `checkRateLimit('endpoint')` antes de qualquer IA |
| Erros sanitizados | `sanitizeError()` — sem stack traces ao client |
| RLS | Todas as 18 tabelas com policies USING + WITH CHECK |
| Uploads | `validateFileBuffer()` — magic bytes + MIME + tamanho |
| Brute force | 10 tentativas / 15 min por IP |
| CSRF | Validação de Origin em todos os POSTs |
| Security headers | CSP, HSTS, X-Frame-Options, X-Content-Type-Options |

---

## Testes

```bash
npm test                # 290 testes unitários (Vitest)
npm run test:coverage   # com relatório de cobertura
```

| Arquivo de teste | Testes | Cobertura |
|---|---|---|
| `brute-force.test.ts` | 14 | Bloqueio por IP, janela deslizante, reset |
| `rate-limit.test.ts` | 13 | checkRateLimit por endpoint |
| `file-validation.test.ts` | 10 | Magic bytes, MIME, tamanho |
| `spaced-repetition.test.ts` | 25 | SM-2 completo: EF, intervalos, reset |
| `prompts.test.ts` | 63 | Evaluate, behavioral, followup — EN/PT, schema |
| `generate-prompts.test.ts` | 32 | Generate, coding-hint, cn() |
| `stream.test.ts` | 9 | ndjsonStream + readNdjsonStream |
| `interview-payload.test.ts` | 5 | Serialização com transcript |
| `score-card-utils.test.ts` | 6 | aggregateRadar, averageScore |
| `roadmap-prompt.test.ts` | 6 | Idioma, truncagem, schema JSON |
| `topic-prompt.test.ts` | 23 | getTopicSystemPrompt, topicAnalysisPrompt, topicTranslatePrompt |
| `topic-pairs.test.ts` | 10 | groupIntoPairs — pares, fallback, ordenação |
| `score-card-prompt.test.ts` | 11 | EN/PT, JSON-only, strengths/gaps |
| `coding-generate-prompt.test.ts` | 13 | Dificuldade, tópico, linguagem, fallbacks |
| `roadmap-questions-prompt.test.ts` | 28 | fixJsonNewlines, safeParseJSON, prompts teórico e live coding |

**Cobertura:** Statements 97% · Branches 90% · Functions 100% · Lines 98%

---

## Como rodar localmente

```bash
npm install
cp .env.example .env.local
# preencher variáveis abaixo
npm run dev
```

### Variáveis de ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://idgpscsnbgszhwvhtedy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key do Supabase dashboard>

# Groq (free tier) — https://console.groq.com
OPENAI_API_KEY=gsk_...
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=llama-3.3-70b-versatile

SENTRY_DSN=<opcional>
NEXT_PUBLIC_SENTRY_DSN=<opcional>
```

### Migrations Supabase

```bash
# Aplicar em ordem crescente
supabase db push   # ou aplicar manualmente via Supabase dashboard
```

---

## Comandos

```bash
npm run dev        # servidor de desenvolvimento (localhost:3000)
npm run build      # build de produção (deve passar sem erros)
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript — zero erros obrigatório
npm test           # 290 testes unitários
```

---

## CI/CD

Todo push e PR executa automaticamente:

1. `npx tsc --noEmit` — zero erros TypeScript
2. `npm run lint` — zero warnings ESLint
3. `npm test` — todos os testes devem passar
4. `npm run build` — build de produção limpo

**Merge bloqueado se qualquer check falhar.**  
Merge na `main` → deploy automático no Vercel.

---

## Contribuindo

```bash
git checkout -b feat/nome-da-feature
# desenvolver...
npx tsc --noEmit && npm test   # ou /check no Claude Code
git push origin feat/nome-da-feature
# abrir Pull Request → CI roda automaticamente
```

---

## Autor

**Fernando Ghiberti** — [github.com/ghiberti85](https://github.com/ghiberti85)
