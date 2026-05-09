# DevTrack — Specification
> Personal learning & goal tracker for backend/DevSecOps interview prep
> Version: 2.0 | Last updated: 2026-05-08 (post schema rewrite)

---

## 0. Quick Reference

| Item | Decision |
|---|---|
| Framework | Next.js 16.2.2 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 — single `@import "tailwindcss"` in globals.css |
| Database | PostgreSQL via Prisma ORM (local Postgres dev; Neon Postgres production) |
| Auth | NextAuth.js v5 beta — GitHub OAuth provider |
| Charts | Recharts v3 |
| Heatmaps | react-calendar-heatmap — `ActivityHeatmap` component on `/dashboard` and `/calendar` |
| Deployment | Vercel + Neon Postgres ✅ live |
| Mutations | Next.js Server Actions (no REST API routes for data) |
| State | TanStack Query v5 (client charts), `force-dynamic` SSR for page data |

---

## 1. Project Overview

**DevTrack** is a personal progress tracker for structured interview prep. It aggregates GitHub activity and manual LeetCode logs, combines them with daily tasks, journal entries, weekly goals, and check-ins, and surfaces everything as streaks, heatmaps, charts, and goal progress.

**Multi-user.** Every table is scoped by `userId`. GitHub OAuth is the sole identity provider.

