# DevTrack — MVP Specification
> Personal learning & goal tracker for backend/DevSecOps interview prep  
> Version: 1.1 MVP | Last updated: 2026-04-17 (reflects actual built state)

---

## 0. Quick Reference

| Item | Decision |
|---|---|
| Framework | Next.js 16.2.2 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (no shadcn — uses @base-ui/react + custom) |
| Database | PostgreSQL via Prisma ORM (local Docker; Supabase for deploy) |
| Auth | NextAuth.js v5 beta — GitHub OAuth provider |
| Charts | Recharts v3 |
| Deployment | Vercel (target) |
| Mobile | Fully responsive (mobile-first) |
| Mutations | Next.js Server Actions (not REST API routes) |
| State | TanStack Query v5 (client), `force-dynamic` SSR for page data |

---

## 1. Project Overview

**DevTrack** is a personal progress tracker for a structured 4-month backend/DevSecOps interview prep plan. It aggregates activity from GitHub and manual LeetCode logs, combines it with daily plan tasks and notes, and surfaces everything as visualizations — streaks, heatmaps, charts, and goal progress.

The primary user is a single authenticated person. This is not a SaaS product.

### Core loop
1. Open the app daily
2. Check off today's plan tasks (auto-generated from weekly templates)
3. Log today's LeetCode count
4. GitHub activity syncs via PAT-authenticated API call
5. Dashboard shows streak + charts + this-week plan board
6. Goals track against the 4-phase plan with category tags

---

## 2. Information Architecture

```
/                        → redirect to /dashboard if logged in, else /login
/login                   → GitHub OAuth login page
/dashboard               → main daily view (streak, charts, summary grid)
/planner                 → weekly board view (plan tasks by day + category)
/today                   → daily checklist (recurring tasks + plan tasks + LC log)
/calendar                → 120-day heatmap + day detail panel + daily note editor
/goals                   → goal list with category tags (DSA, JAVA, DESIGN, etc.)
/settings                → GitHub PAT, sync trigger, plan constraints, plan bootstrap
```

> **SPEC delta vs. original:** `/stats`, `/journal` pages not yet built. `/planner`, `/today`, `/calendar` replace what was originally `/dashboard` + `/journal` + `/stats` combined.

---

## 3. Database Schema (Prisma / PostgreSQL)

### 3.1 `User`
```prisma
id              String   @id @default(uuid())
githubId        String   @unique
githubLogin     String
email           String?
avatarUrl       String?
leetcodeUsername String?
githubUsername  String?
createdAt       DateTime @default(now())
plans           Plan[]
```

### 3.2 `Plan` ← primary aggregate root
```prisma
id          String   @id @default(uuid())
userId      String?
title       String
description String?
startDate   DateTime
endDate     DateTime
isActive    Boolean  @default(true)
createdAt   DateTime @default(now())
updatedAt   DateTime @updatedAt
constraints PlanConstraint[]
phases      PlanPhase[]
milestones  PlanMilestone[]
templates   WeeklyTemplate[]
tasks       PlanTask[]
notes       DailyNote[]
```

### 3.3 `PlanConstraint`
```prisma
planId           String
minHoursPerWeek  Int
maxHoursPerWeek  Int
hasFullTimeJob   Boolean
eveningsWeekends Boolean
note             String?
```

### 3.4 `PlanPhase`
```prisma
planId      String
monthNumber Int          -- 1-4
title       String
focus       String
weekStart   Int
weekEnd     Int
sortOrder   Int
```
Phases: Month 1 Foundation → Month 2 Build → Month 3 Depth → Month 4 Fire.

### 3.5 `PlanMilestone`
```prisma
planId      String
phaseId     String
label       String
value       String
isCompleted Boolean @default(false)
sortOrder   Int
```

### 3.6 `WeeklyTemplate` ← recurring task blueprint
```prisma
planId         String
phaseId        String
weekday        Int          -- 0=Sun … 6=Sat
title          String
detail         String?
category       PlanCategory -- DSA|JAVA|DESIGN|DEVOPS|REVIEW|MOCK
estimatedHours Float
isActive       Boolean @default(true)
sortOrder      Int
```

### 3.7 `PlanTask` ← daily task instances
```prisma
planId         String
phaseId        String?
templateId     String?
date           DateTime
title          String
detail         String?
category       PlanCategory
estimatedHours Float        @default(1)
completed      Boolean      @default(false)
source         PlanTaskSource -- TEMPLATE|MANUAL
```

### 3.8 `DailyNote`
```prisma
planId    String
date      DateTime
content   String
@@unique([planId, date])
```
Hashtags (`#dsa`, `#java`, `#design`, `#devops`, `#review`) are extracted at write time and mapped to goal categories.

