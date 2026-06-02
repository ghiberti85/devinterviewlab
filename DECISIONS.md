# DECISIONS.md — Architecture Decision Records

Registro das decisões técnicas significativas tomadas no projeto.
Antes de reverter qualquer uma dessas decisões, leia o contexto completo aqui.

---

## ADR-001 — Groq em vez de OpenAI diretamente

**Status:** Ativo  
**Data:** 2025-05

**Contexto:** Precisávamos de um provedor de LLM para o projeto pessoal sem custo operacional inicial.

**Decisão:** Usar Groq com `llama-3.3-70b-versatile` via API compatível com OpenAI.

**Motivos:**
- Free tier generoso (6k tokens/min, 500k tokens/dia) — suficiente para uso pessoal
- Latência muito baixa (inferência em hardware dedicado)
- API 100% compatível com OpenAI SDK — troca de provedor é só mudar `baseURL` e `apiKey`

**Consequências:** O modelo não é `gpt-4o`, então comportamentos que dependem de capacidades específicas do GPT podem diferir. A variável `OPENAI_API_KEY` contém a chave Groq por compatibilidade — não renomear sem atualizar todos os `process.env.OPENAI_API_KEY`.

**Não reverter porque:** A abstração `getModel()` em `ai.service.ts` já suporta Groq, Gemini e OpenAI via env vars. Trocar de provedor não exige mudança de código.

---

## ADR-002 — Orquestração de geração de questões no client, não no server

**Status:** Ativo  
**Data:** 2026-05

**Contexto:** A geração de questões para todos os tópicos de um roadmap em um único POST excedia o timeout de 10s do Vercel Hobby.

**Decisão:** O client faz DELETE (limpar) + loop de POSTs individuais (um por tópico), rastreando progresso localmente.

**Motivos:**
- Cada chamada individual cabe confortavelmente em 10s
- O client exibe progresso real (X/N tópicos) com barra de porcentagem
- Falhas por tópico são isoladas — não perdem o trabalho já feito nos anteriores
- Sem custo adicional de infraestrutura

**Consequências:** A rota `POST /api/roadmaps/[id]/generate-questions` gera questões para **um tópico** por chamada. Não é um bug — é intencional. Não "otimizar" para bulk no server sem primeiro resolver o timeout.

**Não reverter porque:** Bulk no server voltaria a timeout em roadmaps com 6+ tópicos.

---

## ADR-003 — Vitest em vez de Jest

**Status:** Ativo  
**Data:** 2025

**Contexto:** Next.js 15 com App Router usa módulos ES nativos. Jest exige configuração complexa de transformação para ESM.

**Decisão:** Vitest, que tem suporte nativo a ESM e API compatível com Jest.

**Motivos:**
- Zero configuração para ESM — funciona out-of-the-box com Next.js 15
- API idêntica ao Jest (`describe`, `it`, `expect`, `vi.mock`) — curva zero
- Mais rápido em watch mode

**Não reverter porque:** Migrar de volta para Jest exigiria configuração de transform para cada import de módulo ES do Next.js e de pacotes da stack.

---

## ADR-004 — Client-side state com Zustand (não Context API nem Redux)

**Status:** Ativo  
**Data:** 2025

**Contexto:** Precisávamos de estado global para configurações (idioma, tema) e timer de sessão de live coding.

**Decisão:** Zustand com dois stores: `useSettingsStore` (idioma + tema) e `useSessionStore` (timer).

**Motivos:**
- Bundle mínimo (~1kb gzip)
- Sem Provider wrapper — pode ser lido fora de componentes React
- Persistência com `localStorage` via middleware `persist` sem configuração extra

**Não reverter porque:** Context API com performance equivalente exigiria memoização manual; Redux é over-engineering para dois stores simples.

---

## ADR-005 — Server state com React Query (não SWR nem fetch manual)

**Status:** Ativo  
**Data:** 2025

**Contexto:** Precisávamos de cache, invalidação, loading/error states e mutations para dados do Supabase.

**Decisão:** `@tanstack/react-query` com hooks por domínio em `features/<domain>/hooks/`.

**Motivos:**
- Invalidação por query key — um `useMutation` invalida exatamente o cache afetado
- Deduplica requests automático — dois componentes usando o mesmo hook fazem uma requisição só
- `staleTime` configurável por query — controle fino de revalidação

**Padrão estabelecido:** Cada feature tem seus hooks em `features/<nome>/hooks/`. Nunca fazer fetch dentro de componentes diretamente.

---

## ADR-006 — RLS habilitado em todas as tabelas, sem exceção

**Status:** Ativo  
**Data:** 2025

**Contexto:** Supabase expõe a `anon key` no client bundle. Sem RLS, qualquer usuário poderia ler dados de outros.

**Decisão:** Toda tabela tem `ENABLE ROW LEVEL SECURITY` + políticas explícitas de SELECT, INSERT, UPDATE, DELETE filtradas por `auth.uid() = user_id`.

