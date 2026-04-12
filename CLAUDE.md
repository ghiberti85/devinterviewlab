# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Instruções para o Claude Code — DevInterviewLab

## Commands

```bash
npm run dev           # Start dev server (Next.js)
npm run build         # Production build
npm run lint          # ESLint via next lint
npx tsc --noEmit      # TypeScript check (must pass before every commit)
```

There is no test suite configured yet (Vitest setup is a planned next step).

---

## Leitura Obrigatória

Antes de qualquer tarefa, leia o `CONTEXT.md` na raiz do projeto.
Ele contém a arquitetura completa, decisões técnicas, armadilhas conhecidas e o que está pendente.

---

## Stack

- **Framework**: Next.js 15 (App Router) — `app/(auth)/` for unauthenticated, `app/(app)/` for authenticated (server-enforced redirect)
- **Database + Auth**: Supabase (PostgreSQL + RLS) — project `idgpscsnbgszhwvhtedy`, region `sa-east-1`
- **AI**: OpenAI-compatible API via `lib/ai/ai.service.ts` — works with Groq (free), Gemini (free), or OpenAI (paid)
- **Server state**: React Query — hooks live in `features/<domain>/hooks/`
- **Client state**: Zustand — `useSessionStore` (practice timer), `useSettingsStore` (language/theme)
- **UI**: Tailwind CSS + Radix UI primitives, shared components in `components/`
- **Charts**: Recharts; **Graph**: React Flow

---

## Fluxo de Trabalho

### Antes de qualquer alteração

1. Leia os arquivos relevantes para a tarefa — nunca assuma o conteúdo
2. Rode `npx tsc --noEmit` para confirmar que não há erros TypeScript antes de começar
3. Entenda o impacto da mudança em outros arquivos

### A cada entrega

1. Rode `npx tsc --noEmit` — zero erros é obrigatório
2. Rode `npm run build` — build deve passar limpo
3. Faça commit com mensagem descritiva seguindo Conventional Commits
4. Faça push para `origin main`

### Padrão de commit

```
tipo: descrição curta em português

Exemplos:
feat: adicionar Live Coding Simulator com Monaco Editor
fix: corrigir timeout na avaliação de respostas longas
test: adicionar testes unitários para brute-force.ts
security: adicionar validação de magic bytes no upload
refactor: extrair lógica de SM-2 para hook separado
docs: atualizar CONTEXT.md com novas funcionalidades
```

---

## Regras de Código

### TypeScript

- Zero erros TypeScript — `ignoreBuildErrors` foi removido intencionalmente
- Nunca usar `any` implícito — sempre tipar explicitamente
- Para comparações de idioma na UI: usar `const { language } = useSettingsStore()`, NUNCA `t.common.language`
- Cast de language quando necessário: `language as 'en' | 'pt'`
- `useT()` retorna `typeof translations['en']` — ambos EN e PT são compatíveis

### Componentes

- Todos os componentes de UI são Client Components (`'use client'`) quando usam hooks
- Server Components apenas para páginas que não precisam de estado ou interatividade
- Tradução: sempre usar `useT()` + `useSettingsStore()` para textos da UI
- Nunca hardcodar strings em PT ou EN — sempre via `translations.ts`

### API Routes

- Toda rota protegida começa com verificação de auth via `createClient()` + `supabase.auth.getUser()`
- Rotas de IA devem usar `checkRateLimit()` de `lib/api/rate-limit.ts`
- Erros devem ser sanitizados com `sanitizeError()` em produção
- Logar com `logger.info/warn/error()` de `lib/logger.ts`
- Nunca expor detalhes internos do Supabase ou da IA nas respostas de erro

### Banco de dados

- RLS está habilitado em todas as tabelas — nunca usar service role key no client
- Nunca usar `.upsert()` com índices parciais — usar check-then-update/insert
- Subqueries no `.in()` do Supabase não funcionam — fazer duas queries separadas

### Sentry

- `instrumentation-client.ts` DEVE ter `tunnel: '/monitoring'` — nunca remover
- `app/monitoring/route.ts` DEVE sempre retornar 200 — nunca propagar status do Sentry
- Nunca adicionar `enableLogs: true` ao `Sentry.init()` — o tipo não existe
- Se rodar o wizard do Sentry novamente: verificar se criou duplicata no `next.config.js`

