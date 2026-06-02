# KNOWN_ISSUES.md — Gotchas, Armadilhas e Workarounds

Este arquivo documenta comportamentos não-óbvios, bugs conhecidos e workarounds ativos.
**Antes de "corrigir" qualquer coisa aqui, confirme com o usuário — pode ser intencional.**

---

## Supabase

### Subqueries no `.in()` não funcionam
```typescript
// ❌ NÃO funciona — o Supabase/PostgREST não suporta subquery no .in()
const { data } = await supabase
  .from('questions')
  .select()
  .in('topic_id', supabase.from('topics').select('id'))

// ✅ Correto — duas queries separadas
const { data: topics } = await supabase.from('topics').select('id').eq('user_id', userId)
const topicIds = topics?.map(t => t.id) ?? []
const { data: questions } = await supabase.from('questions').select().in('topic_id', topicIds)
```

### `.upsert()` com índice parcial é imprevisível
Ver ADR-010 em `DECISIONS.md`. Sempre usar check-then-insert/update manual.

### Supabase Free pausa após 7 dias sem acesso
O projeto `idgpscsnbgszhwvhtedy` (sa-east-1) pausa automaticamente após 7 dias de inatividade no free tier. O primeiro request após a pausa demora ~30s para "acordar" o projeto. Não é um erro da aplicação.

### RLS: política não aparece mas dados somem
Se um INSERT ou SELECT retornar vazio sem erro, verificar se a política RLS está correta. O Supabase retorna resultado vazio (não erro 403) quando RLS bloqueia a operação — silencioso por design.

---

## Sentry

### `enableLogs: true` não existe
O tipo `enableLogs` não existe na versão atual do `@sentry/nextjs`. O wizard do Sentry às vezes sugere essa opção. Não adicionar.

### `withSentryConfig` duplicado no next.config.js
O wizard do Sentry tende a adicionar `withSentryConfig` mesmo quando já existe. Verificar se há duplicação após rodar o wizard — causa erro de build.

### `/monitoring` deve sempre retornar 200
`app/monitoring/route.ts` repassa requests para o Sentry. O status da resposta do Sentry **não deve** ser propagado — sempre retornar 200. Se o Sentry estiver fora, a aplicação não deve quebrar.

### tunnel em instrumentation-client.ts é obrigatório
```typescript
// instrumentation-client.ts — NUNCA remover o tunnel
Sentry.init({
  tunnel: '/monitoring',
  // ...
})
```
Sem isso, ~40% dos erros são bloqueados por ad-blockers.

---

## Next.js / Vercel

### Timeout de 10s nas Serverless Functions (Vercel Hobby)
Rotas de API têm timeout hard de 10s no plano Hobby. Operações longas devem ser quebradas em chamadas menores (ver ADR-002). Sintoma: a rota retorna 504 Gateway Timeout em produção mas funciona localmente.

### `ignoreBuildErrors` foi removido intencionalmente
O `next.config.js` **não tem** `typescript: { ignoreBuildErrors: true }`. Isso é intencional — zero erros TypeScript é obrigatório. Não adicionar essa flag como "fix rápido".

### Monaco Editor não carrega no mobile
Monaco está condicionado a `window.innerWidth >= 768`. Em mobile, um `<textarea>` simples é renderizado no lugar. Não é um bug.

---

## Groq / IA

### Rate limit: 6k tokens/min, 500k tokens/dia
No free tier do Groq. Sintoma: resposta 429 da rota de IA. O `checkRateLimit()` da aplicação é preventivo (por usuário/endpoint), mas o limite do Groq é global da conta. Em uso intenso, aguardar alguns segundos e tentar novamente.

### Respostas não-JSON do modelo
O modelo às vezes retorna markdown com ```json``` em volta do JSON. A função `safeParseJSON()` em `ai.service.ts` já trata isso — não remover o `replace(/```json\n?/g, '')`.

### Newlines literais em `code_solution` de Live Coding
O modelo às vezes emite newlines literais (`\n` real) dentro de strings JSON no campo `code_solution`, quebrando o `JSON.parse`. A função `fixJsonNewlines()` em `ai.service.ts` trata esse caso — é o fallback de `safeParseJSON`. Não remover nem simplificar.

### `existingQuestions` no prompt de geração de roadmap
Ao gerar "mais questões" para um tópico que já tem questões, passar `existingQuestions: string[]` para o `aiService.generateRoadmapQuestions()`. Sem isso, o modelo repete questões já existentes.

### Geração de questões: EN então PT (sequencial, não paralela)
`Promise.all([gerarEN, gerarPT])` excede o timeout de 10s do Vercel Hobby em roadmaps com muitos tópicos. A geração é feita sequencialmente: aguarda EN, depois PT. Não paralelizar sem antes resolver o timeout (upgrade Vercel ou streaming).

---

## TypeScript

### `useT()` retorna o tipo de `translations['en']`
PT e EN devem ter a mesma estrutura. Se PT tiver uma chave a mais ou a menos, TypeScript vai reclamar. Sempre adicionar traduções em EN e PT simultaneamente em `translations.ts`.

### `language as 'en' | 'pt'`
O `useSettingsStore()` retorna `language` como `string`. Quando precisar usar como tipo literal, fazer cast: `language as 'en' | 'pt'`. Nunca tipar o store como `'en' | 'pt'` diretamente — cria rigidez desnecessária.

### `any` implícito em catch blocks
```typescript
// ❌ TypeScript 5+ tipa o catch como unknown, não any
catch (err) {
  logger.error('msg', err) // erro: unknown não é compatível com expected
}

// ✅ Correto
catch (err) {
  logger.error('msg', err instanceof Error ? err : new Error(String(err)), { userId })
}
```

---

## Testes

### Mocks de módulos devem vir antes dos imports
```typescript
// ✅ vi.mock() é hoisted automaticamente pelo Vitest — pode ficar depois dos imports
import { generatePrompt } from '@/lib/ai/prompts/generate.prompt'
vi.mock('@/lib/supabase/server')
```

### Não usar `console.log` em testes
O CI trata warnings como ruído. Usar `vi.spyOn(console, 'warn').mockImplementation(() => {})` quando o código testado logar algo esperado.

### Testes de prompts de IA
Testar o texto gerado, não o resultado da chamada à API. Os testes de prompt verificam que os dados de entrada aparecem no prompt — nunca mockar o modelo e verificar a "resposta da IA".

---

## PWA / Mobile

### iOS safe-area
O bottom bar usa `pb-[env(safe-area-inset-bottom)]` para respeitar o home indicator do iPhone. Não remover — sem isso, o conteúdo fica embaixo do indicador em iPhones sem botão home.

### Install nativo em iOS exige HTTPS
O PWA só pode ser instalado via "Adicionar à tela de início" em iOS quando servido via HTTPS. Em desenvolvimento local (`http://localhost`), o banner de instalação não aparece — não é um bug.
