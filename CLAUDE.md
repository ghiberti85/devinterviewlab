# CLAUDE.md — DevInterviewLab

Guia operacional para o Claude Code neste repositório.

| Documento | Conteúdo |
|---|---|
| `CONTEXT.md` | Arquitetura completa, schema do banco, estrutura de arquivos |
| `DECISIONS.md` | Por que cada decisão técnica foi tomada — **leia antes de reverter algo** |
| `KNOWN_ISSUES.md` | Gotchas, armadilhas e workarounds ativos — **leia antes de "corrigir" algo** |
| `PROMPTS.md` | Catálogo de todos os prompts de IA: input, output, token budget, restrições |

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
| Testes | Vitest (`__tests__/unit/`) — **262 testes, zero falhas toleradas** |
| CI | GitHub Actions (`.github/workflows/ci.yml`) — bloqueia merge se CI falhar |

---

## Workflow obrigatório

### Antes de qualquer alteração
1. Leia os arquivos relevantes — nunca assuma o conteúdo
2. Rode `npx tsc --noEmit` para confirmar estado inicial limpo
3. Entenda o impacto em outros arquivos

### A cada alteração de código — obrigatório antes do commit
```bash
npm test              # 262 testes devem passar — zero falhas toleradas
npx tsc --noEmit      # zero erros de tipo
npm run lint          # zero warnings
```

> **Regra de testes:** se o código quebra um teste existente, corrija o teste **ou** o código antes de continuar.
> Se criou um módulo com lógica pura (sem Supabase/IA), **adicione testes unitários** em `__tests__/unit/`.
> Cada nova feature deve ter pelo menos um teste cobrindo o caminho feliz e um caso de borda.

### Workflow de PR — sempre seguir este fluxo
1. Desenvolver em branch de feature (`feat/nome`, `fix/nome`, `refactor/nome`)
2. Rodar `/check` antes de fazer push
3. Abrir Pull Request para `main`
4. CI roda automaticamente (TypeScript + Lint + Tests + Build)
5. **Merge apenas com CI verde** — nunca fazer merge com CI falhando
6. Merge dispara deploy automático no Vercel
7. Verificar deploy em produção após merge

### A cada entrega
1. `npm test` — zero falhas
2. `npx tsc --noEmit` — zero erros
3. `npm run build` — build limpo
4. **Atualizar toda a documentação do projeto** (obrigatório):
   - `CONTEXT.md` — arquitetura, schema, estrutura de arquivos, funcionalidades, testes
   - `CLAUDE.md` — contagem de testes, regras ou restrições que mudaram
   - `README.md` — features, stack, comandos, cobertura de testes
5. Commit seguindo Conventional Commits em português
6. Push e abrir PR

> **Regra de documentação:** toda implementação bem-sucedida deve deixar os três arquivos (`CONTEXT.md`, `CLAUDE.md`, `README.md`) sincronizados com o estado real do projeto. Nunca commitar código sem atualizar a documentação.

> **Regra de limpeza:** ao remover uma feature, remover também rotas de API, hooks, componentes, traduções e testes relacionados. Deixar o código enxuto.

> Atalho: use `/check` para rodar tsc + lint + tests de uma vez.

### Padrão de commit
```
feat: adicionar geração de questões por roadmap com progresso
fix: corrigir timeout na avaliação de respostas longas
test: adicionar cobertura para roadmap-questions
security: validar magic bytes no upload
refactor: extrair lógica SM-2 para hook separado
docs: atualizar CONTEXT.md com tabela roadmap_questions
ci: adicionar GitHub Actions para TypeScript e testes
```

---

## Regra de idioma — obrigatória em toda a UI

> **O app tem um idioma ativo (EN ou PT) lido via `useSettingsStore().language`.
> Todo conteúdo exibido ao usuário DEVE estar no idioma ativo.
> Nunca exibir conteúdo misto (parte em EN, parte em PT) na mesma tela.**

Aplicar em todo lugar que exibe dados do banco com campo `language`:

```typescript
const { language } = useSettingsStore()

// Questões de roadmap
const filtered = questions.filter(q => q.language === language)

// Conceitos
const nodes = allNodes.filter(n => !n.language || n.language === language)

// Tópicos — já tratado via useTopics(language) que agrupa em pares EN/PT
```

**Checklist ao criar qualquer componente que exibe dados com idioma:**
- [ ] Busca ou filtra por `language` antes de renderizar
- [ ] O dropdown/filtro de tópicos também filtra por idioma (para não mostrar tópicos sem questões no idioma atual)
- [ ] Contadores e estatísticas contam apenas itens no idioma atual

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

