# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

No test framework is configured.

## Environment

Requires `.env.local` with: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`. See `.env.local.example`.

## Architecture

Next.js 14 App Router + Supabase + Tailwind CSS 3. Hosted on Vercel.

### Auth (Google OAuth + Role-Based)

- **Google OAuth** via Supabase Auth. Single `/login` page for everyone.
- **Roles**: `super_admin`, `admin`, `user` — stored in `profiles` table.
- **Allowed domains**: pepschoolv2.com, accelschool.in, ribbons.education
- **Middleware** (`src/middleware.ts`): refreshes session, redirects unauthenticated users to `/login`, redirects legacy `/train/*` and `/manager/*` routes.
- **Auth helpers** (`src/lib/auth.ts`): `getAuthUser()`, `requireAuth()`, `requireAdmin()`, `requireSuperAdmin()` — all async, return `{ user, error }`.
- **Client hook** (`src/hooks/useAuth.ts`): `useAuth(requiredRole?)` — fetches `/api/auth/me`, handles redirect.

### Supabase clients (`src/lib/supabase/`)

- `client.ts` — browser client using `createBrowserClient` from `@supabase/ssr`
- `server.ts` — server client using `createServerClient` from `@supabase/ssr` with cookies
- `admin.ts` — service role client (`createAdminClient()`) for API routes. Never expose to browser.
- `src/lib/supabase.ts` — **legacy**, kept for old pages still in codebase. New code uses the above.

### Content systems

1. **Legacy hardcoded content** — 9 training sections in `src/content/sections.ts` and assessment in `src/content/assessment.ts`. **Do not modify these files.** Legacy routes at `/train/[token]` and `/manager/` redirect to `/login`.
2. **Program engine (database-driven)** — Programs with sections, content blocks, exercises, and assessments stored in Supabase. Admin: `/admin/programs/...`. Learner: `/learn/[programSlug]/...`.

Both systems share the same `progress` and `responses` tables. Legacy uses string IDs (e.g., `"welcome"`), programs use UUIDs.

### Key data layer

- Types: `src/content/types.ts` — ContentBlock, Exercise (multiple_choice | voice | short_answer), Section, Trainee, Progress, Response
- Programs data: `src/lib/programs.ts` — all program CRUD queries + type converters
- Migrations: `migration-add-programs.sql`, `migration-add-auth.sql`

### Database tables

Auth: `profiles` (linked to `auth.users`)

Legacy: `trainees`, `progress`, `responses`, `assessment_attempts`

Programs: `programs`, `program_sections`, `program_content_blocks`, `program_exercises`, `program_assessment_questions`, `trainee_programs`

Link: `trainees.user_id` → `auth.users.id` (nullable, for linking auth users to trainee records)

### Page routes

- `/login` — Google OAuth sign-in
- `/admin/dashboard` — admin trainee overview
- `/admin/programs/...` — program CMS (admin/super_admin)
- `/admin/users` — user management (admin/super_admin)
- `/learn` — enrolled programs list (user)
- `/learn/[programSlug]/...` — training content (user)

### API route layout

- `/api/auth/me`, `/api/auth/logout` — session management
- `/api/auth/callback` — OAuth code exchange
- `/api/manager` — trainee listing (requireAdmin)
- `/api/trainee` — GET: current user's trainee data, POST: create trainee (requireAdmin)
- `/api/users/...` — user management (requireAdmin, role changes requireSuperAdmin)
- `/api/my-programs` — current user's enrolled programs
- `/api/progress`, `/api/assessment`, `/api/feedback`, `/api/transcribe` — trainee actions (requireAuth)
- `/api/programs/...` — CMS endpoints (requireAdmin)
- `/api/program-content`, `/api/program-assessment` — trainee-facing read-only (requireAuth)

### Voice exercise pipeline

Record audio (MediaRecorder) → POST `/api/transcribe` (Whisper) → POST `/api/feedback` (Claude) → save response with score (1-5)

## Conventions

- Next.js 14 route params are `Promise`-based: `{ params }: { params: Promise<{ id: string }> }` — must `await params`
- Sort order for program items: query `max(sort_order) + 1` when adding. Reorder via PUT with `{ order: [{ id, sort_order }] }`.
- Path alias: `@/*` maps to `./src/*`
- No icon library — inline SVGs throughout
