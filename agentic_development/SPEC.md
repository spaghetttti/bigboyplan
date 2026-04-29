# DevTrack — MVP Specification
> Personal learning & goal tracker for backend/DevSecOps interview prep
> Version: 1.3 MVP | Last updated: 2026-04-29 session 2 (reflects actual built state)

---

## 0. Quick Reference

| Item | Decision |
|---|---|
| Framework | Next.js 16.2.2 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 — single `@import "tailwindcss"` in globals.css, no external CSS packages |
| Database | PostgreSQL via Prisma ORM (local Docker; deploy target: Neon Postgres) |
| Auth | NextAuth.js v5 beta — GitHub OAuth provider |
| Charts | Recharts v3 |
| Heatmaps | react-calendar-heatmap — single `ActivityHeatmap` component used on both `/dashboard` and `/calendar` |
| Deployment | Vercel (target) |
| Mobile | Fully responsive |
| Mutations | Next.js Server Actions (not REST API routes) |
| State | TanStack Query v5 (client), `force-dynamic` SSR for page data |

---

## 1. Project Overview

**DevTrack** is a personal progress tracker for a structured 4-month backend/DevSecOps interview prep plan. It aggregates activity from GitHub and manual LeetCode logs, combines it with daily plan tasks, daily check-ins, and notes, and surfaces everything as visualizations — streaks, heatmaps, charts, and goal progress.

**Single-user, single-tenant.** This is not a SaaS product. Most data tables have no `userId` — they are global to the single running instance.

### Core loop
1. Open the app daily
2. Hit the campfire check-in button (records `DailyCheckIn`)
3. Check off today's plan tasks (auto-generated from weekly templates)
4. Log today's LeetCode count
5. GitHub activity syncs via PAT-authenticated API call (Settings)
6. Dashboard shows streak + charts + 365-day activity heatmap
7. Goals track against the 4-phase plan with category tags

---

## 2. Information Architecture

```
/                        → redirect to /dashboard if logged in, else /login
/login                   → GitHub OAuth login page
/dashboard               → main daily view (streak, summary, 365-day heatmap, charts)
/planner                 → weekly board view (plan tasks by day + category)
/today                   → daily checklist (recurring tasks + plan tasks + LC log)
/calendar                → 365-day activity heatmap + day detail panel + daily note editor
/goals                   → goal list with category tags
/settings                → GitHub PAT, sync trigger, plan constraints, plan bootstrap
```

---

## 3. Database Schema (Prisma / PostgreSQL)

### Date storage convention
All fields representing a calendar date (with no time component) are stored as `String` in `"YYYY-MM-DD"` format. This avoids timezone edge cases — PostgreSQL `DateTime` stores UTC, which shifts dates when queried from non-UTC timezones. Timestamp fields (`createdAt`, `updatedAt`, `checkedAt`) remain proper `DateTime`.

### 3.1 `User`
```prisma
id               String   @id @default(uuid())
githubId         String   @unique @map("github_id")
githubLogin      String   @map("github_login")
email            String?
avatarUrl        String?  @map("avatar_url")
leetcodeUsername String?  @map("leetcode_username")
githubUsername   String?  @map("github_username")
createdAt        DateTime @default(now()) @map("created_at")
plans            Plan[]

@@map("users")
```

### 3.2 `Setting` — global key-value store
```prisma
key   String @id
value String
```
Keys in use: `github_pat`, `github_last_sync`, `github_last_error`.

### 3.3 `Category` — user-managed category list
```prisma
id        String  @id @default(cuid())
name      String  @unique       -- uppercase: "DSA", "JAVA", "RUST", etc.
color     String  @default("#6b6966")  -- hex, maps to design-system token
sortOrder Int     @default(0)
isSystem  Boolean @default(false)  -- true = seeded default, protected from delete

@@map("categories")
```
Seeded defaults (isSystem = true): `DSA`, `JAVA`, `DESIGN`, `DEVOPS`, `REVIEW`, `MOCK`, `OTHER`.
Users can add custom categories and change colors for any category from the Settings page.
`PlanCategory` Prisma enum was removed — all category fields are now plain `String`.

