# DevInterviewLab

A personal platform for technical interview practice powered by AI, spaced repetition, and quick-reference topic cards.

**Live:** https://devinterviewlab.vercel.app

## Stack

| Layer | Technology |
|---|---|
| Frontend/Backend | Next.js 15 (App Router) |
| Database + Auth | Supabase (PostgreSQL + RLS) |
| Hosting | Vercel |
| AI | Groq `llama-3.3-70b-versatile` (OpenAI-compatible) |
| State | React Query + Zustand |
| UI | Tailwind CSS + Radix UI |
| Charts | Recharts |
| Graph | React Flow |
| Editor | Monaco Editor |
| Testing | Vitest (unit) + Playwright (E2E) |
| Monitoring | Sentry |

## Features

- ✅ **AI Interview Coach** — evaluates answers with dimension scores (correctness, completeness, clarity, depth), follow-up and rebuttal rounds
- ✅ **Flashcard Practice** — spaced repetition with SM-2 algorithm and adaptive Easiness Factor
- ✅ **Live Coding Simulator** — Monaco Editor, 7 languages, configurable timer, Socratic Pair Programmer AI
- ✅ **Flash Topics** — AI-generated quick-reference cards with embedded Q&A, persistent EN↔PT translation
- ✅ **Visual Score Card** — radar chart synthesized from multiple evaluations + PDF export
- ✅ **CV Analysis + Study Roadmap** — gap analysis against a job description + 30/60/90-day roadmap via streaming
- ✅ **Evaluation History** — full replay with typed answer and voice transcript side by side
- ✅ **Concept Graph** — React Flow with concept scoring and dependency mapping
- ✅ **Analytics** — activity heatmap, topic radar, weakest concepts
- ✅ **PWA** — mobile bottom tab bar, native install, iOS safe-area support
- ✅ **Internationalization** — full EN and PT-BR support, language switch synced to DB

## Getting started

```bash
npm install
cp .env.example .env.local
# fill in the variables below
npm run dev
```

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://idgpscsnbgszhwvhtedy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>

# Groq (free tier, recommended) — https://console.groq.com
OPENAI_API_KEY=gsk_...
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=llama-3.3-70b-versatile

SENTRY_DSN=<optional>
NEXT_PUBLIC_SENTRY_DSN=<optional>
```

## Supabase

- **Project ID**: `idgpscsnbgszhwvhtedy` · **Region**: `sa-east-1`
- Migrations live in `supabase/migrations/` — apply in ascending order

## Tests

```bash
npm test                # 247 unit tests (Vitest)
npm run test:coverage   # with coverage report
npx playwright test     # E2E (requires .env.test configured)
```

Current coverage: **Statements 97% · Branches 90% · Functions 100% · Lines 98%**

## Commands

```bash
npm run dev        # development server
npm run build      # production build
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript check
```
