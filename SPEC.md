# DevTrack — MVP Specification
> Personal learning & goal tracker for backend/DevSecOps interview prep  
> Version: 1.0 MVP | Spec-driven development (Claude Code / Cursor)

---

## 0. Quick Reference

| Item | Decision |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (Postgres) |
| Auth | NextAuth.js v5 — GitHub OAuth provider |
| Charts | Recharts |
| Deployment | Vercel |
| Mobile | Fully responsive (mobile-first) |

---

## 1. Project Overview

**DevTrack** is a personal progress tracker designed for developers grinding through a structured learning plan. It aggregates activity from GitHub and LeetCode, combines it with manual daily tasks and journal entries, and surfaces everything as motivating visualizations — streaks, heatmaps, goal progress bars, and cumulative charts.

The primary user is a single authenticated person (you). This is not a SaaS product — there is no team or multi-user feature in scope.

### Core loop
1. Open the app every day (or a few times a week)
2. See today's tasks and check them off
3. Write a short journal note
4. GitHub and LeetCode data syncs automatically in the background
5. Dashboard shows heatmap + charts updated in near-real-time
6. Goals track against the 4-month plan with a visible countdown

---

## 2. Information Architecture

```
/                        → redirect to /dashboard if logged in, else /login
/login                   → GitHub OAuth login page
/dashboard               → main daily view (heatmap hero + today's tasks)
/stats                   → full charts page (all visualizations)
/goals                   → goal management (preset + custom)
/journal                 → daily notes list + editor
/settings                → GitHub username, LeetCode username, sync preferences
```

No nested routing beyond this for MVP.

---

## 3. Database Schema (Supabase / Postgres)

### 3.1 `users`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
github_id     text UNIQUE NOT NULL
github_login  text NOT NULL
email         text
avatar_url    text
leetcode_username text
github_username   text
created_at    timestamptz DEFAULT now()
```

### 3.2 `daily_tasks`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid REFERENCES users(id) ON DELETE CASCADE
title       text NOT NULL
date        date NOT NULL                  -- the day this task belongs to
completed   boolean DEFAULT false
position    integer DEFAULT 0             -- for drag-to-reorder
created_at  timestamptz DEFAULT now()

UNIQUE(user_id, title, date)
```

### 3.3 `journal_entries`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid REFERENCES users(id) ON DELETE CASCADE
date        date NOT NULL
content     text NOT NULL
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()

UNIQUE(user_id, date)   -- one entry per day
```

### 3.4 `leetcode_snapshots`
Stores a daily snapshot of cumulative LC stats (scraped or manually entered).
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid REFERENCES users(id) ON DELETE CASCADE
date            date NOT NULL
easy_solved     integer DEFAULT 0
medium_solved   integer DEFAULT 0
hard_solved     integer DEFAULT 0
total_solved    integer DEFAULT 0
source          text CHECK (source IN ('scrape', 'manual'))
created_at      timestamptz DEFAULT now()

UNIQUE(user_id, date)   -- upsert daily
```

### 3.5 `github_activity`
Cached GitHub contribution data — synced via API.
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid REFERENCES users(id) ON DELETE CASCADE
date        date NOT NULL
commits     integer DEFAULT 0
synced_at   timestamptz DEFAULT now()

UNIQUE(user_id, date)
```

### 3.6 `goals`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid REFERENCES users(id) ON DELETE CASCADE
title           text NOT NULL
description     text
metric_type     text NOT NULL  -- 'leetcode_total' | 'leetcode_medium' | 'leetcode_hard' | 'github_commits' | 'tasks_completed' | 'custom'
target_value    integer NOT NULL
current_value   integer DEFAULT 0  -- computed or manually tracked
deadline        date NOT NULL
is_preset       boolean DEFAULT false
is_archived     boolean DEFAULT false
created_at      timestamptz DEFAULT now()
```

### 3.7 Row-level security (RLS)
Enable RLS on all tables. Policy: `auth.uid() = user_id` for all SELECT / INSERT / UPDATE / DELETE. Users can only see their own data.

---

## 4. Authentication