### 3.4 `Goal`
```prisma
id         String    @id @default(cuid())
title      String
category   String    @default("OTHER")   -- references Category.name by value (no FK)
phase      String?
targetDate DateTime?
sortOrder  Int       @default(0)
createdAt  DateTime  @default(now())
```

### 3.4 `DailyTask` — recurring checklist items (independent of plan)
```prisma
id          String           @id @default(cuid())
title       String
sortOrder   Int              @default(0)
archived    Boolean          @default(false)
createdAt   DateTime         @default(now())
completions TaskCompletion[]
```

### 3.5 `TaskCompletion`
```prisma
id     String    @id @default(cuid())
taskId String
date   String    -- "YYYY-MM-DD"
task   DailyTask @relation(...)

@@unique([taskId, date])
@@index([date])
```

### 3.6 `LeetcodeLog`
```prisma
id    String  @id @default(cuid())
date  String  @unique   -- "YYYY-MM-DD"
count Int
notes String?
```

### 3.7 `GithubDailyStat`
```prisma
id          String   @id @default(cuid())
date        String   @unique   -- "YYYY-MM-DD"
commitCount Int
updatedAt   DateTime @updatedAt
```

### 3.8 `DailyCheckIn` — campfire daily check-in
```prisma
id        String   @id @default(cuid())
date      String   @unique   -- "YYYY-MM-DD"
checkedAt DateTime @default(now())

@@index([date])
```
One row per calendar day. Upserted by `checkInToday()` server action. Powers the campfire animation on the dashboard and contributes +3 to the activity score.

### 3.9 `Plan` ← primary aggregate root
```prisma
id          String           @id @default(cuid())
userId      String?          -- nullable; plan can exist without a User row
title       String
description String?
startDate   String           -- "YYYY-MM-DD"
endDate     String           -- "YYYY-MM-DD"
isActive    Boolean          @default(true)
createdAt   DateTime         @default(now())
updatedAt   DateTime         @updatedAt
user        User?            @relation(...)
constraints PlanConstraint[]
phases      PlanPhase[]
milestones  PlanMilestone[]
templates   WeeklyTemplate[]
tasks       PlanTask[]
notes       DailyNote[]

@@index([userId])
```

### 3.10 `PlanConstraint`
```prisma
id               String  @id @default(cuid())
planId           String
minHoursPerWeek  Int?
maxHoursPerWeek  Int?
hasFullTimeJob   Boolean @default(false)
eveningsWeekends Boolean @default(false)
note             String?
plan             Plan    @relation(...)

@@index([planId])
```

### 3.11 `PlanPhase`
```prisma
id          String   @id @default(cuid())
planId      String
monthNumber Int      -- 1-4
title       String
focus       String
weekStart   Int
weekEnd     Int
sortOrder   Int
createdAt   DateTime @default(now())
plan        Plan     @relation(...)
milestones  PlanMilestone[]
templates   WeeklyTemplate[]
tasks       PlanTask[]

@@index([planId, sortOrder])
```
Phases: Month 1 Foundation → Month 2 Build → Month 3 Depth → Month 4 Fire.

### 3.12 `PlanMilestone`
```prisma
id          String     @id @default(cuid())
planId      String
phaseId     String?
label       String
value       String
isCompleted Boolean    @default(false)
sortOrder   Int        @default(0)
plan        Plan       @relation(...)
phase       PlanPhase? @relation(...)

@@index([planId, sortOrder])
@@index([phaseId])
```

### 3.13 `WeeklyTemplate` ← recurring task blueprint
```prisma
id             String       @id @default(cuid())
planId         String
phaseId        String?
weekday        Int          -- 0=Sun … 6=Sat
title          String
detail         String?
category       PlanCategory -- DSA|JAVA|DESIGN|DEVOPS|REVIEW|MOCK
estimatedHours Float?
isActive       Boolean      @default(true)
sortOrder      Int          @default(0)
plan           Plan         @relation(...)
phase          PlanPhase?   @relation(...)
tasks          PlanTask[]

@@index([planId, weekday, sortOrder])
@@index([phaseId])
```

