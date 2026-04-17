# Architecture Notes
> Last updated: 2026-04-17

---

## Runtime Shape

```
Browser
  └── Next.js 16.2.2 (App Router, React 19)
        ├── SSR page components (force-dynamic, Prisma queries)
        ├── Server Actions (all mutations)
        ├── Client components (charts, interactive widgets)
        │     └── TanStack Query v5 (client-side async state)
        └── NextAuth.js v5 middleware (route protection)

Server (API boundary)
  └── src/auth.ts — NextAuth GitHub OAuth callbacks
        └── upserts User via Prisma on sign-in

Data layer
  └── Prisma 6 → PostgreSQL
        ├── Local dev: Docker Compose (port 5432)
        └── Deploy: Supabase Postgres (via DATABASE_URL connection string)

External APIs
  ├── GitHub GraphQL API — contribution calendar sync (PAT-authenticated)
  └── LeetCode — manual log only (API integration pending)
```

---

## Auth Flow

1. `/login` renders "Continue with GitHub" → calls NextAuth `signIn('github')`
2. GitHub OAuth redirect → NextAuth callback in `/api/auth/[...nextauth]`
3. `signIn` callback: `upsertUserFromGitHub()` inserts/updates `User` in Postgres
4. JWT callback: maps `githubId` → internal `user.id` UUID
5. Session callback: attaches `user.id` to `session.user`
6. Middleware (`src/middleware.ts`): any route not matching `/login` or `/api/auth/*` requires a valid session; redirect to `/login` otherwise
7. Root `/` always redirects → `/dashboard`

Session is a JWT stored in HTTP-only cookie. `session.user.id` is the Postgres `User.id` UUID — used as the auth boundary in all Server Actions.

---

## Data Layer

### Prisma singleton

`src/lib/db.ts` exports a global `prisma` instance. Development hot-reload is handled by attaching the client to `globalThis` to avoid exhausting connection pools.

### Query patterns

- **Page data:** `async` server components call Prisma directly. All pages export `dynamic = 'force-dynamic'` to bypass Next.js full-route cache.
- **Mutations:** Server Actions validate the session with `auth()`, then run Prisma queries, then call `revalidatePath()` to invalidate the affected page.
- **No API routes for data** — only `/api/auth/[...nextauth]` exists. REST routes are deliberately absent; Server Actions cover all mutation needs.

### Connection string

`DATABASE_URL` is the single required env var for data. Both local (Docker) and prod (Supabase) are plain Postgres — no Supabase SDK in the data path.

---

## Plan Data Model

The `Plan` is the aggregate root for structured learning data:

```
Plan (one active plan per user)
├── PlanConstraint        — hours/week, job status
├── PlanPhase[]           — 4 months, sequential
│   ├── PlanMilestone[]   — measurable checkpoints
│   └── WeeklyTemplate[]  — recurring tasks by weekday + category
└── PlanTask[]            — daily instances (generated from templates or manual)
└── DailyNote[]           — one note per date (hashtag-extracted categories)
```

**Task generation flow:**
1. User clicks "Generate this week's tasks" on `/planner`
2. `generateCurrentWeekTasksAction()` queries `WeeklyTemplate` rows for the current `PlanPhase`
3. For each template × weekday in the current week, a `PlanTask` row is upserted
4. The planner board reads `PlanTask` rows filtered to the current week

**Category taxonomy:** `DSA | JAVA | DESIGN | DEVOPS | REVIEW | MOCK` — used on `WeeklyTemplate`, `PlanTask`, `Goal`, and extracted from `DailyNote` hashtags.

---

## Activity Score & Heatmap

Activity score per day:
```
score = github_commits + (lc_count × 3) + (tasks_completed × 1)
```

The heatmap in `/calendar` renders 120 days. Each cell is colored on a 5-level scale:
- Level 0: `#1a1a1e` (no activity)
- Level 1: `#3b2f6e` (1–2)
- Level 2: `#6d4fc2` (3–5)
- Level 3: `#a78bfa` (6–10)
- Level 4: `#c4b5fd` (11+)

`src/lib/stats.ts` exports `getDayAggregates()` which joins `GithubDailyStat`, `LeetcodeLog`, and `TaskCompletion` into a unified per-day record.

---

## GitHub Integration

```
User saves PAT in /settings
  → saveGithubPat() stores in Setting table (key: "github_pat")
  → runGithubSync() calls syncGithubContributions(userId)
      → reads PAT from Setting
      → POST https://api.github.com/graphql
         query: contributionsCollection (last 364 days)
      → upserts GithubDailyStat rows
      → updates Setting: github_last_sync, github_last_login
```

The sync is manual-trigger only (button on `/settings`). No automatic background sync on dashboard load yet.

**Rate limit:** 5000 req/hour for authenticated GraphQL — not a concern for single-user daily use.

---

## LeetCode Integration

Currently manual only. User enters count + notes on `/today` → `LeetcodeLog` upserted for that date.

Planned (not built): POST to unofficial `https://leetcode.com/graphql` to pull `acSubmissionNum`. Server Action would upsert the same `LeetcodeLog` table, preserving the data model.

---

## Client-Side State

- **TanStack Query v5** — configured in `AppProviders` (`src/components/app-providers.tsx`). Used by `DashboardChartsLoader` to fetch chart data client-side after SSR shell renders.
- **React `useState`** — local UI state (date navigation on `/today`, form inputs).
- **Native `<form action={serverAction}>`** — most mutations; no form library needed.
- **React Hook Form** — goal creation form only.
- **No global store** (no Redux, no Zustand, no Context for data).

---

## Environment Strategy

| Environment | Postgres | Auth Redirect |
|---|---|---|
| Local dev | Docker Compose (`localhost:5432`) | `http://localhost:3000` |
| Deploy (Vercel) | Supabase Postgres (via `DATABASE_URL`) | `https://<vercel-url>` |

Supabase SDK clients exist in `src/lib/supabase/` but are dormant. They are prepped for future RLS migration. Current server-side Prisma queries enforce data isolation by always scoping queries to `session.user.id`.

### Required env vars
```
DATABASE_URL          # Postgres connection string
AUTH_SECRET           # NextAuth session signing key
AUTH_GITHUB_ID        # GitHub OAuth App client ID
AUTH_GITHUB_SECRET    # GitHub OAuth App client secret
```

### Optional env vars
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

---

## Important Constraints

- `DATABASE_URL` is mandatory at both build time (Prisma generate) and runtime.
- GitHub GraphQL contribution query range must be ≤ 1 year (API limit).
- All page components use `force-dynamic` — disable caching intentionally.
- Session check in every Server Action via `await auth()` → throw 401 if no session.
- LeetCode unofficial API may break at any time; manual entry path must always work.

---

## What's Not Built Yet

| Item | Notes |
|---|---|
| LeetCode API scrape | Manual entry is the current default |
| `/stats` page | Charts are on `/dashboard`; dedicated stats page planned |
| `/journal` page | Notes are on `/calendar`; standalone journal view planned |
| Goal metric tracking | Goals have category tags only; no target/progress/deadline |
| DnD task reorder | `@dnd-kit` installed; not wired in UI |
| Supabase RLS | Using Prisma server-side queries; RLS is a deploy-time addition |
| Auto GitHub sync on load | Only manual trigger via Settings |