### API Routes — estrutura mínima obrigatória
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const rl = await checkRateLimit('endpoint-name')
if (!rl.allowed) return rl.response
```
- Erros: `sanitizeError()` em produção — nunca expor stack traces
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

## Segurança — regras obrigatórias

> Toda nova rota de API deve satisfazer **todos** estes requisitos antes de ir para produção.

| Requisito | Como implementar |
|---|---|
| Autenticação | `supabase.auth.getUser()` + retornar 401 se não autenticado |
| Rate limiting | `checkRateLimit('endpoint-name')` antes de qualquer processamento |
| Erros sanitizados | `sanitizeError(error)` em produção — nunca expor mensagens internas |
| RLS no banco | Todas as queries filtram por `user_id` E têm política RLS |
| Uploads | `validateFileBuffer()` verifica magic bytes, MIME e tamanho |
| Inputs | Nunca confiar em dados do cliente — validar tipo, tamanho e domínio |
| Secrets | Nunca commitar `.env*` — usar Vercel Environment Variables |
| Logs | `logger.info/error()` com userId — sem dados sensíveis nos logs |
| CORS | Validar `Origin` em POSTs — middleware de segurança já configurado |

**Checklist de segurança para cada PR:**
- [ ] Rota tem `getUser()` + 401 se não autenticado
- [ ] Rota tem `checkRateLimit()` antes de IA ou operações custosas
- [ ] Erros usam `sanitizeError()` antes de retornar ao cliente
- [ ] Nenhum `console.log` com dados do usuário
- [ ] Nenhum secret hardcoded ou exposto no client bundle

---

## Testes — regras e padrões

### Quando adicionar testes
- **Obrigatório:** todo módulo em `lib/` com lógica pura (funções, serviços, utilitários)
- **Obrigatório:** todo prompt de IA (`lib/ai/prompts/`) — testar EN, PT, schema JSON, edge cases
- **Opcional mas recomendado:** hooks de React Query com mock de fetch

### Estrutura de um teste de qualidade
```typescript
describe('nomeDaFuncao', () => {
  it('caminho feliz — comportamento esperado', () => { ... })
  it('caso de borda — input vazio', () => { ... })
  it('caso de borda — idioma PT', () => { ... })
  it('falha graceful — input inválido', () => { ... })
})
```

### O que testar em prompts de IA
1. Output em EN e PT produzem respostas diferentes
2. Schema JSON correto (campos obrigatórios presentes)
3. Dados do input aparecem no prompt gerado
4. Edge cases: input vazio, campos opcionais ausentes
5. Sem vazamento de dados entre chamadas

### Contagem atual: **262 testes** — atualizar este número a cada PR

---

## Arquitetura de features

### Padrão de estrutura
```
features/<nome>/
  components/   # componentes React
  hooks/        # hooks React Query

app/(app)/<nome>/page.tsx    # página protegida
app/api/<nome>/route.ts      # API route
__tests__/unit/<nome>.test.ts  # testes unitários
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
6. Atualizar `CONTEXT.md` com schema da tabela

### Removendo uma feature
1. Remover página(s) e componentes
2. Remover rota(s) de API
3. Remover hook(s) React Query
4. Remover chaves de tradução em `translations.ts`
5. Remover testes relacionados
6. Atualizar `CONTEXT.md`, `CLAUDE.md`, `README.md`

---

## Restrições — confirmar com o usuário antes de executar

- Alterar schema do banco em produção sem migration testada
- Remover funcionalidades existentes
- Mudar modelo de IA padrão (`llama-3.3-70b-versatile`)
- Alterar políticas de RLS
- Push direto para `main` sem PR
- Force push em qualquer branch

---

## Limitações da infraestrutura

| Item | Limitação |
|---|---|
| Vercel Hobby | Timeout de 10s nas Serverless Functions |
| Supabase Free | Pausa após 7 dias sem acesso |
| Groq Free | 6k tokens/min, 500k tokens/dia |
| Sentry Free | 5k erros/mês |

**Antes de abrir para outros usuários:** streaming nas rotas de IA, Supabase Pro, sistema de quotas, landing page, OAuth Google/GitHub.

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
import { checkRateLimit, sanitizeError } from '@/lib/api/rate-limit'
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

1. **Streaming nas respostas de IA** — `ReadableStream`, resolve timeout do Vercel Hobby
2. **OAuth Google/GitHub** — reduzir atrito no cadastro
3. **Testes E2E completos (Playwright)** — cadastro → login → gerar questão → avaliar → flashcard
4. **Quiz Mode** — múltipla escolha, completar código, encontrar bug
5. **Mock Interview Bidirecional** — entrevistador IA com voz em tempo real