### 3.9 `Goal` ← simple label-based goals
```prisma
id         String       @id @default(uuid())
title      String
category   PlanCategory
phase      String?
targetDate DateTime?
sortOrder  Int          @default(0)
```

### 3.10 `DailyTask` ← recurring checklist items (independent of plan)
```prisma
id          String @id @default(uuid())
title       String
sortOrder   Int    @default(0)
archived    Boolean @default(false)
completions TaskCompletion[]
```

### 3.11 `TaskCompletion`
```prisma
taskId  String
date    DateTime
@@unique([taskId, date])
```

### 3.12 `LeetcodeLog`
```prisma
id    String   @id @default(uuid())
date  DateTime @unique
count Int
notes String?
```

### 3.13 `GithubDailyStat`
```prisma
id          String   @id @default(uuid())
date        DateTime @unique
commitCount Int
updatedAt   DateTime @updatedAt
```

### 3.14 `Setting` ← key-value store
```prisma
key   String @id
value String
```
Keys in use: `github_pat`, `github_last_sync`, `github_last_login`.

### Enums
```prisma
enum PlanCategory { DSA JAVA DESIGN DEVOPS REVIEW MOCK }
enum PlanTaskSource { TEMPLATE MANUAL }
```

> **Note:** No Row-Level Security yet. Supabase RLS is planned for deploy but Prisma handles all queries server-side with session-validated user ID.

---

## 4. Authentication

- **Provider:** GitHub OAuth via NextAuth.js v5 (beta.30)
- On first login: upsert `User` row using GitHub profile data
- Session shape: `{ user: { id: string, name: string, email: string, image: string } }`
- Middleware: protects all routes except `/login` and `/api/auth/*`
- Session token stored in HTTP-only cookie

```ts
// src/auth.ts
providers: [GitHub({ ... })],
callbacks: {
  async signIn({ profile }) { await upsertUserFromGitHub(profile) },
  async jwt({ token, profile }) { ... /* maps githubId → user.id */ },
  async session({ session, token }) { session.user.id = token.userId }
}
```

---

## 5. External Integrations

### 5.1 GitHub Integration ✅ Built
- **API:** GitHub GraphQL API (`https://api.github.com/graphql`)
- **Auth:** Personal Access Token (PAT) stored in `Setting` table (`github_pat`)
- **Query:** Contribution calendar for last 364 days
- **Storage:** Upserts into `GithubDailyStat` per date
- **Trigger:** Settings page "Sync GitHub now" button → Server Action → `syncGithubContributions()`
- **Status tracking:** `github_last_sync` + `github_last_login` in `Setting` table

### 5.2 LeetCode Integration ⚠️ Manual only
- **Current state:** Manual daily entry form on `/today` page
- **Storage:** `LeetcodeLog` table (date + count + notes)
- **Future:** Unofficial GraphQL endpoint (`https://leetcode.com/graphql`) — planned but not implemented
- **Fallback already the primary path:** Manual entry is the current UX, not a fallback

---

## 6. Mutations (Server Actions)

All data mutations use Next.js Server Actions. No dedicated REST routes beyond NextAuth.

### Plan actions (`src/app/actions/plan.ts`)
| Action | Description |
|---|---|
| `ensureSeededPlanAction()` | Bootstrap 4-month plan from `FOUR_MONTH_SEED` |
| `generateCurrentWeekTasksAction()` | Generate `PlanTask` rows from `WeeklyTemplate` for current week |
| `togglePlanTaskCompletion(taskId)` | Toggle task done/undone |
| `addManualPlanTask(formData)` | Create one-off `PlanTask` |
| `updatePlanTask(formData)` | Edit task (date, title, category, hours) |
| `updatePlanConstraints(formData)` | Save plan hour/schedule constraints |
| `upsertDailyNote(formData)` | Save note, extract #hashtags |

### Task actions (`src/app/actions/tasks.ts`)
| Action | Description |
|---|---|
| `addDailyTask(title)` | Create recurring checklist task |
| `toggleTaskCompletion(taskId, date)` | Mark checklist task done for date |
| `archiveDailyTask(taskId)` | Soft-delete checklist task |

### Goal actions (`src/app/actions/goals.ts`)
| Action | Description |
|---|---|
| `addGoal(title, category)` | Create goal with category tag |
| `deleteGoal(id)` | Delete goal |

### Settings actions (`src/app/actions/settings.ts`)
| Action | Description |
|---|---|
| `saveGithubPat(pat)` | Store GitHub PAT |
| `runGithubSync()` | Trigger sync + update Setting timestamps |

All actions call `revalidatePath()` to invalidate affected pages.

---

## 7. Pages & Components

### 7.1 `/dashboard` — Overview

**Data shown:**
- Streak widget (consecutive days with any activity)
- 4-card summary grid: streak count, this-week task count, 7-day LC total, hybrid score
- Recharts ComposedChart: 3 lines (LeetCode, Tasks, GitHub) over last 30 days
- Phase timeline (4 phases with current phase highlighted)
- Plan constraints summary (hours/week, job status)

