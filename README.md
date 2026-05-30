# DevInterviewLab

Plataforma pessoal de prática para entrevistas técnicas, alimentada por IA, repetição espaçada e referências rápidas por tópico.

**Live:** https://devinterviewlab.vercel.app  
**CI:** GitHub Actions — TypeScript · Lint · 260 testes · Build  
**Deploy:** Vercel (automático ao mergear para `main`)

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend/Backend | Next.js 15 (App Router) |
| Database + Auth | Supabase (PostgreSQL + RLS) |
| Hosting | Vercel (Hobby) |
| AI | Groq `llama-3.3-70b-versatile` (OpenAI-compatible) |
| Estado | React Query + Zustand |
| UI | Tailwind CSS + Radix UI |
| Charts | Recharts |
| Graph | React Flow |
| Editor | Monaco Editor (desktop) / textarea fallback (mobile) |
| Testes | Vitest (unit) — 260 testes |
| CI | GitHub Actions |
| Monitoramento | Sentry |

---

## Navegação

O app está organizado em 4 hubs agrupados por intenção do usuário:

| Hub | O que tem |
|---|---|
| **Simular** (`/simular`) | AI Interview Coach + Live Coding Simulator |
| **Revisar** (`/revisar`) | **Questões do Roadmap** (padrão) · Flash Topics · Flashcards SM-2 · Conceitos |
| **Plano** (`/plano`) | Roadmap de estudo (CV + vaga) com progresso · Analytics + Score Cards |
| **Stats** (`/stats`) | Heatmap · Radar chart · Conceitos fracos |

---

## Features

- ✅ **Questões por Roadmap** — geração de Q&A por tópico com barra de progresso real; delete por questão; gerar tópico/conceito a partir de cada questão; sem repetições ao regerar
- ✅ **AI Interview Coach** — score por dimensão (correção, completude, clareza, profundidade) com réplica e tréplica
- ✅ **Live Coding Simulator** — Monaco Editor, 7 linguagens, timer configurável, Pair Programmer socrático
- ✅ **Flashcard Practice** — repetição espaçada SM-2 com Easiness Factor adaptativo + Skip
- ✅ **Flash Topics** — referências rápidas com Q&A integrado, tradução persistida EN↔PT; auto-popula flashcards e conceitos
- ✅ **CV Upload + Roadmap** — análise de gap CV vs vaga, roadmap 30/60/90 dias; múltiplos roadmaps com selector
- ✅ **Score Card Visual** — radar chart de múltiplas avaliações, export PDF
- ✅ **Grafo de Conceitos** — React Flow com pontuação e dependências; delete de conceitos individuais
- ✅ **Analytics** — heatmap de atividade, radar por tópico, conceitos mais fracos
- ✅ **PWA** — bottom bar mobile, install nativo, iOS safe-area
- ✅ **i18n** — EN e PT-BR completos, sincronizado com banco de dados

---

## Como contribuir

```
1. Criar branch de feature: git checkout -b feat/nome
2. Desenvolver + rodar /check (tsc + lint + tests)
3. Abrir Pull Request → CI roda automaticamente
4. Merge apenas com CI verde → deploy automático no Vercel
```

---

## Getting started

```bash
npm install
cp .env.example .env.local
# preencher variáveis abaixo
npm run dev
```

## Variáveis de ambiente

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

## Supabase

- **Project ID**: `idgpscsnbgszhwvhtedy` · **Região**: `sa-east-1`
- Migrations em `supabase/migrations/` — aplicar em ordem crescente

---

## Testes

```bash
npm test                # 260 testes unitários (Vitest)
npm run test:coverage   # com relatório de cobertura
```

**Cobertura atual:** Statements 97% · Branches 90% · Functions 100% · Lines 98%

O CI roda `npm test` + `npx tsc --noEmit` + `npm run lint` + `npm run build` em todo push e PR.  
**Merge bloqueado se qualquer check falhar.**

---

## Comandos

```bash
npm run dev        # servidor de desenvolvimento
npm run build      # build de produção
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript check
npm test           # testes unitários
```