- **Provider:** GitHub OAuth via NextAuth.js v5
- On first login: create a `users` row using GitHub profile data
- On subsequent logins: update `avatar_url` and `github_login` if changed
- Session: JWT stored in HTTP-only cookie
- Middleware: protect all routes except `/login` and `/api/auth/*`

### NextAuth config sketch
```ts
// app/api/auth/[...nextauth]/route.ts
providers: [
  GitHub({
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  })
],
callbacks: {
  async signIn({ user, account, profile }) {
    // upsert user in Supabase
  },
  async session({ session, token }) {
    // attach supabase user id to session
  }
}
```

---

## 5. External Integrations

### 5.1 GitHub Integration
- **API:** GitHub REST API v3 — public, no extra OAuth scope needed beyond `read:user`
- **Endpoint used:** `GET /users/{username}/events/public` for recent activity + GitHub GraphQL API for contribution calendar
- **Sync strategy:** API route `/api/sync/github` — called on dashboard load if last sync > 1 hour ago
- **Data stored:** daily commit count per day for the last 365 days → `github_activity` table
- **Rate limits:** 5000 req/hour authenticated. Cache aggressively.

```ts
// Pseudocode for GitHub sync
async function syncGitHub(userId: string, githubUsername: string) {
  const contributions = await fetchGitHubContributions(githubUsername) // GraphQL
  for (const day of contributions) {
    await supabase
      .from('github_activity')
      .upsert({ user_id: userId, date: day.date, commits: day.count })
  }
}
```

### 5.2 LeetCode Integration
LeetCode has no official public API. Use their unofficial GraphQL endpoint.

- **Endpoint:** `https://leetcode.com/graphql`
- **Query:**
```graphql
query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    submitStats {
      acSubmissionNum {
        difficulty
        count
      }
    }
  }
}
```
- **Sync strategy:** API route `/api/sync/leetcode` — called once per day max (rate limit caution)
- **Fallback:** If scrape fails (LeetCode blocks, username wrong, etc.), surface a manual entry form on the dashboard. User inputs today's easy/medium/hard counts directly.
- **Data stored:** daily snapshot upserted into `leetcode_snapshots`
- **Important:** This endpoint is unofficial and may break. Build the manual fallback robustly — it's not an afterthought.

---

## 6. API Routes

All under `app/api/`:

| Route | Method | Description |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handler |
| `/api/sync/github` | POST | Trigger GitHub sync for current user |
| `/api/sync/leetcode` | POST | Trigger LeetCode scrape + upsert snapshot |
| `/api/tasks` | GET | Fetch tasks for a given `?date=YYYY-MM-DD` |
| `/api/tasks` | POST | Create a task |
| `/api/tasks/[id]` | PATCH | Toggle complete, update title, reorder |
| `/api/tasks/[id]` | DELETE | Delete a task |
| `/api/journal` | GET | Fetch entry for `?date=YYYY-MM-DD` |
| `/api/journal` | POST/PUT | Upsert journal entry for a date |
| `/api/goals` | GET | List all active goals |
| `/api/goals` | POST | Create a goal |
| `/api/goals/[id]` | PATCH | Update target, deadline, archive |
| `/api/goals/[id]` | DELETE | Delete a goal |
| `/api/stats/heatmap` | GET | Merged activity by date (last 365 days) |
| `/api/stats/leetcode` | GET | LC snapshots over time |
| `/api/stats/github` | GET | GitHub commits over time |
| `/api/settings` | GET/PATCH | Get/update user settings (LC username etc.) |

All API routes must:
- Validate session (401 if unauthenticated)
- Return consistent `{ data, error }` shape
- Use Supabase server client (not browser client)

---

## 7. Pages & Components

### 7.1 `/dashboard` — Daily View

**Layout:** Single column on mobile, 2-col grid on desktop (main content + sidebar)

**Hero section — Activity Heatmap**
- GitHub-style 52-week × 7-day grid
- Each cell = one day, color intensity = combined activity score
- Activity score = `github_commits + (lc_solved_today × 3) + (tasks_completed × 1)`
- Color scale: 5 levels (0, 1-2, 3-5, 6-10, 11+) using the dark theme palette from the HTML ref
- Hover tooltip: date, breakdown of each source
- Click a day: slides open a detail panel below showing that day's tasks + journal snippet
- Mobile: horizontal scroll, show last 12 weeks only

