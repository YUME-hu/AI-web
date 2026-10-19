# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

个人开发者平台 — AI-driven job-seeking platform with project library, AI resume generator, skill gap analysis, AI interview coach, blog, dev calendar, RAG knowledge assistant, and token monitoring. Single-admin (GitHub OAuth), dark theme (Arknights-inspired).

## Commands

```bash
npm run dev      # Start dev server (Next.js 16, default http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
npx tsc --noEmit # TypeScript type-check
```

**Setup:** `cp .env.example .env.local`, fill in keys, then run `supabase/schema.sql` and `supabase/rls.sql` in Supabase SQL Editor. See root `DEPLOYMENT.md` for full deploy guide.

**Post-deploy init:** call `POST /api/admin/reindex` once to build vector indexes for existing projects/blogs.

## Architecture

### Tech stack

- **Framework:** Next.js 16 App Router + React 19 + TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui (`@base-ui/react`), pure dark theme
- **DB / Auth:** Supabase (PostgreSQL + Auth + pgvector with HNSW index)
- **AI:** DeepSeek API (`deepseek-v4-flash`, OpenAI-compatible, `thinking: disabled`)
- **Embeddings:** SiliconFlow BGE-M3 (1024-dim) for RAG
- **PDF:** `@react-pdf/renderer` (ATS-friendly, Chinese font from CDN)
- **Editor:** Tiptap (Markdown mode)
- **Calendar:** react-big-calendar
- **Charts:** Recharts

### Route structure & layouts

```
src/app/
├── layout.tsx              # Root: <html dark>, fonts, global CSS
├── (main)/layout.tsx       # AppShell wrapper (sidebar + header) — most pages
│   ├── page.tsx            # / — Dashboard (Hero, stats, heatmap, quick actions)
│   ├── projects/           # /projects/* — project list, detail, edit, import, recommended
│   ├── blog/               # /blog/* — list, post detail, new, edit
│   ├── resume/             # /resume/* — wizard, history, detail
│   ├── interview/          # /interview/* — home, practice, mock session
│   ├── calendar/           # /calendar
│   ├── chat/               # /chat — RAG assistant
│   └── settings/           # /settings — profile form, usage stats
├── login/page.tsx          # Standalone login (no AppShell)
├── auth/callback/route.ts  # OAuth callback
└── api/                    # Route Handlers — see API section below
```

### Supabase client layering (3 clients)

| Client | File | Usage | RLS |
|--------|------|-------|-----|
| Browser | `lib/supabase/client.ts` | Client Components (`"use client"`) | Yes |
| Server | `lib/supabase/server.ts` | Server Components + Route Handlers (carries user session) | Yes |
| Service | `lib/supabase/service.ts` | Server-only, bypasses RLS (embedding writes, usage logs, public chat) | No |

`lib/supabase/middleware.ts` handles session cookie refresh and redirects unauthenticated users to `/login?next=<path>` for admin-only routes. Admin routes are defined by prefix matching in the middleware.

### Auth model

- GitHub OAuth only (configured in Supabase Dashboard)
- Single admin: if `ADMIN_USER_ID` is set, only that user is admin; if unset, any logged-in user is admin
- Access control: middleware protects admin routes; `isAdmin()` helper for server-side checks

### AI layer (`lib/deepseek.ts`)

Unified client for all DeepSeek calls — used by every module. Key patterns:

- **`chatCompletion(messages, options)`** — non-streaming with retry (3×, exponential backoff), timeout (60s), JSON mode support
- **`chatCompletionJson<T>(messages, options)`** — typed JSON extraction with fallback regex
- **`chatCompletionStream(messages, options)`** — SSE streaming for chat/interview
- **Token tracking:** set `trackModule` to automatically check daily limit before call and log usage after success. Cost estimated at $0.14/$0.28 per 1M tokens.
- **Daily limit:** `DAILY_TOKEN_LIMIT` env var (default 500K); exceeded → `DeepSeekError` (not retryable)