### Core loop
1. Open the app daily
2. Hit the campfire check-in button
3. Check off recurring checklist tasks
4. Check off scheduled tasks from the planner
5. Log LeetCode problems (easy / medium / hard counts + notes)
6. Write a journal entry (supports #hashtags for category tagging)
7. Track weekly goals with target values and progress
8. Sync GitHub contributions from Settings

---

## 2. Information Architecture

```
/                 → redirect to /dashboard
/login            → GitHub OAuth
/dashboard        → streak, summary grid, heatmap, weekly goals, combined chart
/planner          → 7-column weekly task board + add-task form
/today            → recurring checklist, scheduled tasks, journal, LeetCode log, weekly goals
/goals            → WeeklyGoal CRUD with progress bars
/calendar         → 365-day heatmap + day detail (tasks + journal)
/settings         → UserSettings (usernames, token, timezone), categories, plan bootstrap
```

---

## 3. Database Schema

### 3.1 `User`
```prisma
id          String   @id @default(cuid())
githubId    String   @unique
githubLogin String
email       String?
avatarUrl   String?
createdAt   DateTime @default(now())
```

### 3.2 `UserSettings` — 1:1 with User
```prisma
id                 String    @id @default(cuid())
userId             String    @unique
leetcodeUsername   String?
githubUsername     String?
githubToken        String?
timezone           String    @default("UTC")
updatedAt          DateTime  @updatedAt
```
Created on first login. Accessed via `getUserSettings(userId)`.

### 3.3 `Category`
```prisma
id        String  @id @default(cuid())
userId    String
name      String                        -- uppercase: "DSA", "JAVA", etc.
color     String  @default("#a78bfa")   -- hex
sortOrder Int     @default(0)
isSystem  Boolean @default(false)       -- system rows protected from delete

@@unique([userId, name])
```
7 system defaults seeded on first login: `DSA`, `JAVA`, `DESIGN`, `DEVOPS`, `REVIEW`, `MOCK`, `OTHER`.

### 3.4 `Plan`
```prisma
id          String   @id @default(cuid())
userId      String
title       String
description String?
startDate   String   -- "YYYY-MM-DD"
endDate     String   -- "YYYY-MM-DD"
isActive    Boolean  @default(true)
isArchived  Boolean  @default(false)
createdAt   DateTime @default(now())
```
Thin umbrella — no phases, templates, or constraints. One active plan per user.

### 3.5 `WeeklyGoal`
```prisma
id          String           @id @default(cuid())
userId      String
planId      String?
categoryId  String?
weekNumber  Int               -- ISO week number (1-53)
year        Int
title       String
description String?
targetValue Float
metricUnit  String
actualValue Float            @default(0)
status      WeeklyGoalStatus @default(PENDING)
createdAt   DateTime         @default(now())

enum WeeklyGoalStatus { PENDING IN_PROGRESS COMPLETED MISSED }
```

### 3.6 `Task`
```prisma
id          String    @id @default(cuid())
userId      String
title       String
notes       String?
completed   Boolean   @default(false)
isRecurring Boolean   @default(false)
dueDate     String?   -- "YYYY-MM-DD"; null for recurring
completedAt DateTime?
createdAt   DateTime  @default(now())
taskTags    TaskTag[]
completions TaskCompletion[]
```

- `isRecurring = true`: daily checklist item. Per-day completion via `TaskCompletion`.
- `isRecurring = false`: scheduled task with `dueDate`. Completion via `Task.completed`.

### 3.7 `TaskTag` — M:N junction
```prisma
taskId     String
categoryId String

@@id([taskId, categoryId])
```

### 3.8 `TaskCompletion`
```prisma
id     String @id @default(cuid())
taskId String
date   String -- "YYYY-MM-DD"

@@unique([taskId, date])
```

### 3.9 `JournalEntry`
```prisma
id             String       @id @default(cuid())
userId         String
date           String        -- "YYYY-MM-DD"
content        String
notionSyncedAt DateTime?     -- null = not synced; reset when content changes
createdAt      DateTime      @default(now())
updatedAt      DateTime      @updatedAt
tags           JournalTag[]

@@unique([userId, date])
```
#hashtags in content are parsed on save → `JournalTag` rows created.

### 3.10 `JournalTag` — M:N junction
```prisma
journalId  String
categoryId String

@@id([journalId, categoryId])
```

### 3.11 `LeetcodeLog`
```prisma
id          String  @id @default(cuid())
userId      String
date        String  -- "YYYY-MM-DD"
easyCount   Int     @default(0)
mediumCount Int     @default(0)
hardCount   Int     @default(0)
notes       String?

@@unique([userId, date])
```

### 3.12 `GithubDailyStat`
```prisma
id        String   @id @default(cuid())
userId    String
date      String   -- "YYYY-MM-DD"
commits   Int      @default(0)
prs       Int      @default(0)
reviews   Int      @default(0)
updatedAt DateTime @updatedAt

@@unique([userId, date])
```

### 3.13 `DailyCheckIn`
```prisma
id        String   @id @default(cuid())
userId    String
date      String   -- "YYYY-MM-DD"
checkedAt DateTime @default(now())

@@unique([userId, date])
```

### 3.14 `WeeklyReport`
```prisma
id          String   @id @default(cuid())
userId      String
planId      String?
weekNumber  Int
year        Int
snapshot    Json
generatedAt DateTime @default(now())
```
Table exists; no UI or generation logic yet.

---

## 4. Authentication

- **Provider:** GitHub OAuth via NextAuth.js v5
- **Auth boundary:** `requireAuth()` in `lib/auth/require-auth.ts` — used by every page and server action. Returns `userId` string, redirects to `/login` if not authenticated.
- **On first login:** creates `User`, `UserSettings`, and seeds 7 system `Category` rows.
- **Session:** JWT in HTTP-only cookie. `session.user.id` = Postgres `User.id`.
- **Middleware:** edge-safe `auth.config.ts`; protects all routes except `/login` and `/api/auth/*`.

---

## 5. External Integrations

### 5.1 GitHub ✅
- **Token:** stored in `UserSettings.githubToken` (set via Settings form)
- **Sync:** `syncGithubContributions(userId)` → GitHub GraphQL contributionsCollection → upserts `GithubDailyStat` (fills `commits` only; `prs`/`reviews` default to 0)
- **Trigger:** manual "Sync GitHub" button in `/settings`

### 5.2 LeetCode ⚠️ Manual only
- User enters easy/medium/hard counts + notes on `/today`
- Stored as `LeetcodeLog` row per (userId, date)

### 5.3 Google Calendar 📋 Planned
- See `agentic_development/google-calendar-notion-plan.md`

### 5.4 Notion 📋 Planned
- See `agentic_development/google-calendar-notion-plan.md`

---

## 6. Server Actions (`src/app/actions/`)

| File | Key Actions |
|---|---|
| `tasks.ts` | `addTaskForm`, `toggleTaskCompletionForm(taskId, date)`, `deleteTaskAction`, `updateTaskTagsForm` |
| `plan.ts` | `ensureActivePlanAction`, `createPlanForm`, `setActivePlanAction`, `archivePlanAction` |
| `weekly-goals.ts` | `addWeeklyGoalForm`, `updateWeeklyGoalProgressForm`, `setWeeklyGoalStatusAction`, `deleteWeeklyGoalAction` |
| `journal.ts` | `upsertJournalEntryForm` (empty content → delete entry) |
| `settings.ts` | `updateSettingsForm` (all UserSettings fields), `runGithubSync` |
| `leetcode.ts` | `upsertLeetcodeForm` (easyCount / mediumCount / hardCount / notes) |
| `categories.ts` | `addCategory`, `deleteCategory`, `updateCategoryColor` |
| `checkin.ts` | `checkInToday` |
| `auth.ts` | `signOut` |

All actions return `void` (compatible with `<form action>`) or a result object for interactive buttons.

---

## 7. Pages & Key Components

### `/today`
- Recurring task checklist (Task `isRecurring=true`) with per-day `TaskCompletion` tracking
- Scheduled tasks for today (Task `isRecurring=false, dueDate=today`)
- Journal editor (`JournalForm`) with #hashtag → tag chip display
- LeetCode log form (easy/medium/hard counts + notes)
- Weekly goals sidebar

### `/planner`
- 7-column board: Tasks grouped by `dueDate` for current week
- Add-task form with `MultiTagPicker` for M:N category selection
- Recurring task add section

### `/goals`
- WeeklyGoal list for current ISO week: title, targetValue/metricUnit, progress bar, status badge
- Inline progress update form
- Add goal form: title, targetValue, metricUnit, categoryId, description

### `/calendar`
- 365-day `ActivityHeatmap` with tooltip showing daily breakdown
- Date navigation (prev/next, date picker)
- Day tasks with completion toggles
- `JournalForm` + tag chip display

### `/dashboard`
- Summary grid: day streak, weekly task count, 7-day LeetCode total, hybrid activity score
- `CheckInButton` (campfire)
- 365-day `ActivityHeatmap`
- Weekly goals progress cards
- 30-day combined line chart (LeetCode / tasks / GitHub)

### `/settings`
- `UserSettings` form: leetcodeUsername, githubUsername, githubToken, timezone
- GitHub sync button (`SyncGithubButton`)
- Categories: list with color picker, add custom, delete non-system
- Plan bootstrap ("Ensure active plan")

### Key components
| Component | Location |
|---|---|
| `WeeklyPlannerBoard` | `components/plan/WeeklyPlannerBoard.tsx` — client, accepts `TaskWithTags[]` |
| `MultiTagPicker` | `components/MultiTagPicker.tsx` — toggle-chip tag selector for forms |
| `ActivityHeatmap` | `components/ActivityHeatmap.tsx` — react-calendar-heatmap wrapper |
| `PlanTag` | `components/plan/PlanTag.tsx` — category badge chip |
| `JournalForm` | `components/forms/JournalForm.tsx` — textarea + submit |
| `LeetcodeForm` | `components/forms/LeetcodeForm.tsx` — easy/medium/hard inputs |
| `SyncGithubButton` | `components/SyncGithubButton.tsx` — async action button with loading state |
| `CheckInButton` | `components/CheckInButton.tsx` — campfire check-in |

---

## 8. Design System

### Colors
```css
--bg: #0d0d0f
--surface: #141416
--surface2: #1a1a1e
--border: rgba(255,255,255,0.07)
--text: #e8e6e0
--muted: #6b6966
--muted2: #9b9893
--purple: #a78bfa     /* primary accent */
--teal: #2dd4bf       /* success / GitHub */
--amber: #fbbf24      /* warning */
--coral: #f87171      /* danger */
--green: #4ade80      /* LC easy */
--blue: #60a5fa       /* info */
```

### Typography
- Display / headings: `Syne` — weights 700, 800
- Mono / labels / badges: `DM Mono` — weights 400, 500

### Conventions
- Cards: `bg-surface border border-border rounded-xl p-4`
- Category badges: `PlanTag` — font-mono uppercase tracking-widest, color from `Category.color`
- Inputs: global CSS → `bg-surface2 border border-border2 rounded-lg px-3 py-2 text-text`
- Category color applied inline via `style` prop (not Tailwind class — colors are user-defined hex values)

---

## 9. Not Yet Built

| Feature | Notes |
|---|---|
| Google Calendar sync | Plan in `google-calendar-notion-plan.md` |
| Notion sync | Plan in `google-calendar-notion-plan.md` |
| LeetCode API scrape | Manual entry is current default |
| WeeklyReport UI | Table exists, no generation logic |
| Planner week navigation | Current week only; no prev/next |
| DnD task reorder | `@dnd-kit` installed, not wired |
| Loading skeletons / error boundaries | Not implemented |
| Gender-inclusive app name option | Settings option to rename "Big Boy Plan" |
| Error toast styling distinct from success | Toasts exist but styling not differentiated |