### 3.14 `PlanTask` ← daily task instances
```prisma
id             String          @id @default(cuid())
planId         String
phaseId        String?
templateId     String?
date           String          -- "YYYY-MM-DD"
title          String
detail         String?
category       PlanCategory
estimatedHours Float?
completed      Boolean         @default(false)
source         PlanTaskSource  @default(MANUAL)
createdAt      DateTime        @default(now())
updatedAt      DateTime        @updatedAt
plan           Plan            @relation(...)
phase          PlanPhase?      @relation(...)
template       WeeklyTemplate? @relation(...)

@@index([planId, date])
@@index([phaseId])
@@index([templateId])
```

### 3.15 `DailyNote`
```prisma
id        String   @id @default(cuid())
planId    String
date      String   -- "YYYY-MM-DD"
content   String
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
plan      Plan     @relation(...)

@@unique([planId, date])
@@index([planId, date])
```
Hashtags (`#dsa`, `#java`, `#design`, `#devops`, `#review`) are extracted at read time via `extractGoalMentionsFromNote()` and displayed as category pills.

### Enum
```prisma
enum PlanTaskSource { TEMPLATE MANUAL }
```
`PlanCategory` was removed. Categories are now stored in the `Category` table.

---

## 4. Authentication

- **Provider:** GitHub OAuth via NextAuth.js v5 (beta)
- **Config split:** `src/auth.config.ts` (provider config, edge-safe) + `src/auth.ts` (full callbacks with Prisma, Node.js only)
- On first login: upsert `User` row using GitHub profile data; optionally mirror to Supabase `public.users` (swallowed on error)
- Session shape: `{ user: { id: string, name: string, email: string, image: string } }`
- `session.user.id` = Postgres `User.id` UUID — used as auth boundary in user-scoped Server Actions
- Middleware: protects all routes except `/login` and `/api/auth/*`
- Session token stored in HTTP-only cookie (JWT strategy)

---

## 5. External Integrations

### 5.1 GitHub Integration ✅ Built
- **API:** GitHub GraphQL API (`https://api.github.com/graphql`)
- **Auth:** Personal Access Token (PAT) stored in `Setting` table (`github_pat`)
- **Query:** Contribution calendar for last 364 days
- **Storage:** Upserts into `GithubDailyStat` per date (ISO string)
- **Trigger:** Settings page "Sync GitHub now" → `runGithubSync()` Server Action
- **Incremental sync:** first run fetches full 364 days; subsequent runs fetch only `(days since last sync) + 7` days — historical rows are never overwritten
- **Status tracking:** `github_last_sync` + `github_last_error` in `Setting` table

### 5.2 LeetCode Integration ⚠️ Manual only
- **Current:** Manual daily entry form on `/today` → `upsertLeetcodeLog()` Server Action
- **Storage:** `LeetcodeLog` table (date + count + notes)
- **Future:** Unofficial GraphQL endpoint — planned but not implemented

---

## 6. Server Actions

All mutations use Next.js Server Actions in `src/app/actions/`:

### `plan.ts`
| Action | Description |
|---|---|
| `generateCurrentWeekTasksAction()` | Generate `PlanTask` rows from `WeeklyTemplate` for current week |
| `togglePlanTaskCompletion(taskId)` | Toggle task done/undone |
| `addManualPlanTask(formData)` | Create one-off `PlanTask` |
| `updatePlanTask(formData)` | Edit task (date, title, category, hours) |
| `updatePlanConstraints(formData)` | Save plan hour/schedule constraints |
| `upsertDailyNote(formData)` | Save note for a (planId, date) pair |

### `tasks.ts`
| Action | Description |
|---|---|
| `addDailyTask(title)` | Create recurring checklist task |
| `toggleTaskCompletion(taskId, date)` | Mark checklist task done for date |
| `archiveDailyTask(taskId)` | Soft-delete checklist task |

### `goals.ts`
| Action | Description |
|---|---|
| `addGoal(title, category)` | Create goal with category tag |
| `deleteGoal(id)` | Delete goal |

### `settings.ts`
| Action | Description |
|---|---|
| `saveGithubPat(pat)` | Store GitHub PAT in Setting table |
| `runGithubSync()` | Trigger contribution sync + update Setting timestamps |

### `checkin.ts`
| Action | Description |
|---|---|
| `checkInToday()` | Upsert `DailyCheckIn` for today's date |

