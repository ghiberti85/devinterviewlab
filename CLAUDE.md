# CLAUDE.md — DevInterviewLab

Guia operacional para o Claude Code neste repositório.
Leia o `CONTEXT.md` para arquitetura completa, schema do banco e decisões técnicas.

---

## Comandos essenciais

```bash
npm run dev           # servidor de desenvolvimento
npm run build         # build de produção (deve passar limpo)
npm run lint          # ESLint via next lint
npm test              # Vitest (unit tests em __tests__/unit/)
npx tsc --noEmit      # verificação TypeScript — zero erros obrigatório
```

**Slash commands disponíveis:**
- `/check` — roda tsc + lint + tests (pré-commit)
- `/new-feature <nome>` — scaffold de nova feature
- `/new-table <nome>` — checklist de nova tabela Supabase
- `/pr-ready` — checklist completo antes de abrir PR

---

## Stack (resumo rápido)

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth + DB | Supabase — projeto `idgpscsnbgszhwvhtedy`, região `sa-east-1` |
| IA | Groq `llama-3.3-70b-versatile` via `lib/ai/ai.service.ts` |
| Estado servidor | React Query — hooks em `features/<domain>/hooks/` |
| Estado cliente | Zustand — `useSessionStore` (timer), `useSettingsStore` (idioma/tema) |
| UI | Tailwind CSS + Radix UI — componentes em `components/` |
| Monitoramento | Sentry (tunnel via `/monitoring`) |
| Testes | Vitest (`__tests__/unit/`) |

---

## Workflow obrigatório

### Antes de qualquer alteração
1. Leia os arquivos relevantes — nunca assuma o conteúdo
2. Rode `npx tsc --noEmit` para confirmar estado inicial limpo
3. Entenda o impacto em outros arquivos

### A cada alteração de código (obrigatório antes do commit)
```bash
npm test              # todos os 247 testes devem passar — zero falhas toleradas
npx tsc --noEmit      # zero erros de tipo
```

> **Regra:** se o seu código quebra um teste existente, corrija o teste **ou** o código antes de continuar.
> Se criou um módulo novo com lógica pura (sem Supabase/IA), adicione testes unitários em `__tests__/unit/`.

### A cada entrega
1. `npm test` — zero falhas
2. `npx tsc --noEmit` — zero erros
3. `npm run build` — build limpo
4. **Atualizar toda a documentação do projeto** (obrigatório):
   - `CONTEXT.md` — arquitetura, schema, estrutura de arquivos, funcionalidades, testes
   - `CLAUDE.md` — contagem de testes, regras ou restrições que mudaram
   - `README.md` — features, stack, comandos, cobertura de testes
5. Commit seguindo Conventional Commits em português
6. Push para o branch correto

> **Regra de documentação:** toda implementação bem-sucedida deve deixar os três arquivos (`CONTEXT.md`, `CLAUDE.md`, `README.md`) sincronizados com o estado real do projeto. Nunca commitar código sem atualizar a documentação correspondente.

> Atalho: use `/check` para rodar tsc + lint + tests de uma vez.

### Padrão de commit
```
feat: adicionar Live Coding Simulator
fix: corrigir timeout na avaliação de respostas longas
test: adicionar cobertura para brute-force.ts
security: validar magic bytes no upload
refactor: extrair lógica SM-2 para hook separado
docs: atualizar CONTEXT.md
```

---

## Regras de código

### TypeScript
- Zero erros — `ignoreBuildErrors` foi removido intencionalmente
- Nunca `any` implícito — tipagem explícita sempre
- Idioma na UI: `const { language } = useSettingsStore()` — nunca `t.common.language`
- Cast quando necessário: `language as 'en' | 'pt'`
- `useT()` retorna `typeof translations['en']` — EN e PT são compatíveis

### Componentes
- `'use client'` obrigatório quando o componente usa hooks
- Server Components apenas para páginas sem estado ou interatividade
- Nunca hardcodar strings — sempre via `useT()` + `translations.ts`