**Components:** `SummaryGrid`, `DashboardCharts`, `DashboardChartsLoader` (Suspense)

### 7.2 `/planner` — Weekly Board

- Weekly task board grouped by day of week
- Each task card shows: title, category badge, estimated hours, completion checkbox
- "Generate this week's tasks" button (from templates)
- "Add manual task" form (date, title, category, hours)
- Plan constraints shown at top

**Components:** `WeeklyPlannerBoard`, `PlanTag`

### 7.3 `/today` — Daily Checklist

- Date navigation (prev/next day arrows)
- Recurring daily tasks (checkboxes) from `DailyTask` + `TaskCompletion`
- Today's plan tasks from `PlanTask`
- LeetCode log form (count + notes, upsert for date)
- Goal snapshot card (category counts)

### 7.4 `/calendar` — Heatmap + Daily Note

- 120-day heatmap (5-level intensity based on combined activity score)
- Click day → detail panel: task completions + plan tasks for that date
- Daily note editor (textarea, auto-save via form action)
- Activity score = `github_commits + (lc_count × 3) + (tasks_completed × 1)`

**Components:** `CalendarHeatmap`

**Heatmap color scale:**
```
Level 0 (no activity):  #1a1a1e
Level 1 (1-2):          #3b2f6e
Level 2 (3-5):          #6d4fc2
Level 3 (6-10):         #a78bfa
Level 4 (11+):          #c4b5fd
```

### 7.5 `/goals` — Goal List

- Goals listed with category badge (DSA, JAVA, DESIGN, DEVOPS, REVIEW, MOCK)
- Add goal form (title + category dropdown)
- Delete goal button
- **Not yet built:** target values, deadlines, progress bars, metric tracking

### 7.6 `/settings`

- GitHub PAT input (stored in `Setting` table)
- "Sync GitHub now" button with loading state
- Last synced timestamp
- Plan constraints form (hours/week, job status, schedule flexibility)
- "Bootstrap plan from seed" button (`ensureSeededPlanAction`)

### 7.7 `/login`

- Centered card, dark background
- App name + "Track the grind." tagline
- "Continue with GitHub" button
- No other options

---

## 8. Design System

### Colors (Tailwind CSS v4 custom properties)
```css
--bg: #0d0d0f
--surface: #141416
--surface2: #1a1a1e
--border: rgba(255,255,255,0.07)
--text: #e8e6e0
--muted: #6b6966
--purple: #a78bfa       /* primary accent */
--teal: #2dd4bf         /* success / GitHub */
--amber: #fbbf24        /* warning / Medium LC */
--coral: #f87171        /* danger / Hard LC */
--green: #4ade80        /* Easy LC */
--blue: #60a5fa         /* info */
```

### Typography
- Display / headings: `Syne` (Google Fonts) — weights 700, 800
- Mono / labels / badges: `DM Mono` — weights 400, 500
- Body: system-ui fallback

### Component conventions
- Cards: `bg-surface border border-border rounded-xl`
- Category badges: `PlanTag` component, font-mono uppercase tracking-widest
- Buttons: `Button` component (variant: default / outline / ghost)
- Inputs: `bg-surface2 border border-border rounded-lg px-3 py-2 text-text`
- Dark theme only (no toggle for MVP)

---

## 9. State Management

- **Server state:** TanStack Query v5 — wraps client-side data fetching (charts use it via `DashboardChartsLoader`)
- **Page data:** Direct Prisma queries in `async` page components with `force-dynamic`
- **UI state:** React `useState` — forms, toggles, date navigation
- **Form state:** React Hook Form for goal creation; native `<form action={serverAction}>` for most mutations
- **No Redux, no Zustand**

---

## 10. Key Technical Decisions

### Server Actions over REST routes
All mutations use Server Actions. This avoids auth boilerplate on every route, leverages Next.js cache invalidation via `revalidatePath()`, and keeps mutation logic co-located with the UI.

### Prisma over Supabase client
Prisma is the primary data layer. Supabase clients exist in `src/lib/supabase/` but are not in active use. Supabase is the deploy target for Postgres but accessed via `DATABASE_URL` (standard connection string), not Supabase's own SDK.

### Plan-centric data model
Data is organized around a `Plan` aggregate rather than loose user-owned tables. Templates define recurring weekly structure; `PlanTask` instances are generated on demand. This enables "what should I do this week?" queries without manual task management.

### Manual LeetCode entry
LeetCode's unofficial GraphQL API is fragile. The manual entry path on `/today` is the current default — not a fallback. The sync integration can be added later without changing the data model.

### Timezone handling
Dates are stored as UTC in Postgres. "Today" is derived client-side via `Intl.DateTimeFormat`. Date strings are passed to Server Actions as ISO strings from the client.

