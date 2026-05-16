# DevInterviewLab

Plataforma pessoal de prática para entrevistas técnicas com IA, repetição espaçada e referências técnicas rápidas.

**Live:** https://devinterviewlab.vercel.app

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend/Backend | Next.js 15 (App Router) |
| Database + Auth | Supabase (PostgreSQL + RLS) |
| Hosting | Vercel |
| AI | Groq `llama-3.3-70b-versatile` (OpenAI-compatible) |
| Estado | React Query + Zustand |
| UI | Tailwind CSS + Radix UI |
| Charts | Recharts |
| Graph | React Flow |
| Editor | Monaco Editor |
| Testes | Vitest (unit) + Playwright (E2E) |
| Monitoramento | Sentry |

## Features

- ✅ **Coach de Entrevista com IA** — avalia respostas, score por dimensão, réplica e tréplica
- ✅ **Prática com Flashcards** — repetição espaçada SM-2 com Easiness Factor adaptativo
- ✅ **Live Coding Simulator** — Monaco Editor, 7 linguagens, timer, Pair Programmer socrático
- ✅ **Flash Topics** — referências técnicas rápidas com Q&A, tradução EN↔PT persistida
- ✅ **Score Card Visual** — radar chart de múltiplas avaliações + export PDF
- ✅ **Análise de CV + Roadmap** — gap analysis vs vaga + roadmap 30/60/90 dias via streaming
- ✅ **Histórico de Avaliações** — replay completo com transcrição de voz lado a lado
- ✅ **Grafo de Conceitos** — React Flow com scoring por conceito
- ✅ **Analytics** — heatmap de atividade, radar por tópico, conceitos fracos
- ✅ **PWA** — bottom tab bar no mobile, install nativo, safe-area iOS
- ✅ **Internacionalização** — PT-BR e EN completos, troca de idioma sincronizada

## Rodando localmente

```bash
npm install
cp .env.example .env.local
# preencher as variáveis abaixo
npm run dev
```

## Variáveis de ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://idgpscsnbgszhwvhtedy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key do Supabase dashboard>

# Groq (gratuito, recomendado) — https://console.groq.com
OPENAI_API_KEY=gsk_...
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=llama-3.3-70b-versatile

SENTRY_DSN=<opcional>
NEXT_PUBLIC_SENTRY_DSN=<opcional>
```

## Supabase

- **Project ID**: `idgpscsnbgszhwvhtedy` · **Região**: `sa-east-1`
- Migrations em `supabase/migrations/` — aplicar em ordem crescente

## Testes

```bash
npm test                # 247 testes unitários (Vitest)
npm run test:coverage   # com relatório de cobertura
npx playwright test     # E2E (requer .env.test configurado)
```

Cobertura atual: **Statements 97% · Branches 90% · Functions 100% · Lines 98%**

## Comandos úteis

```bash
npm run dev        # servidor de desenvolvimento
npm run build      # build de produção
npm run lint       # ESLint
npx tsc --noEmit   # verificação TypeScript
```
