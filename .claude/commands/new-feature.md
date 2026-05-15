# /new-feature — Scaffold de nova feature

Argumento: nome da feature em kebab-case (ex: `live-coding`)

## Checklist de criação

1. **Estrutura de arquivos** — crie os diretórios e arquivos base:

```
features/<nome>/
  components/     # componentes React da feature
  hooks/          # hooks React Query

app/(app)/<nome>/page.tsx    # página protegida
app/api/<nome>/route.ts      # API route (se necessário)
```

2. **Página** — comece com Server Component quando não precisar de estado. Adicione `'use client'` apenas quando usar hooks.

3. **API Route** — inclua obrigatoriamente:
   - Auth check com `createClient()` + `supabase.auth.getUser()`
   - Rate limit com `checkRateLimit('<nome-do-endpoint>')`
   - Erros sanitizados com `sanitizeError()`
   - Logs com `logger.info/error()`

4. **Tradução** — adicione strings em `lib/i18n/translations.ts` (EN e PT simultaneamente, nunca só um idioma).

5. **NavLinks** — adicione a rota em `components/NavLinks.tsx` com ícone e tradução.

6. **Verificação** — rode `/check` antes do commit.

## Template de API Route protegida

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, logUsage, sanitizeError } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await checkRateLimit('<endpoint>')
  if (!rl.allowed) return rl.response

  try {
    // lógica aqui
    await logUsage(user.id, '<endpoint>', 0, 0, 'ok')
    return NextResponse.json({ data: {} })
  } catch (err) {
    logger.error('Erro em <endpoint>', err, { userId: user.id })
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 })
  }
}
```