**Não reverter porque:** Desabilitar RLS em qualquer tabela expõe dados de todos os usuários para qualquer um com a anon key. A anon key está no bundle público.

**Armadilha:** Nunca usar `service_role` key no client — ela bypassa RLS completamente.

---

## ADR-007 — Sem streaming nas respostas de IA (ainda)

**Status:** Pendente implementação  
**Data:** 2026-05

**Contexto:** As respostas de IA usam `await completion` bloqueante, não `ReadableStream`.

**Decisão atual:** Manter sem streaming até o timeout do Vercel ser um problema recorrente em produção.

**Motivo para não implementar agora:**
- Adiciona complexidade considerável (SSE, `TransformStream`, tratamento de parciais no client)
- Groq é rápido o suficiente para respostas ≤ 500 tokens dentro de 10s
- Roadmaps (resposta maior) já foram resolvidos com orquestração no client (ADR-002)

**Quando implementar:** Quando usuários reportarem timeout frequente em avaliações de resposta longa ou na geração de tópicos.

---

## ADR-008 — Sentry com tunnel em `/monitoring`

**Status:** Ativo  
**Data:** 2025

**Contexto:** Ad-blockers bloqueiam requests diretos para `sentry.io`.

**Decisão:** Tunnel via rota própria `/api/monitoring` que repassa para Sentry.

**Regras que NUNCA devem ser removidas:**
1. `instrumentation-client.ts` DEVE ter `tunnel: '/monitoring'`
2. `app/monitoring/route.ts` DEVE sempre retornar status 200 — nunca propagar o status do Sentry
3. Nunca `enableLogs: true` no `Sentry.init()` — o tipo não existe na versão atual

**Não reverter porque:** Sem tunnel, ~40% dos erros de produção não chegam ao Sentry.

---

## ADR-009 — Monaco Editor no desktop, textarea no mobile

**Status:** Ativo  
**Data:** 2025

**Contexto:** Monaco Editor tem bundle de ~2MB e performance inadequada em dispositivos móveis.

**Decisão:** Detectar viewport — Monaco acima de `md` (768px), textarea abaixo.

**Não reverter porque:** Monaco em mobile causava travamentos em dispositivos mid-range testados.

---

## ADR-010 — Nunca `.upsert()` com índice único parcial no Supabase

**Status:** Ativo (workaround permanente)  
**Data:** 2025

**Contexto:** O Supabase/PostgREST tem comportamento imprevisível com `.upsert()` quando o índice único é parcial (i.e., inclui uma cláusula `WHERE`).

**Decisão:** Sempre usar check-then-insert/update manual:
```typescript
const { data: existing } = await supabase.from('tabela').select('id').eq('campo', valor).single()
if (existing) {
  await supabase.from('tabela').update(payload).eq('id', existing.id)
} else {
  await supabase.from('tabela').insert(payload)
}
```

**Não "simplificar" para `.upsert()`** — vai quebrar silenciosamente em casos com índice parcial.

---

## ADR-011 — Geração de questões: sequencial EN→PT, nunca paralela

**Status:** Ativo  
**Data:** 2026-06

**Contexto:** `Promise.all([gerarEN, gerarPT])` para todos os tópicos de um roadmap excede o timeout de 10s do Vercel Hobby. Cada chamada ao Groq leva ~2-4s.

**Decisão:** Gerar EN primeiro (await), depois PT (await). Retornar `{ count: total, perLanguage: en.length }`.

**Não reverter porque:** Paralelo voltaria a timeout em roadmaps com 5+ tópicos.

---

## ADR-012 — safeParseJSON com fallback fixJsonNewlines

**Status:** Ativo  
**Data:** 2026-06

**Contexto:** O modelo Groq/llama às vezes emite newlines literais dentro de strings JSON no campo `code_solution` de questões de live coding. Isso quebra o `JSON.parse` padrão, resultando em silenciosa perda de questões (catch retorna `[]`).

**Decisão:** `safeParseJSON` tenta `JSON.parse` primeiro. Se falhar, chama `fixJsonNewlines` (parser caractere-a-caractere que escapa `\n` e `\r` dentro de strings JSON) e tenta novamente.

**Não simplificar:** O fallback é necessário especificamente para `code_solution`. Remover causa perda silenciosa de questões de live coding.

---

## ADR-013 — URL params para pré-selecionar aba e tópico em /revisar

**Status:** Ativo  
**Data:** 2026-06

**Contexto:** O botão "Practice" de cada tópico no Plano deve abrir a aba Questões no Revisar já filtrada pelo tópico específico.

**Decisão:** Usar query params `?tab=questions&topic=<nome>` na URL. O componente `RevisarPage` lê via `useSearchParams()` e passa `initialTopic` para `QuestionsTab`. O estado é inicializado uma vez, sem sync contínuo com a URL.

**Alternativas descartadas:** `router.push` + estado global (Zustand) criaria acoplamento desnecessário entre páginas. URL params são a forma idiomática em Next.js App Router para estado de navegação.
