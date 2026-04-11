# DevInterviewLab

Practice technical interview questions with AI feedback, spaced repetition, and a knowledge graph.

## Stack
- **Frontend/Backend**: Next.js 15 (App Router)
- **Database + Auth**: Supabase (PostgreSQL + RLS)
- **Hosting**: Vercel
- **AI**: Any OpenAI-compatible API (Groq free, Gemini free, or OpenAI paid)
- **State**: React Query + Zustand
- **UI**: Tailwind CSS
- **Charts**: Recharts
- **Graph**: React Flow

## Features
- ✅ Questions CRUD with markdown, categories, tags, difficulty
- ✅ Flashcard practice with spaced repetition (SM-2)
- ✅ AI Interview Coach — evaluates answers, scores, detects gaps
- ✅ STAR analysis for behavioral questions
- ✅ Knowledge graph (React Flow) with concept scoring
- ✅ Analytics dashboard with heatmap and topic radar

> The app works fully without an AI key. Only the Interview Coach feature requires one.

## Getting started

```bash
npm install
cp .env.example .env.local
# fill in your keys (see below)
npm run dev
```

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://idgpscsnbgszhwvhtedy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key from Supabase dashboard>

# AI provider — pick ONE (all free options available):

# Option A: Groq (free tier, fastest — recommended)
# Get key at: https://console.groq.com
OPENAI_API_KEY=gsk_...
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=llama-3.3-70b-versatile

# Option B: Google Gemini (free tier)
# Get key at: https://aistudio.google.com
OPENAI_API_KEY=AIza...
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
OPENAI_MODEL=gemini-1.5-flash

# Option C: OpenAI (paid)
OPENAI_API_KEY=sk-...
# leave OPENAI_BASE_URL and OPENAI_MODEL unset
```

## Supabase project
- **Project ID**: `idgpscsnbgszhwvhtedy`
- **Region**: sa-east-1
- DB migration already applied — all tables, RLS, and seed categories are live.

## Vercel env variables to set
In Vercel → Settings → Environment Variables, add the same keys above.
