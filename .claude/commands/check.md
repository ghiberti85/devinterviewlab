# /check — Verificação pré-commit

Rode as verificações obrigatórias antes de qualquer commit.

```bash
npx tsc --noEmit && npm run lint && npm test
```

Se algum passo falhar, reporte o erro exato e corrija antes de prosseguir.
Não faça commit se `tsc` tiver erros — `ignoreBuildErrors` foi removido intencionalmente.
