# Architecture Notes
> Last updated: 2026-04-29

---

## Runtime Shape

```
Browser
  └── Next.js 16.2.2 (App Router, React 19)
        ├── SSR page components (force-dynamic, Prisma queries)
        ├── Server Actions (all mutations)
        ├── Client components (charts, heatmaps, interactive widgets)
        │     └── TanStack Query v5 (client-side async state)
        └── NextAuth.js v5 middleware (route protection)

Server (API boundary)
  └── src/auth.ts — NextAuth GitHub OAuth callbacks (Node.js runtime)
  └── src/auth.config.ts — provider config only (edge-safe, used by middleware)
        └── upserts User via Prisma on sign-in

Data layer
  └── Prisma 6 → PostgreSQL
        ├── Local dev: Docker Compose (port 5432)
        └── Deploy: any Postgres connection string (DATABASE_URL)
              planned: Supabase Postgres

External APIs
  ├── GitHub GraphQL API — contribution calendar sync (PAT-authenticated)
  └── LeetCode — manual log only (API integration pending)
```

---

## Auth Flow

1. `/login` renders "Continue with GitHub" → Server Action calls `signIn('github', { redirectTo: '/dashboard' })`
2. GitHub OAuth redirect → NextAuth callback in `/api/auth/[...nextauth]`
3. `signIn` callback: `upsertUserFromGitHub()` inserts/updates `User` in Postgres
4. After upsert, optionally mirrors to Supabase `public.users` via `trySyncUserToSupabase()` — errors are swallowed so login always succeeds
5. JWT callback: maps `githubId` → internal `user.id` UUID, sets `token.sub`
6. Session callback: attaches `user.id` to `session.user`
7. Middleware (`src/middleware.ts`): uses edge-safe `auth.config.ts`; any route not matching `/login` or `/api/auth/*` requires a valid session; redirect to `/login` otherwise
8. Root `/` always redirects → `/dashboard`

Session is a JWT stored in HTTP-only cookie. `session.user.id` is the Postgres `User.id` UUID.

**Auth config split:** `auth.config.ts` holds provider config only (no Prisma) so the middleware can run on the edge runtime. `auth.ts` extends it with full callbacks (Prisma queries) and runs in the Node.js runtime.

---

## Data Layer

### Tenancy model — single-tenant by design

This is a personal tool for one authenticated user. Only `Plan` and its children are scoped to a `userId`. All other tables — `Goal`, `DailyTask`, `LeetcodeLog`, `GithubDailyStat`, `Setting`, `DailyCheckIn` — are global (no `userId`). Server Actions do not add per-user isolation on these tables. **This is intentional and acceptable for a single-user app.**

If the app ever becomes multi-user, those tables need `userId` FK columns and query filters added.

### Date storage — ISO strings, not DateTime

All "date" fields (where only the calendar date matters, not the time) are stored as `String` in the format `"YYYY-MM-DD"`. This includes:
- `TaskCompletion.date`
- `LeetcodeLog.date`
- `GithubDailyStat.date`
- `PlanTask.date`
- `DailyNote.date`
- `DailyCheckIn.date`
- `Plan.startDate`, `Plan.endDate`

**Why:** Avoids all timezone edge cases. PostgreSQL `DateTime` stores UTC; when querying "today" from a client in a non-UTC timezone, dates shift. ISO string comparison (`gte: "2026-04-01"`) is safe and predictable. `@updatedAt` and audit timestamps (`createdAt`, `checkedAt`) remain proper `DateTime`.

### Prisma singleton

`src/lib/db.ts` exports a global `prisma` instance. Development hot-reload is handled by attaching the client to `globalThis` to avoid exhausting connection pools.

### Query patterns

- **Page data:** `async` server components call Prisma directly. All pages export `dynamic = 'force-dynamic'` to bypass Next.js full-route cache.
- **Mutations:** Server Actions validate the session with `auth()` where user-scoped data is involved, then run Prisma queries, then call `revalidatePath()` to invalidate the affected page.
- **No data REST routes** — only `/api/auth/[...nextauth]` exists. Server Actions cover all mutation needs.

---

## Plan Data Model

The `Plan` is the aggregate root for structured learning data:

```
Plan (one active plan per user)
├── PlanConstraint        — hours/week, job status, schedule flexibility
├── PlanPhase[]           — 4 months, sequential (Foundation → Build → Depth → Fire)
│   ├── PlanMilestone[]   — measurable checkpoints per phase
│   └── WeeklyTemplate[]  — recurring tasks by weekday + category
└── PlanTask[]            — daily instances (generated from templates or manual)
└── DailyNote[]           — one note per (planId, date) pair
```

**Task generation flow:**
1. User visits `/planner` or `/calendar` (auto-generates on calendar load)
2. `generateTasksFromTemplates(planId, rangeStart, rangeEnd)` queries `WeeklyTemplate` rows for the current `PlanPhase`
3. For each template × weekday in the date range, a `PlanTask` row is upserted
4. Planner board / calendar day detail reads `PlanTask` rows filtered to the relevant date(s)

**Category taxonomy:** `DSA | JAVA | DESIGN | DEVOPS | REVIEW | MOCK` — defined as a Prisma `enum PlanCategory`, used on `WeeklyTemplate` and `PlanTask`. `Goal.category` is a plain `String` (default `"OTHER"`) to allow categories beyond the plan taxonomy.

---

## Activity Score & Heatmaps

There are two separate heatmap implementations with different data sources and purposes:

### Dashboard heatmap (`/dashboard`) — 365 days
Uses `aggregatesForHeatmap(365)` from `src/lib/stats.ts`.