**Streak widget**
- Current streak (consecutive days with activity score > 0)
- Longest streak ever
- "🔥 X day streak" display — prominent, top of page

**Today's tasks**
- List of tasks for today (date = now in user's timezone)
- Checkbox to complete each
- Inline add: text input at bottom, press Enter to add
- Tasks carry over if uncompleted? No — each day is fresh. Uncompleted tasks show as missed (greyed, crossed out) on past days.
- Reorder via drag-and-drop (use `@dnd-kit/core`)

**Journal entry**
- Textarea below tasks: "What did you work on today?"
- Auto-save on blur (debounced 500ms)
- Shows word count
- Previous entry shown as collapsed card above editor

**Quick stats sidebar (desktop) / collapsed section (mobile)**
- LeetCode: Easy / Medium / Hard counts (today's snapshot)
- GitHub: commits this week
- Goal nearest to deadline with progress bar

### 7.2 `/stats` — Visualizations

All charts use Recharts. Dark theme throughout (match the HTML ref aesthetic).

**1. Cumulative LeetCode line chart**
- X axis: date (last 120 days)
- Y axis: total problems solved
- 3 lines: Easy (green), Medium (amber), Hard (coral/red)
- Tooltip: exact counts on hover
- Dots shown only at data points

**2. LeetCode difficulty donut chart**
- Current totals: Easy / Medium / Hard
- Center label: total solved
- Legend below

**3. GitHub commit bar chart**
- X axis: last 12 weeks
- Y axis: commits
- Bar per week, color matches heatmap intensity scale
- Tooltip: exact count + week range

**4. Daily activity line chart**
- X axis: last 60 days
- Y axis: activity score (combined)
- Area chart (filled under line) for visual weight
- Reference line: 7-day rolling average

**5. Activity heatmap** (same as dashboard, but full 52 weeks, larger cells on desktop)

### 7.3 `/goals` — Goal Tracker

**Preset templates (shown on first visit or when no goals exist):**
- "Solve 150 LeetCode problems" → metric: `leetcode_total`, target: 150, deadline: +16 weeks
- "Solve 70 Medium problems" → metric: `leetcode_medium`, target: 70, deadline: +16 weeks
- "50 GitHub commits" → metric: `github_commits`, target: 50, deadline: +16 weeks
- "Complete 100 daily tasks" → metric: `tasks_completed`, target: 100, deadline: +16 weeks

User can one-click "Add this goal" on any preset.

**Custom goal creation form:**
- Title (text)
- Metric type (dropdown: LC total / LC medium / LC hard / GitHub commits / Tasks completed / Manual number)
- Target value (number)
- Deadline (date picker)

**Goal card display:**
- Title + deadline countdown ("23 days left")
- Progress bar: current / target
- Percentage label
- "On track" / "Behind" / "Completed" status badge — calculated from linear projection
- Archive / delete actions

**Progress calculation:**
- For `leetcode_*` metrics: pull from latest `leetcode_snapshots` row
- For `github_commits`: sum from `github_activity` since goal `created_at`
- For `tasks_completed`: count completed tasks since goal `created_at`
- For `custom`: manual increment button on the card (+1 / set value)

### 7.4 `/journal` — Notes List

- Calendar view on the left (month grid, dots on days with entries)
- Entry list on the right / full width on mobile
- Click a date → loads that day's entry in editor
- Entries are plain text (no markdown for MVP)
- Search bar: full-text search across all entries (Supabase `ilike`)

### 7.5 `/settings`

- LeetCode username input (with "Test connection" button that runs a scrape preview)
- GitHub username input (pre-filled from OAuth, editable)
- "Sync now" buttons for both integrations
- Last synced timestamps
- Danger zone: "Delete all my data" (with confirmation modal)

### 7.6 `/login`

- Centered card, dark background
- App name + tagline: "Track the grind."
- "Continue with GitHub" button
- No other options

---

## 8. Design System

Match the aesthetic from the reference HTML file exactly.

### Colors (CSS variables)
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
- Body: system-ui fallback or Syne 400

### Component conventions
- All cards: `bg-surface border border-border rounded-xl`
- Badges: `font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded`
- Buttons primary: `bg-purple text-white rounded-lg px-4 py-2`
- Buttons ghost: `border border-border text-muted hover:text-text`
- Inputs: `bg-surface2 border border-border rounded-lg px-3 py-2 text-text`
- No drop shadows. No gradients except subtle on charts.

### Heatmap color scale (5 levels)
```
Level 0 (no activity):  #1a1a1e
Level 1 (1-2):          #3b2f6e
Level 2 (3-5):          #6d4fc2
Level 3 (6-10):         #a78bfa
Level 4 (11+):          #c4b5fd
```

---

## 9. State Management

- **Server state:** TanStack Query (React Query) for all API calls — handles caching, refetch on focus, background sync
- **UI state:** React `useState` / `useReducer` — no global store needed for MVP
- **Form state:** React Hook Form for goal creation and settings
- **No Redux, no Zustand for MVP**

---

## 10. Key Technical Decisions & Notes

### Timezone handling
- Store all dates as UTC in Postgres
- Derive "today" on the client using `Intl.DateTimeFormat` to get user's local date
- Pass local date string to API routes as query param — never derive "today" server-side

### LeetCode scrape resilience
- Wrap scrape in try/catch — if it throws, return `{ success: false, reason: 'scrape_failed' }`
- Frontend detects this and shows the manual entry banner
- Never show an error page — degrade gracefully

### Sync on load strategy
```
Dashboard mounts
→ check localStorage for `lastGitHubSync` timestamp
→ if > 1 hour ago: call POST /api/sync/github (fire and forget, don't block render)
→ same for LeetCode (but check if > 24 hours ago)
→ React Query refetches heatmap data on sync completion via invalidateQueries
```

### Mobile heatmap
- Desktop: 52 columns × 7 rows (full year)
- Mobile: 12 columns × 7 rows (last 12 weeks), horizontally scrollable container

### Task "carry over" decision
- No automatic carry-over. Each day is independent.
- On the dashboard, show yesterday's uncompleted tasks as a separate greyed-out section titled "Missed yesterday" — user can optionally re-add them to today.

---

## 11. File Structure

```
devtrack/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              ← sidebar nav + auth guard
│   │   ├── dashboard/page.tsx
│   │   ├── stats/page.tsx
│   │   ├── goals/page.tsx
│   │   ├── journal/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── sync/
│   │   │   ├── github/route.ts
│   │   │   └── leetcode/route.ts
│   │   ├── tasks/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── journal/route.ts
│   │   ├── goals/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── stats/
│   │   │   ├── heatmap/route.ts
│   │   │   ├── leetcode/route.ts
│   │   │   └── github/route.ts
│   │   └── settings/route.ts
│   ├── layout.tsx                  ← fonts, metadata, providers
│   └── globals.css
├── components/
│   ├── ui/                         ← shadcn primitives
│   ├── heatmap/
│   │   ├── ActivityHeatmap.tsx
│   │   └── HeatmapTooltip.tsx
│   ├── charts/
│   │   ├── LeetCodeLineChart.tsx
│   │   ├── LeetCodeDonut.tsx
│   │   ├── GitHubBarChart.tsx
│   │   └── ActivityAreaChart.tsx
│   ├── tasks/
│   │   ├── TaskList.tsx
│   │   ├── TaskItem.tsx
│   │   └── AddTaskInput.tsx
│   ├── goals/
│   │   ├── GoalCard.tsx
│   │   ├── GoalForm.tsx
│   │   └── PresetGoals.tsx
│   ├── journal/
│   │   ├── JournalEditor.tsx
│   │   └── JournalCalendar.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── MobileNav.tsx
│   │   └── Header.tsx
│   └── shared/
│       ├── StreakBadge.tsx
│       ├── StatCard.tsx
│       └── SyncButton.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               ← browser client
│   │   ├── server.ts               ← server client (API routes)
│   │   └── middleware.ts
│   ├── github.ts                   ← GitHub API helpers
│   ├── leetcode.ts                 ← LeetCode scrape logic
│   ├── activity.ts                 ← activity score calculation
│   └── dates.ts                    ← date utils (local date, streaks)
├── hooks/
│   ├── useHeatmapData.ts
│   ├── useTodayTasks.ts
│   ├── useGoals.ts
│   └── useStreak.ts
├── types/
│   └── index.ts                    ← shared TypeScript types
├── middleware.ts                    ← auth protection
├── .env.local.example
└── SPEC.md                         ← this file
```

---

## 12. Environment Variables

```bash
# .env.local
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=                    # generate with: openssl rand -base64 32

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # for server-side operations only
```

---

## 13. MVP Scope Boundary

### In scope ✅
- GitHub OAuth login
- Dashboard with heatmap, tasks, journal, streak
- LeetCode scrape + manual fallback
- GitHub activity sync
- All 6 chart types on /stats
- Goal system (preset + custom)
- Journal with calendar + search
- Settings page
- Mobile responsive
- RLS on all Supabase tables

### Out of scope ❌ (post-MVP)
- Neovim / boot.dev course progress tracking
- Push notifications / reminders
- Multiple users / sharing
- Dark/light mode toggle (dark only for MVP)
- Export to CSV / PDF
- LeetCode problem-level tracking (just totals)
- Markdown in journal
- Calendar integration
- AI summaries of progress

---

## 14. Build Order (recommended for Claude Code / Cursor)

Work in this order to always have a running app:

1. **Project scaffold** — `create-next-app`, install deps, set up Tailwind + shadcn, configure fonts
2. **Supabase setup** — create project, run schema SQL, enable RLS, set env vars
3. **Auth** — NextAuth GitHub provider, login page, middleware, session in layout
4. **Settings page** — store LeetCode + GitHub usernames (needed for syncs)
5. **GitHub sync** — API route + lib function + store to `github_activity`
6. **LeetCode sync** — API route + scrape + manual fallback + store to `leetcode_snapshots`
7. **Tasks API + UI** — CRUD, checkbox, add input on dashboard
8. **Journal API + UI** — upsert entry, autosave, display on dashboard
9. **Heatmap component** — merge github + lc + tasks data, render grid
10. **Streak calculation** — `lib/dates.ts` + `StreakBadge` component
11. **Stats page** — all 5 charts using Recharts
12. **Goals page** — preset templates, custom form, progress bars
13. **Journal page** — calendar view, entry list, search
14. **Mobile polish** — nav, heatmap scroll, responsive layout audit
15. **Final audit** — RLS check, error states, loading skeletons, empty states

---

## 15. Prompts for Claude Code / Cursor

Use these as starting prompts for each build step:

**Step 1:**
> "Scaffold a Next.js 14 app with TypeScript, Tailwind CSS, and shadcn/ui. Install @tanstack/react-query, next-auth@beta, @supabase/supabase-js, recharts, @dnd-kit/core, react-hook-form. Set up Google Fonts with Syne and DM Mono in the root layout. Apply the dark theme CSS variables from the design system in globals.css."

**Step 3:**
> "Set up NextAuth v5 with GitHub OAuth provider. On sign-in, upsert the user into the Supabase `users` table using the service role key. Attach the Supabase user UUID to the session JWT. Add middleware that protects all routes except /login and /api/auth/*."

**Step 6:**
> "Create a POST /api/sync/leetcode route. It should query the LeetCode GraphQL endpoint at https://leetcode.com/graphql with the user's leetcode_username from settings. Parse the acSubmissionNum array to extract easy/medium/hard counts. Upsert a row into leetcode_snapshots for today's date. If the fetch fails for any reason, return { success: false, reason: 'scrape_failed' } with status 200 (not 500) — this triggers the manual fallback UI."

**Step 9:**
> "Build an ActivityHeatmap React component. It receives an array of { date: string, score: number } objects covering the last 365 days. Render a 52×7 grid of small square cells. Color each cell using 5 levels based on score (0, 1-2, 3-5, 6-10, 11+) using the heatmap color scale from the design system. Add a hover tooltip showing the date and score breakdown. On mobile (< 768px), show only the last 12 weeks in a horizontally scrollable container."
```