---

## Arquitetura de Features Novas

### Padrão para nova feature

```
features/
  nova-feature/
    components/   # componentes React da feature
    hooks/        # hooks de dados (React Query)

app/(app)/nova-feature/page.tsx   # página
app/api/nova-feature/route.ts     # API route
```

### Adicionando tradução

1. Adicionar strings em `lib/i18n/translations.ts` nos dois idiomas (en e pt)
2. Usar via `const t = useT()` no componente

### Adicionando nova tabela

1. Criar migration em `supabase/migrations/`
2. Habilitar RLS na tabela
3. Criar políticas USING + WITH CHECK explícitas
4. Adicionar índices nas colunas de FK e nas mais consultadas
5. Adicionar tipo em `lib/supabase/types.ts`

---

## Próximas Features (por prioridade)

### 1. Testes Unitários (Vitest)

Criar testes para funções puras sem dependências externas:

- `lib/api/brute-force.ts`
- `lib/api/rate-limit.ts`
- `lib/file-validation.ts`
- `lib/services/spaced-repetition.service.ts`

Setup: `npm install -D vitest @vitest/ui`
Pasta: `__tests__/unit/`

### 2. Live Coding Simulator

Nova aba na sidebar. Stack:

- Monaco Editor (`@monaco-editor/react`) para o editor de código
- Problema apresentado pela IA baseado no perfil do usuário
- Timer configurável (15/30/45 minutos)
- Avaliação pela IA: complexidade O(n), edge cases, legibilidade, boas práticas
- Sem execução real de código — avaliação estática pela IA
- Salvar tentativas no histórico (nova tabela `coding_sessions`)

### 3. Daily Learning Loop

Widget no Dashboard + página dedicada:

- 1 conceito fraco do grafo para revisar
- 3 flashcards com SM-2 pendentes
- 1 mini-desafio de código
- 1 questão nova gerada da área mais fraca
- Streak de dias consecutivos (nova coluna em `profiles`)

### 4. Testes E2E (Playwright)

Fluxos críticos:

- Cadastro → login → dashboard
- Upload de CV → geração de questões
- Avaliação de resposta → ver feedback
- Prática com flashcard → sessão completa

### 5. Streaming nas respostas de IA

Resolve o timeout de 10s do Vercel Hobby plan.
Usar `ReadableStream` + `StreamingTextResponse` nas rotas de avaliação e geração.
Necessário antes de abrir para outros usuários.

---

## Restrições Importantes

### Nunca fazer sem confirmar com o usuário

- Alterar schema do banco em produção sem migration testada
- Remover funcionalidades existentes
- Mudar o modelo de IA padrão (llama-3.3-70b-versatile)
- Alterar políticas de RLS

### Limitações da infraestrutura atual

- Vercel Hobby: timeout de 10s nas Serverless Functions — evitar operações longas sem streaming
- Supabase Free: pausa após 7 dias sem acesso — ok para uso pessoal
- Groq Free: 6k tokens/min, 500k tokens/dia — monitorar via usage_logs
- Sentry Free: 5k erros/mês

### Antes de abrir para outros usuários

- Implementar streaming nas rotas de IA
- Upgrade Supabase Pro ($25/mês)
- Sistema de quotas por usuário (tabela usage_logs já existe)
- Página de landing pública
- OAuth Google/GitHub

---

## Referências Rápidas

**Criar cliente Supabase (server):**

```typescript
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();
```

**Verificar rate limit:**

```typescript
import { checkRateLimit, logUsage, sanitizeError } from "@/lib/api/rate-limit";
const rl = await checkRateLimit("nome-do-endpoint");
if (!rl.allowed) return rl.response;
```

**Tradução em componente:**

```typescript
import { useT } from "@/lib/i18n/useT";
import { useSettingsStore } from "@/store/settings.store";
const t = useT();
const { language } = useSettingsStore();
```

**Logger:**

```typescript
import { logger } from "@/lib/logger";
logger.info("mensagem", { userId, endpoint });
logger.error("erro", err, { userId });
```

**Validar arquivo:**

```typescript
import { validateFileBuffer } from "@/lib/file-validation";
const result = validateFileBuffer(buffer, file.type, 10 * 1024 * 1024);
if (!result.valid)
  return NextResponse.json({ error: result.error }, { status: 400 });
```