### Force-dynamic rendering
All data pages use `export const dynamic = 'force-dynamic'` to bypass Next.js caching and always show fresh data. This is intentional for a single-user daily-use app where stale data is harmful.

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
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── actions/
│   │   │   ├── plan.ts
│   │   │   ├── tasks.ts
│   │   │   ├── goals.ts
│   │   │   ├── settings.ts
│   │   │   └── auth.ts
│   │   ├── api/
│   │   │   └── auth/[...nextauth]/route.ts
│   │   ├── layout.tsx                  ← fonts, metadata, QueryProvider
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   │   └── Button.tsx
│   │   ├── layout/
│   │   │   └── AppShell.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardCharts.tsx
│   │   │   ├── DashboardChartsLoader.tsx
│   │   │   └── SummaryGrid.tsx
│   │   ├── plan/
│   │   │   ├── WeeklyPlannerBoard.tsx
│   │   │   ├── CalendarHeatmap.tsx
│   │   │   └── PlanTag.tsx
│   │   ├── settings/
│   │   │   └── SyncGithubButton.tsx
│   │   └── app-providers.tsx
│   ├── lib/
│   │   ├── db.ts                       ← Prisma singleton
│   │   ├── github.ts                   ← GitHub GraphQL sync
│   │   ├── stats.ts                    ← aggregation queries
│   │   ├── settings.ts                 ← key-value Setting helpers
│   │   ├── dates.ts                    ← date utils
│   │   ├── tags.ts                     ← category → CSS class map
│   │   ├── utils.ts                    ← cn()
│   │   ├── chart.ts                    ← chart tick formatters
│   │   ├── types.ts                    ← MetricType enum
│   │   ├── plan/
│   │   │   ├── service.ts              ← seeding, task generation, heatmap
│   │   │   ├── seed-data.ts            ← FOUR_MONTH_SEED constant
│   │   │   └── note-tags.ts            ← #hashtag → category extractor
│   │   ├── auth/
│   │   │   └── upsert-github-user.ts
│   │   └── supabase/                   ← not active; deploy prep only
│   │       ├── client.ts
│   │       ├── server.ts
│   │       └── middleware.ts
│   ├── auth.ts                         ← NextAuth config
│   └── middleware.ts                   ← route protection
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── supabase/
│   └── migrations/                     ← SQL for deploy
├── agentic_development/
│   ├── SPEC.md                         ← this file
│   └── architecture.md
├── docker-compose.yml
└── .env.local.example
```

---

## 12. Environment Variables

```bash
# .env.local
DATABASE_URL=postgresql://devtrack:devtrack@localhost:5432/devtrack?schema=public

AUTH_SECRET=                    # openssl rand -base64 32
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

# Optional — Supabase deploy target
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 13. MVP Scope

### Built ✅
- GitHub OAuth login (NextAuth v5)
- Dashboard: streak, summary grid, combined chart
- Planner: weekly board, template-driven task generation
- Today: daily checklist, plan tasks, LeetCode log
- Calendar: 120-day heatmap, day detail panel, daily note editor
- Goals: list with category tags, add/delete
- Settings: GitHub PAT, sync trigger, plan constraints, plan bootstrap
- GitHub activity sync (GraphQL contribution calendar)
- Plan model: 4 phases, weekly templates, task instances, milestones
- Mobile responsive

### Not Yet Built ❌
- LeetCode API scrape (manual-only currently)
- `/stats` dedicated page (charts are on `/dashboard`)
- `/journal` page (daily notes live on `/calendar`)
- Goal target values, deadlines, progress bars, metric tracking
- Drag-and-drop task reorder (`@dnd-kit` installed, not wired)
- Supabase RLS (using Prisma server-side; RLS is deploy-time concern)
- Loading skeletons and empty state polish

### Out of scope ❌ (post-MVP)
- Multiple users / sharing
- Dark/light mode toggle (dark only)
- Export to CSV / PDF
- Push notifications
- AI summaries
- Markdown in journal / notes
- Calendar integration

---

## 14. Build Order (remaining work)

Steps 1–9 are complete. Remaining:

10. **Goal metrics** — Add `targetValue`, `currentValue`, `deadline` to `Goal` model; wire up progress bars on `/goals`
11. **Stats page** — Move/expand charts to `/stats`; add LeetCode difficulty breakdown, GitHub weekly bars
12. **LeetCode API** — Attempt unofficial GraphQL scrape on `/api/sync/leetcode`; fall back to manual
13. **Journal page** — Move notes editor to `/journal` with entry list + date picker
14. **DnD task reorder** — Wire `@dnd-kit` to `WeeklyPlannerBoard` and `/today` task list
15. **Final polish** — Loading skeletons, empty states, error boundaries, RLS audit for Supabase deploy
