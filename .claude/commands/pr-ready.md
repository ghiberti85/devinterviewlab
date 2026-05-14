# /pr-ready — Checklist antes de abrir PR

Execute cada item e reporte o resultado.

## Checklist

```bash
# 1. TypeScript — zero erros obrigatório
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Testes unitários
npm test

# 4. Build de produção
npm run build
```

## Verificações manuais

- [ ] Strings novas adicionadas em EN **e** PT em `translations.ts`
- [ ] Novas tabelas têm RLS habilitado + políticas explícitas
- [ ] Novas API routes têm auth check + rate limit
- [ ] Nenhum `console.log` de debug esquecido (usar `logger.*`)
- [ ] Nenhum `any` implícito novo
- [ ] Componentes com hooks têm `'use client'`

## Formato do commit

```
tipo: descrição curta em português

Tipos válidos: feat | fix | test | security | refactor | docs | chore
```

Só abra PR após todos os itens acima passarem.