### RAG pipeline (`lib/rag.ts` + `lib/embedding.ts`)

1. **Chunking:** `chunkText()` — paragraph-first, sentence-fallback, hard-cut if needed, merge short pieces; target ≤500 chars
2. **Source text:** `buildProjectText()` / `buildBlogText()` (blog truncated to 8000 chars)
3. **Indexing:** `syncSourceEmbeddings()` — delete old vectors → chunk → `embedTexts()` (SiliconFlow BGE-M3) → batch insert
4. **Retrieval:** `retrieve(query)` → `embedText()` → `supabase.rpc("match_embeddings")` (cosine similarity via pgvector HNSW)
5. **Chat:** `/api/chat` retrieves top-5 chunks, builds system prompt, streams response via DeepSeek SSE

### Database tables

`projects`, `blog_posts`, `calendar_events`, `resumes`, `interview_questions`, `mock_interviews`, `recommended_projects`, `chat_sessions`, `embeddings` (pgvector), `ai_usage_logs`, `profile` (single-row, id=1). Full DDL in `supabase/schema.sql`.

### API routes

| Route | Purpose |
|-------|---------|
| `/api/projects` | Project CRUD (GET list, POST create) |
| `/api/projects/[id]` | Single project (GET, PATCH, DELETE) |
| `/api/projects/parse` | AI parse README → prefill form |
| `/api/resumes` | Resume list/create |
| `/api/resumes/[id]` | Resume CRUD + JD analysis |
| `/api/resumes/[id]/match` | AI project matching |
| `/api/resumes/[id]/evaluate` | AI self-evaluation |
| `/api/resumes/[id]/gaps` | Skill gap analysis |
| `/api/resumes/[id]/questions` | Generate interview questions from resume |
| `/api/blog` | Blog CRUD |
| `/api/blog/[id]` | Single blog post |
| `/api/chat` | RAG streaming chat |
| `/api/search` | Semantic search (public) |
| `/api/calendar/events` | Calendar event CRUD |
| `/api/calendar/events/[id]` | Single event |
| `/api/interview/questions` | Question bank management |
| `/api/interview/questions/[id]` | Single question |
| `/api/interview/questions/[id]/feedback` | AI feedback on answer |
| `/api/interview/mock` | Create mock interview session |
| `/api/interview/mock/[id]` | Mock interview detail |
| `/api/interview/mock/[id]/message` | Send message in mock session |
| `/api/recommended` | Recommended projects list/generate |
| `/api/recommended/[id]` | Single recommendation |
| `/api/recommended/[id]/convert` | Convert recommendation → real project |
| `/api/usage` | Token usage stats |
| `/api/profile` | Profile read/write |
| `/api/admin/reindex` | Rebuild all vector indexes |
| `/feed.xml` | RSS feed |
| `/sitemap` | Dynamic sitemap |
| `/robots` | robots.txt |

### Key patterns

- **AI results are always normalized** before storage — models may return malformed JSON or wrong types. Each module has normalize functions (e.g., `normalizeJdAnalysis`, `normalizeMatches`, `normalizeInterviewQuestions`) that validate against known project IDs and clamp scores.
- **Calendar events are auto-synced** from source data: project CRUD triggers `syncProjectEvents()`, blog publish triggers `syncBlogPostEvent()`. Manual events via `/api/calendar/events`.
- **Profile** is a single-row table (id=1); `getProfile()` returns `null` if the table doesn't exist yet (graceful fallback).
- **All AI prompts** are centralized in `lib/prompts.ts` as `const` objects with system/user templates. Do not inline prompts in API routes.
- **Components follow shadcn/ui patterns**: `components/ui/` for primitives, feature folders (`projects/`, `resume/`, `interview/`, etc.) for domain components.
- **AI usage logging** is fire-and-forget (failures are logged to console but never block the main flow).