### `leetcode.ts`
| Action | Description |
|---|---|
| `upsertLeetcodeLog(date, count, notes?)` | Upsert LC count for a date |
| `upsertLeetcodeForm(formData)` | Form wrapper for upsertLeetcodeLog |

### `categories.ts`
| Action | Description |
|---|---|
| `addCategory(formData)` | Create a new custom category with name + color |
| `deleteCategory(id, formData)` | Delete a non-system category |
| `updateCategoryColor(id, formData)` | Change the color of any category |

### `auth.ts`
| Action | Description |
|---|---|
| `signOut()` | NextAuth sign-out |

---

## 7. Pages & Components

### 7.1 `/dashboard` — Overview
**Data shown:**
- 4-card summary grid: day streak, this-week task count, 7-day LC total, hybrid score %
- Campfire check-in button (campfire GIF animation on check-in)
- 365-day activity heatmap (react-calendar-heatmap, DevTrack purple scale)
- "X days checked in this month" stat
- Plan constraints summary
- Phase timeline (4 phases)
- Last-30-day combined chart (LeetCode, Tasks, GitHub lines)
- Last GitHub sync timestamp + error badge

**Components:** `SummaryGrid`, `CheckInButton`, `ActivityHeatmapLoader` → `ActivityHeatmap`, `DashboardChartsLoader` → `DashboardCharts`

### 7.2 `/planner` — Weekly Board
- Weekly task board grouped by day of week
- Each task card: title, category badge, estimated hours, completion checkbox
- "Generate this week's tasks" button (from templates)
- "Add manual task" form (date, title, category, hours)
- Plan constraints shown at top

**Components:** `WeeklyPlannerBoard`, `PlanTag`

### 7.3 `/today` — Daily Checklist
- Date navigation (prev/next day arrows)
- Recurring daily tasks (checkboxes) from `DailyTask` + `TaskCompletion`
- Today's plan tasks from `PlanTask`
- LeetCode log form (count + notes, upsert for date)

### 7.4 `/calendar` — Activity Heatmap + Daily Note
- 365-day activity heatmap (same component and data source as `/dashboard`)
- Date picker → day detail: plan tasks for that date with completion toggles
- Daily note editor (textarea, save via Server Action)
- Extracted hashtag category pills shown after note

**Components:** `ActivityHeatmapLoader` → `ActivityHeatmap`

### 7.5 `/goals` — Goal List
- Goals listed with category badge
- Add goal form (title + category dropdown, includes "OTHER")
- Delete goal button
- Not yet built: target values, deadlines, progress bars

### 7.6 `/settings`
- GitHub PAT input
- "Sync GitHub now" button with loading state
- Last synced timestamp + error display
- Plan constraints form
- "Bootstrap plan from seed" button
- Categories section: list all categories with color picker, add custom categories, delete non-system categories

### 7.7 `/login`
- Centered card, dark background
- "Track the grind." tagline
- "Continue with GitHub" button → Server Action → `signIn('github', { redirectTo: '/dashboard' })`

---

## 8. Design System

### Colors (Tailwind CSS v4 custom properties)
```css
--bg: #0d0d0f          /* page background */
--surface: #141416      /* card background */
--surface2: #1a1a1e     /* input / elevated surface */
--border: rgba(255,255,255,0.07)
--text: #e8e6e0
--muted: #6b6966
--muted2: #9b9893
--purple: #a78bfa       /* primary accent */
--teal: #2dd4bf         /* success / GitHub */
--amber: #fbbf24        /* warning */
--coral: #f87171        /* danger */
--green: #4ade80        /* LC easy */
--blue: #60a5fa         /* info */
```

### Heatmap color scale
```css
--heatmap-0: #1a1a1e   /* no activity */
--heatmap-1: #3b2f6e   /* 1-2 */
--heatmap-2: #6d4fc2   /* 3-5 */
--heatmap-3: #a78bfa   /* 6-9 */
--heatmap-4: #c4b5fd   /* 10+ */
```

### Typography
- Display / headings: `Syne` (Google Fonts) — weights 700, 800
- Mono / labels / badges: `DM Mono` — weights 400, 500
- Body: `Syne` with `ui-sans-serif` fallback