Aggregates 5 sources per day:
- `DailyCheckIn` — did the user explicitly check in? (+3 if yes)
- `LeetcodeLog.count` — LC problems solved that day
- `GithubDailyStat.commitCount` — GitHub commits that day
- `TaskCompletion` — daily checklist items completed that day
- `PlanTask` (completed = true) — plan tasks completed that day

```
score = (checkedIn ? 3 : 0) + leetcodeCount + githubCommits + dailyTasksDone + planTasksDone
```

Color thresholds (5 levels, DevTrack purple scale):
```
Level 0 (0):    #1a1a1e  (no activity)
Level 1 (1-2):  #3b2f6e
Level 2 (3-5):  #6d4fc2
Level 3 (6-9):  #a78bfa
Level 4 (10+):  #c4b5fd
```

Component: `ActivityHeatmap` (react-calendar-heatmap, client-only via `ActivityHeatmapLoader` dynamic import)

### Calendar heatmap (`/calendar`) — 120 days
Uses `getHeatmapData(planId, 120)` from `src/lib/plan/service.ts`.

Only aggregates `PlanTask` rows for the given plan:
```
score = completedPlanTasksCount (for that day)
```
Also tracks `totalTasks` and `estimatedHours` per day.

Component: `CalendarHeatmap` (in `src/components/plan/CalendarHeatmap.tsx`)

---

## Server Actions

All mutations are Server Actions in `src/app/actions/`:

| File | Actions |
|---|---|
| `plan.ts` | `generateCurrentWeekTasksAction`, `togglePlanTaskCompletion`, `addManualPlanTask`, `updatePlanTask`, `updatePlanConstraints`, `upsertDailyNote` |
| `tasks.ts` | `addDailyTask`, `toggleTaskCompletion`, `archiveDailyTask` |
| `goals.ts` | `addGoal`, `deleteGoal` |
| `settings.ts` | `saveGithubPat`, `runGithubSync` |
| `auth.ts` | `signOut` action |
| `checkin.ts` | `checkInToday` — upserts `DailyCheckIn` for today |
| `leetcode.ts` | `upsertLeetcodeLog`, `upsertLeetcodeForm` |

---

## GitHub Integration

```
User saves PAT in /settings
  → saveGithubPat() stores in Setting table (key: "github_pat")
  → runGithubSync() calls syncGithubContributions(userId)
      → reads PAT from Setting
      → POST https://api.github.com/graphql
         query: contributionsCollection (last 364 days)
      → upserts GithubDailyStat rows (date as ISO string)
      → updates Setting: github_last_sync, github_last_error
```

The sync is manual-trigger only (button on `/settings`). No automatic background sync.

**Rate limit:** 5000 req/hour for authenticated GraphQL — not a concern for single-user daily use.

---

## LeetCode Integration

Currently manual only. User enters count + notes on `/today` → `upsertLeetcodeLog` upserts `LeetcodeLog` for that date.

Planned (not built): POST to unofficial `https://leetcode.com/graphql` to pull `acSubmissionNum`.

---

## Client-Side State

- **TanStack Query v5** — `AppProviders` wraps `QueryClientProvider`. Used by `DashboardChartsLoader` to fetch chart data client-side after SSR shell renders.
- **React `useState`** — local UI state (date navigation on `/today`, form inputs, check-in modal open/close).
- **Native `<form action={serverAction}>`** — most mutations; no form library needed.
- **No global store** (no Redux, no Zustand, no Context for data).

---

## Supabase Notes

Supabase is the planned deploy target for Postgres (connect via `DATABASE_URL` standard connection string — no Supabase SDK in the Prisma data path).

`trySyncUserToSupabase()` (called from `upsertUserFromGitHub`) optionally mirrors `User` rows to Supabase `public.users` when `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` are set. Errors are swallowed. This is prep for future Supabase Auth/RLS migration — not active in the current data path.

---

## Environment Variables

```
# Required
DATABASE_URL          # Postgres connection string
AUTH_SECRET           # NextAuth session signing key (openssl rand -base64 32)
AUTH_GITHUB_ID        # GitHub OAuth App client ID
AUTH_GITHUB_SECRET    # GitHub OAuth App client secret

# Optional — Supabase user mirror (deploy prep only)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`DATABASE_URL` is required at both build time (Prisma generate) and runtime. The app throws on startup if it is missing.

---

## Environment Strategy

| Environment | Postgres | Auth Redirect |
|---|---|---|
| Local dev | Docker Compose (`localhost:5432`) | `http://localhost:3000` |
| Deploy (Vercel) | Any Postgres via `DATABASE_URL` | `https://<vercel-url>` |

---

## Important Constraints

- `DATABASE_URL` is mandatory at build and runtime — app throws immediately if absent.
- GitHub GraphQL contribution query range must be ≤ 1 year (API limit).
- All page components use `force-dynamic` — full-route cache is disabled intentionally.
- Middleware runs on the edge; `auth.config.ts` must not import Prisma or Node.js-only modules.
- LeetCode unofficial API may break at any time; manual entry path must always work.
- ISO date strings (`"YYYY-MM-DD"`) are the date representation throughout — never pass raw `Date` objects through Server Actions.

---

## What's Not Built Yet

| Item | Notes |
|---|---|
| LeetCode API scrape | Manual entry is the current default |
| `/stats` page | Charts on `/dashboard`; dedicated stats page planned |
| Goal metric tracking | Goals have category tags only; no target/progress/deadline |
| DnD task reorder | `@dnd-kit` installed; not wired in UI |
| Supabase RLS | Prisma server-side queries enforce isolation; RLS is a deploy-time addition |
| Auto GitHub sync on load | Only manual trigger via Settings |
| Multi-tenancy | Single-tenant by design; Goal, DailyTask, etc. have no userId |
