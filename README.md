# DevInterviewLab

> Personal AI-powered technical interview practice platform — question generation, interview simulation, live coding, flashcards, and personalized study roadmaps.

**Live:** [devinterviewlab.vercel.app](https://devinterviewlab.vercel.app)  
**CI:** ![Tests](https://img.shields.io/badge/tests-314%20passing-brightgreen) ![TypeScript](https://img.shields.io/badge/TypeScript-zero%20errors-blue) ![Deploy](https://img.shields.io/badge/deploy-Vercel-black)

---

## What is it

DevInterviewLab is a full-stack study platform for technical interviews that uses AI to create a complete practice cycle: generate questions from a personalized roadmap, simulate interviews with detailed feedback, practice live coding with a Socratic pair programmer, review concepts with spaced-repetition flashcards, and track progress with visual metrics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Server + Client Components) |
| Language | TypeScript — zero errors, no `ignoreBuildErrors` |
| Auth + DB | Supabase (PostgreSQL + RLS + Auth) |
| AI | Groq `llama-3.3-70b-versatile` via OpenAI-compatible API |
| Server state | React Query (@tanstack/react-query) |
| Client state | Zustand |
| UI | Tailwind CSS + Radix UI + Lucide React |
| Theming | next-themes (dark / light mode) |
| Editor | Monaco Editor (desktop) / textarea fallback (mobile) |
| Charts | Recharts |
| PDF | html2canvas + jsPDF (score-card export) |
| Document parsing | pdf-parse (CV upload → text extraction) |
| Monitoring | Sentry (tunnel via `/monitoring`) |
| Testing | Vitest — 314 unit tests |
| Git hooks | Husky — `pre-commit` (tsc), `pre-push` (test suite), `commit-msg` (commitlint) |
| CI/CD | GitHub Actions + Vercel (auto-deploy on merge to `main`) |

---

## Features

### Study Plan
- **Personalized roadmap** — CV upload + job description generates a gap analysis and 30/60/90-day roadmap
- **Topic-based question generation** — AI-generated theoretical Q&A and live coding questions per roadmap topic, in EN and PT, without repetition on regeneration
- **Direct links** — "Practice" button on each topic opens the Questions tab pre-filtered by topic

### Review
- **Roadmap questions** — default tab with topic filter, concept generation from questions, bulk delete
- **Flash Topics (Concepts)** — quick technical references with summary, when to use, pros & cons (accordion), integrated Q&A, and persistent EN↔PT translation

### Simulation
- **AI Interview Coach** — dimension-based evaluation (correctness, completeness, clarity, depth) with follow-up and rebuttal
- **Live Coding Simulator** — 7 languages, configurable timer, Socratic pair programmer with on-demand hints, idle detection

### Statistics
- Question cards by type (Total / Theoretical / Live Coding) per roadmap
- Bar chart of questions by topic — responsive, no horizontal scroll

### Experience
- **Demo Mode** — [`/demo`](https://devinterviewlab.vercel.app/demo) public route with mocked data and 4 interactive tabs, accessible from the login screen
- **Diverse questions** — 5-angle taxonomy (Conceptual, Practical, Trade-off, Debug, Evolution) + banned phrases prevent repetition across generations
- **PWA** — installable, mobile bottom tab bar, iOS safe-area support
- **i18n** — full EN and PT-BR, synced with database
- **Theming** — light / dark mode

---

## Architecture

```
app/
  (app)/          # protected routes (auth layout)
    plano/        # roadmap + question generation
    revisar/      # roadmap questions + Flash Topics (concepts)
    demo/         # public route with mocked data (no auth)
    simular/      # interview coach + live coding
    stats/        # metrics and charts
  api/            # route handlers (Next.js App Router)
features/         # domain logic (React Query hooks + components)
lib/
  ai/             # ai.service.ts + prompts/
  i18n/           # translations.ts + useT()
  supabase/       # client server/browser + types
  api/            # rate-limit, brute-force, logger
store/            # zustand stores
__tests__/unit/   # 314 Vitest unit tests
```

---

## Security

Every API route follows this checklist:

| Item | Implementation |
|---|---|
| Authentication | `supabase.auth.getUser()` → 401 if unauthenticated |
| Rate limiting | `checkRateLimit('endpoint')` before any AI call |
| Sanitized errors | `sanitizeError()` — no stack traces sent to client |
| RLS | All 19 tables with USING + WITH CHECK policies |
| Uploads | `validateFileBuffer()` — magic bytes + MIME + size |
| Brute force | 10 attempts / 15 min per IP — persisted in Supabase (`brute_force_log` via SECURITY DEFINER RPCs), in-memory fallback |
| CSRF | Origin validation on all POSTs |
| Security headers | CSP (route-scoped via middleware — `unsafe-eval` only on `/live-coding`), HSTS, X-Frame-Options, X-Content-Type-Options |

---

## Tests

```bash
npm test                # 314 unit tests (Vitest)
npm run test:coverage   # with coverage report
```

| Test file | Tests | Coverage |
|---|---|---|
| `brute-force.test.ts` | 14 | IP blocking, sliding window, reset |
| `brute-force-persistent.test.ts` | 8 | Supabase RPC path, fallback, retryAfterSec |
| `rate-limit.test.ts` | 13 | checkRateLimit per endpoint |
| `file-validation.test.ts` | 10 | Magic bytes, MIME, size |
| `spaced-repetition.test.ts` | 25 | Full SM-2: EF, intervals, reset |
| `prompts.test.ts` | 63 | Evaluate, behavioral, followup — EN/PT, schema |
| `generate-prompts.test.ts` | 32 | Generate, coding-hint, cn() |
| `stream.test.ts` | 9 | ndjsonStream + readNdjsonStream |
| `interview-payload.test.ts` | 5 | Serialization with transcript |
| `score-card-utils.test.ts` | 6 | aggregateRadar, averageScore |
| `roadmap-prompt.test.ts` | 6 | Language, truncation, JSON schema |
| `topic-prompt.test.ts` | 29 | getTopicSystemPrompt, topicAnalysisPrompt, topicTranslatePrompt — incl. output-language-lock rules |
| `topic-pairs.test.ts` | 10 | groupIntoPairs — pairs, fallback, ordering |
| `score-card-prompt.test.ts` | 11 | EN/PT, JSON-only, strengths/gaps |
| `coding-generate-prompt.test.ts` | 13 | Difficulty, topic, language, fallbacks |
| `roadmap-questions-prompt.test.ts` | 28 | fixJsonNewlines, safeParseJSON, theoretical and live coding prompts |
| `api-evaluate.test.ts` | 4 | 401/429/400 guard layers on `/api/ai/evaluate` |
| `api-roadmaps.test.ts` | 3 | 401 unauth, 200 success, progress field on `/api/roadmaps` |
| `api-topics.test.ts` | 4 | 401/400 guards, translation-gap backfill on `/api/topics` |

**Coverage:** Statements 97% · Branches 90% · Functions 100% · Lines 98%

---

## Running locally

```bash
npm install
cp .env.example .env.local
# fill in the variables below
npm run dev
```

### Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://idgpscsnbgszhwvhtedy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>

# Groq (free tier) — https://console.groq.com
OPENAI_API_KEY=gsk_...
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=llama-3.3-70b-versatile

SENTRY_DSN=<optional>
NEXT_PUBLIC_SENTRY_DSN=<optional>
```

### Supabase Migrations

```bash
# Apply in ascending order
supabase db push   # or apply manually via the Supabase dashboard
```

---

## Commands

```bash
npm run dev        # development server (localhost:3000)
npm run build      # production build (must pass cleanly)
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript — zero errors required
npm test           # 314 unit tests
```

---

## CI/CD

Every push and PR automatically runs:

1. `npx tsc --noEmit` — zero TypeScript errors
2. `npm run lint` — zero ESLint warnings
3. `npm test` — all tests must pass
4. `npm run build` — clean production build

**Merge is blocked if any check fails.**  
Merge to `main` → automatic deploy on Vercel.

---

## Contributing

```bash
git checkout -b feat/feature-name
# develop...
npx tsc --noEmit && npm test   # or /check in Claude Code
git push origin feat/feature-name
# open Pull Request → CI runs automatically
```

---

## Author

**Fernando Ghiberti** — [github.com/ghiberti85](https://github.com/ghiberti85)