### Component conventions
- Cards: `bg-surface border border-border rounded-xl p-4`
- Category badges: `PlanTag` component — font-mono uppercase tracking-widest
- Buttons: `Button` component (variant: default / outline / ghost)
- Inputs: global CSS rule on `input[type="text"]` etc. → `bg-surface2 border border-border2 rounded-lg px-3 py-2 text-text`
- Dark theme only (no toggle for MVP)

---

## 9. State Management

- **Server state:** Page data via direct Prisma queries in `async` server components
- **Client async state:** TanStack Query v5 — used by `DashboardChartsLoader` for chart data
- **UI state:** React `useState` — forms, toggles, date navigation, modal open/close
- **Form mutations:** Native `<form action={serverAction}>` for most mutations
- **No Redux, no Zustand, no Context for data**

---

## 10. Key Technical Decisions

### Server Actions over REST routes
All mutations use Server Actions. Avoids auth boilerplate on every route, leverages `revalidatePath()` for cache invalidation, keeps mutation logic co-located with the UI.

### String dates over DateTime
All calendar-date fields are `String "YYYY-MM-DD"`. Avoids timezone issues where UTC DateTime shifts dates for non-UTC users. String range queries (`gte: "2026-04-01"`) work reliably across all Postgres environments.

### Prisma over Supabase client
Prisma is the primary data layer. Supabase is the planned Postgres host for deploy (via `DATABASE_URL` connection string only). The Supabase JS SDK is installed for potential future RLS migration but is not in the active data path.

### Single-tenant data model
Goal, DailyTask, LeetcodeLog, GithubDailyStat, Setting, DailyCheckIn have no `userId`. Sufficient for a personal tool. Documented explicitly so the tradeoff is clear if users are ever added.

### Plan-centric aggregate
Data organized around a `Plan` aggregate root. Templates define recurring weekly structure; `PlanTask` instances are generated on demand from templates for a date range. This enables "what should I do this week?" queries without manual task creation.

### Force-dynamic rendering
All data pages use `export const dynamic = 'force-dynamic'`. Intentional for a daily-use app where stale data is harmful.

### Auth config split for edge
`auth.config.ts` is edge-safe (no Prisma). `auth.ts` extends it with full Node.js callbacks. Middleware can run on the Vercel edge runtime without pulling in Node.js-only deps.

---

## 11. File Structure

```
tracker/
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── layout.tsx              ← AppShell (nav + auth guard)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── planner/page.tsx
│   │   │   ├── today/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   ├── goals/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── login/page.tsx
│   │   ├── actions/
│   │   │   ├── plan.ts
│   │   │   ├── tasks.ts
│   │   │   ├── goals.ts
│   │   │   ├── settings.ts
│   │   │   ├── checkin.ts
│   │   │   ├── leetcode.ts
│   │   │   └── auth.ts
│   │   ├── api/
│   │   │   └── auth/[...nextauth]/route.ts
│   │   ├── layout.tsx                  ← fonts (Syne, DM Mono), metadata, QueryProvider
│   │   ├── page.tsx                    ← redirect to /dashboard
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   │   └── button.tsx              ← base Button component
│   │   ├── plan/
│   │   │   ├── PlanTag.tsx             ← category badge
│   │   │   └── WeeklyPlannerBoard.tsx
│   │   ├── providers/
│   │   │   └── app-providers.tsx       ← TanStack QueryClientProvider
│   │   ├── ActivityHeatmap.tsx         ← full activity heatmap (/dashboard + /calendar)
│   │   ├── ActivityHeatmapLoader.tsx   ← dynamic import wrapper (ssr: false)
│   │   ├── AppShell.tsx                ← nav sidebar + layout shell
│   │   ├── CheckInButton.tsx           ← campfire check-in button + modal
│   │   ├── DashboardCharts.tsx
│   │   ├── DashboardChartsLoader.tsx
│   │   ├── SummaryGrid.tsx
│   │   └── SyncGithubButton.tsx
│   ├── lib/
│   │   ├── db.ts                       ← Prisma singleton (includes manual model type list)
│   │   ├── github.ts                   ← GitHub GraphQL sync (incremental)
│   │   ├── stats.ts                    ← aggregation queries (streak, heatmap, charts)
│   │   ├── settings.ts                 ← key-value Setting helpers
│   │   ├── categories.ts               ← getAllCategories(), colorClassForCategory()
│   │   ├── dates.ts                    ← ISO date utilities
│   │   ├── tags.ts                     ← category name → Tailwind class (fallback for known names)
│   │   ├── utils.ts                    ← cn()
│   │   ├── chart.ts                    ← chart tick formatters
│   │   ├── types.ts                    ← DayAggregate, MetricType
│   │   ├── plan/
│   │   │   ├── service.ts              ← seeding, task generation, plan heatmap
│   │   │   ├── seed-data.ts            ← FOUR_MONTH_SEED constant
│   │   │   └── note-tags.ts            ← #hashtag → category extractor
│   │   ├── auth/
│   │   │   ├── upsert-github-user.ts
│   │   │   └── sync-user-supabase.ts   ← optional Supabase mirror (swallows errors)
│   │   └── supabase/                   ← not active in data path; deploy prep only
│   │       ├── client.ts
│   │       ├── server.ts
│   │       ├── admin.ts
│   │       └── middleware.ts
│   ├── auth.ts                         ← NextAuth config (Node.js, Prisma callbacks)
│   ├── auth.config.ts                  ← NextAuth provider config (edge-safe)
│   └── middleware.ts                   ← route protection (edge runtime)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── agentic_development/
│   ├── SPEC.md                         ← this file
│   ├── architecture.md
│   └── todo.md
├── docker-compose.yml
└── .env.local.example
```

