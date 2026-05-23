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
| Editor | Monaco Editor (desktop) / textarea fallback (mobile) |
| Testing | Vitest (unit) + Playwright (E2E) |
| Monitoring | Sentry |

## Navigation

The app is organized into 4 hubs — grouped by user intent, not by feature:

| Hub | What's inside |
|---|---|
| **Today** (`/dashboard`) | Daily streak, pending flashcards, weak concept, quick actions |
| **Simulate** (`/simular`) | AI Interview Coach + Live Coding Simulator |
| **Review** (`/revisar`) | Flashcards (SM-2) and Flash Topics — toggled in the same screen |
| **My Plan** (`/plano`) | Study Roadmap · Progress (stats + score cards) · Concept Graph |

## Features

- ✅ **AI Interview Coach** — answer questions and get dimension-scored feedback (correctness, completeness, clarity, depth) with follow-up and rebuttal rounds
- ✅ **Live Coding Simulator** — Monaco Editor, 7 languages, configurable timer, Socratic Pair Programmer AI; AI problem generator (difficulty + topic); textarea fallback on mobile
- ✅ **Flashcard Practice** — spaced repetition with SM-2 algorithm and adaptive Easiness Factor
- ✅ **Flash Topics** — AI-generated quick-reference cards with embedded Q&A, persistent EN↔PT translation; auto-populates flashcards, concepts, and Simulate on generation
- ✅ **CV Upload + Roadmap** — upload PDF CV (stored, reusable), gap analysis against a job description + 30/60/90-day roadmap via streaming
- ✅ **Visual Score Card** — radar chart synthesized from multiple evaluations + PDF export
- ✅ **Evaluation History** — full replay with typed answer and voice transcript side by side
- ✅ **Concept Graph** — React Flow with concept scoring and dependency mapping
- ✅ **Analytics** — activity heatmap, topic radar, weakest concepts
- ✅ **PWA** — 4-tab mobile bottom bar, native install, iOS safe-area support
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
npm test                # 273 unit tests (Vitest)
npm run test:coverage   # with coverage report
npx playwright test     # E2E (requires .env.test configured)
```

Current coverage: **Statements 97% · Branches 90% · Functions 100% · Lines 98%** (273 tests)

## Commands

```bash
npm run dev        # development server
npm run build      # production build
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript check
```
