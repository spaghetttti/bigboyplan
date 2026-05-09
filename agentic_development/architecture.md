# Architecture Notes
> Last updated: 2026-05-08 (post schema rewrite)

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
        └── upserts User + UserSettings via Prisma on sign-in

Data layer
  └── Prisma 6 → PostgreSQL
        ├── Local dev: local Postgres (PGPASSWORD=devtrack)
        └── Deploy: Neon Postgres (plain DATABASE_URL connection string, no SDK)
              ✅ Live on Vercel + Neon (fresh schema deployed 2026-05)

External APIs
  ├── GitHub GraphQL API — contribution calendar sync (token from UserSettings)
  └── LeetCode — manual log only (API integration pending)
```

---

## Auth Flow

1. `/login` renders "Continue with GitHub" → Server Action calls `signIn('github', { redirectTo: '/dashboard' })`
2. GitHub OAuth redirect → NextAuth callback in `/api/auth/[...nextauth]`
3. `signIn` callback: `upsertUserFromGitHub()` inserts/updates `User` in Postgres
4. On first login: also creates `UserSettings` row and seeds 7 system `Category` rows via `ensureUserCategories(userId)`
5. JWT callback: maps `githubId` → internal `user.id`, sets `token.sub`
6. Session callback: attaches `user.id` to `session.user`
7. Middleware (`src/middleware.ts`): edge-safe `auth.config.ts`; all routes except `/login` and `/api/auth/*` require a valid session

**Auth in pages/actions:** All pages call `requireAuth()` from `lib/auth/require-auth.ts` which validates the session and checks the User row exists in DB. All server actions call `requireAuth()` as their first step.

---

## Data Layer

### Tenancy model — fully multi-user

Every table has a `userId` FK. All queries are scoped to the authenticated user. There is no shared/global data.

### Date storage — ISO strings, not DateTime

All "calendar date" fields are stored as `String` in `"YYYY-MM-DD"` format. This includes `Task.dueDate`, `TaskCompletion.date`, `LeetcodeLog.date`, `GithubDailyStat.date`, `JournalEntry.date`, `DailyCheckIn.date`, `Plan.startDate/endDate`. Avoids UTC timezone shifts. Timestamp fields (`createdAt`, `updatedAt`, `checkedAt`) remain proper `DateTime`.

### Prisma singleton

`src/lib/db.ts` exports a global `prisma` instance attached to `globalThis` to avoid connection pool exhaustion during hot reloads.

### Query patterns

- **Page data:** `async` server components call lib functions (which call Prisma). All pages export `dynamic = 'force-dynamic'`.
- **Mutations:** Server Actions call `requireAuth()`, call lib functions, then call `revalidatePath()`.
- **No REST routes for data** — only `/api/auth/[...nextauth]` exists.

---

## Task Model

`Task` is a unified model replacing the old `DailyTask` + `PlanTask` split:

```
isRecurring = true  → recurring daily checklist item (no dueDate)
                      completion tracked per-day via TaskCompletion rows

isRecurring = false → scheduled task with dueDate
                      completion tracked via Task.completed boolean
```

Tags are M:N via `TaskTag` (taskId, categoryId composite PK). `toggleTaskCompletion` in `lib/tasks.ts` handles both cases: recurring → upsert/delete `TaskCompletion`; scheduled → toggle `Task.completed`.

---

## Journal Model

`JournalEntry` is per (userId, date) with a unique constraint. Content is free text with `#hashtag` support. On every `upsertJournalEntry` call, existing `JournalTag` rows are deleted and recreated from parsed hashtags. Tags are M:N via `JournalTag` (journalId, categoryId composite PK).

---

## WeeklyGoal Model

`WeeklyGoal` has `weekNumber` + `year` (ISO week via `isoWeekFor(dateISO)` in `lib/weekly-goals.ts`). Status is derived automatically in `updateWeeklyGoalProgress`: `actualValue >= targetValue` → COMPLETED, else IN_PROGRESS. Status can also be set manually (e.g., MISSED).

---

## Activity Score & Heatmap

`aggregatesForHeatmap(userId, days)` in `src/lib/stats.ts` aggregates per day:

```
score = (checkedIn ? 3 : 0)
      + leetcodeCount (easy + medium + hard)
      + githubCommits
      + recurringCompletions (TaskCompletion rows)
      + scheduledTasksDone (Task.completed = true for that date)
      + (journaled ? 1 : 0)
```

Tooltip meta per day: `{ checkedIn, leetcode, github, recurringCompletions, scheduledTasksDone, journaled }`.

Color thresholds (5 levels, DevTrack purple scale):
```
Level 0 (0):    #1a1a1e
Level 1 (1-2):  #3b2f6e
Level 2 (3-5):  #6d4fc2
Level 3 (6-9):  #a78bfa
Level 4 (10+):  #c4b5fd
```

Component: `ActivityHeatmap` (react-calendar-heatmap, client-only via `ActivityHeatmapLoader`).

---

## Server Actions

All mutations in `src/app/actions/`:

| File | Key Actions |
|---|---|
| `tasks.ts` | `addTaskForm`, `toggleTaskCompletionForm`, `deleteTaskAction`, `updateTaskTagsForm` |
| `plan.ts` | `ensureActivePlanAction`, `createPlanForm`, `setActivePlanAction`, `archivePlanAction` |
| `weekly-goals.ts` | `addWeeklyGoalForm`, `updateWeeklyGoalProgressForm`, `setWeeklyGoalStatusAction`, `deleteWeeklyGoalAction` |
| `journal.ts` | `upsertJournalEntryForm` |
| `settings.ts` | `updateSettingsForm`, `runGithubSync` |
| `leetcode.ts` | `upsertLeetcodeForm` (easyCount / mediumCount / hardCount / notes) |
| `categories.ts` | `addCategory`, `deleteCategory`, `updateCategoryColor` |
| `checkin.ts` | `checkInToday` |
| `auth.ts` | `signOut` |

---

## GitHub Integration

```
User saves GitHub username + token in /settings → updateSettingsForm → UserSettings row
  → runGithubSync() calls syncGithubContributions(userId)
      → reads token via getGithubToken(userId) from UserSettings
      → POST https://api.github.com/graphql (contributionsCollection)
      → upserts GithubDailyStat rows { commits, prs: 0, reviews: 0 } per date
      → updates githubUsername in UserSettings
```

Manual trigger only (button on `/settings`).

---

## UserSettings

1:1 with User. Replaces the old `Setting` key-value table. Fields: `leetcodeUsername`, `githubUsername`, `githubToken`, `timezone`. Row is created on first login in `upsertUserFromGitHub`. Accessed via `getUserSettings(userId)` and mutated via `updateUserSettings(userId, patch)`.

---

## Environment Variables

```
# Required
DATABASE_URL          # Postgres connection string
AUTH_SECRET           # NextAuth session signing key
AUTH_GITHUB_ID        # GitHub OAuth App client ID
AUTH_GITHUB_SECRET    # GitHub OAuth App client secret
```

---

## What's Not Built Yet

| Item | Notes |
|---|---|
| LeetCode API scrape | Manual entry is the current path |
| WeeklyReport generation | Table exists in schema, no UI/logic |
| Google Calendar sync | Plan written: `agentic_development/google-calendar-notion-plan.md` |
| Notion sync | Plan written: same file |
| Planner week navigation | Can only view current week |
| DnD task reorder | `@dnd-kit` installed, not wired |
| Loading skeletons / error boundaries | Not implemented |