---

## 12. Environment Variables

```bash
# Required at build time and runtime
DATABASE_URL=postgresql://devtrack:devtrack@localhost:5432/devtrack?schema=public

AUTH_SECRET=                    # openssl rand -base64 32
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

# Optional — Supabase user mirror only (not in Prisma data path)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 13. MVP Scope

### Built ✅
- GitHub OAuth login (NextAuth v5)
- Dashboard: streak, summary grid, campfire check-in button, 365-day activity heatmap, combined chart
- Planner: weekly board, template-driven task generation
- Today: daily checklist, plan tasks, LeetCode log
- Calendar: 120-day plan heatmap, day detail panel, daily note editor with hashtag categories
- Goals: list with category tags, add/delete
- Settings: GitHub PAT, sync trigger, plan constraints, plan bootstrap
- GitHub activity sync (GraphQL contribution calendar)
- Plan model: 4 phases, weekly templates, task instances, milestones
- DailyCheckIn model + campfire check-in animation
- Dynamic categories — `Category` table, user-managed from Settings, color picker per category
- Incremental GitHub sync — only fetches new days after first full sync
- Unified activity heatmap on both `/dashboard` and `/calendar` (react-calendar-heatmap)
- Mobile responsive

### Not Yet Built ❌
- LeetCode API scrape (manual-only currently)
- `/stats` dedicated page (charts on `/dashboard`)
- Goal target values, deadlines, progress bars, metric tracking
- Drag-and-drop task reorder (`@dnd-kit` installed, not wired)
- Supabase RLS (using Prisma server-side; RLS is deploy-time concern)
- Loading skeletons and error boundaries

### Out of scope (post-MVP)
- Multiple users / sharing
- Dark/light mode toggle (dark only)
- Export to CSV / PDF
- AI summaries
- Markdown in notes
- Calendar integration

---

## 14. Remaining Build Order

1. **Remote database** — provision Neon Postgres, run migrations, set `DATABASE_URL` in Vercel. Unblocks production deploy.
2. **Goal metrics** — Add `targetValue`, `currentValue`, `deadline` to `Goal`; wire up progress bars on `/goals`
3. **Stats page** — Move/expand charts to `/stats`; add LeetCode difficulty breakdown, GitHub weekly bars
4. **LeetCode API** — Attempt unofficial GraphQL scrape on `/api/sync/leetcode`; fall back to manual
5. **DnD task reorder** — Wire `@dnd-kit` to `WeeklyPlannerBoard` and `/today` task list
6. **Cleanup** — Delete `MonthConsistencyGrid.tsx` (dead code); add loading skeletons, empty states, error boundaries