### API Routes
```typescript
// Estrutura mínima de toda rota protegida
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const rl = await checkRateLimit('endpoint-name')
if (!rl.allowed) return rl.response
```
- Erros: `sanitizeError()` em produção
- Logs: `logger.info/warn/error()` — nunca `console.log`
- Nunca expor detalhes internos do Supabase ou da IA

### Banco de dados
- RLS habilitado em todas as tabelas — nunca usar service role key no client
- Nunca `.upsert()` com índices parciais — usar check-then-update/insert manual
- Subqueries no `.in()` não funcionam no Supabase — duas queries separadas

### Sentry (armadilhas conhecidas)
- `instrumentation-client.ts` DEVE ter `tunnel: '/monitoring'` — nunca remover
- `app/monitoring/route.ts` DEVE sempre retornar 200 — nunca propagar status
- Nunca `enableLogs: true` no `Sentry.init()` — tipo não existe
- Wizard do Sentry tende a duplicar `withSentryConfig` no `next.config.js`

---

## Arquitetura de features

### Padrão de estrutura
```
features/<nome>/
  components/   # componentes React
  hooks/        # hooks React Query

app/(app)/<nome>/page.tsx    # página protegida
app/api/<nome>/route.ts      # API route
```

### Adicionando tradução
1. Adicionar strings em `lib/i18n/translations.ts` — EN **e** PT juntos, nunca só um
2. Usar com `const t = useT()` no componente

### Adicionando nova tabela
1. Migration em `supabase/migrations/`
2. `ALTER TABLE <tabela> ENABLE ROW LEVEL SECURITY`
3. Políticas USING + WITH CHECK para SELECT, INSERT, UPDATE, DELETE
4. Índices em FKs e colunas mais consultadas
5. Tipo em `lib/supabase/types.ts`

---

## Restrições — confirmar com o usuário antes de executar

- Alterar schema do banco em produção sem migration testada
- Remover funcionalidades existentes
- Mudar modelo de IA padrão (`llama-3.3-70b-versatile`)
- Alterar políticas de RLS
- Push para `main` em vez do branch de feature

---

## Limitações da infraestrutura

| Item | Limitação |
|---|---|
| Vercel Hobby | Timeout de 10s nas Serverless Functions |
| Supabase Free | Pausa após 7 dias sem acesso |
| Groq Free | 6k tokens/min, 500k tokens/dia |
| Sentry Free | 5k erros/mês |

**Antes de abrir para outros usuários:** implementar streaming nas rotas de IA, Supabase Pro, sistema de quotas, landing page, OAuth Google/GitHub.

---

## Referências rápidas

**Supabase (server):**
```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
```

**Rate limit:**
```typescript
import { checkRateLimit, logUsage, sanitizeError } from '@/lib/api/rate-limit'
const rl = await checkRateLimit('endpoint-name')
if (!rl.allowed) return rl.response
```

**Tradução:**
```typescript
import { useT } from '@/lib/i18n/useT'
import { useSettingsStore } from '@/store/settings.store'
const t = useT()
const { language } = useSettingsStore()
```

**Logger:**
```typescript
import { logger } from '@/lib/logger'
logger.info('mensagem', { userId, endpoint })
logger.error('erro', err, { userId })
```

**Validação de arquivo:**
```typescript
import { validateFileBuffer } from '@/lib/file-validation'
const result = validateFileBuffer(buffer, file.type, 10 * 1024 * 1024)
if (!result.valid) return NextResponse.json({ error: result.error }, { status: 400 })
```

---

## Próximas features (por prioridade)

1. **Live Coding Simulator** — Monaco Editor, timer 15/30/45min, avaliação de IA estática, tabela `coding_sessions`
2. **Daily Learning Loop** — widget no dashboard, streak de dias (nova coluna em `profiles`)
3. **Streaming nas respostas de IA** — `ReadableStream`, resolve timeout do Vercel Hobby
4. **Testes E2E (Playwright)** — cadastro → login → gerar questão → avaliar → flashcard
5. **OAuth Google/GitHub** — reduzir atrito no cadastro
