# Quick Context

- Project folder: `tracker/`
- App name: **DevTrack** — personal learning & goal tracker for backend/DevSecOps interview prep
- Framework: Next.js 16.2.2 (App Router), TypeScript strict, Tailwind CSS v4
- Database: Prisma + Neon Postgres (production) / local Postgres (dev)
- Auth: NextAuth.js v5 — GitHub OAuth only. `requireAuth()` in `lib/auth/require-auth.ts` is the standard auth boundary for all pages and server actions.
- Deployment: Vercel + Neon Postgres (live)

## Schema overview (post-rewrite, 2026-05)

All data tables are per-user (`userId` FK everywhere). Key models:

| Model | Purpose |
|---|---|
| `User` | GitHub OAuth identity |
| `UserSettings` | 1:1 with User — leetcodeUsername, githubUsername, githubToken, timezone |
| `Category` | User-managed tags with color (system defaults: DSA, JAVA, DESIGN, DEVOPS, REVIEW, MOCK, OTHER) |
| `Plan` | Thin umbrella: title, startDate, endDate, isActive |
| `WeeklyGoal` | Per ISO-week goal with targetValue, actualValue, status (PENDING/IN_PROGRESS/COMPLETED/MISSED) |
| `Task` | Unified task: `isRecurring=true` → daily checklist; `isRecurring=false + dueDate` → scheduled |
| `TaskTag` | M:N junction: Task ↔ Category |
| `TaskCompletion` | Recurring task per-day completion record |
| `JournalEntry` | Per-user per-date journal, content with #hashtag parsing |
| `JournalTag` | M:N junction: JournalEntry ↔ Category |
| `LeetcodeLog` | easyCount / mediumCount / hardCount / notes per date |
| `GithubDailyStat` | commits / prs / reviews per date (synced via GitHub GraphQL) |
| `DailyCheckIn` | One row per (userId, date) — campfire check-in |
| `WeeklyReport` | Table reserved, no UI yet |

## Key lib files

- `lib/tasks.ts` — createTask, listTasksForDate, listTasksForWeek, listRecurringTasks, toggleTaskCompletion, setTaskTags
- `lib/journal.ts` — upsertJournalEntry (upserts + parses #hashtags into JournalTag rows), getJournalEntry
- `lib/weekly-goals.ts` — createWeeklyGoal, listWeeklyGoals, updateWeeklyGoalProgress, isoWeekFor(dateISO)
- `lib/settings.ts` — getUserSettings, updateUserSettings, getGithubToken
- `lib/stats.ts` — aggregatesForHeatmap, computeActivityStreak, sumLeetcodeLastDays, sumGithubLastDays
- `lib/github.ts` — syncGithubContributions (reads token from UserSettings, writes commits to GithubDailyStat)
- `lib/plan/service.ts` — getActivePlan, ensureActivePlan, createPlan, archivePlan

## Pages

| Route | Description |
|---|---|
| `/today` | Recurring task checklist, scheduled tasks, journal, LeetCode log, WeeklyGoal sidebar |
| `/planner` | 7-column weekly board (Task with dueDate), add-task form with MultiTagPicker |
| `/goals` | WeeklyGoal CRUD: ISO week, targetValue, metricUnit, progress bars |
| `/calendar` | Date nav, day tasks, JournalEntry editor with tag chips |
| `/dashboard` | Streak, summary grid, heatmap, WeeklyGoal progress, combined chart |
| `/settings` | UserSettings form (LC username, GH username/token, timezone), categories, plan bootstrap |

## What was dropped in the rewrite

Old models no longer exist: `Setting` (key-value), `Goal`, `DailyTask`, `PlanTask`, `DailyNote`, `PlanPhase`, `PlanMilestone`, `WeeklyTemplate`, `PlanConstraint`. Replaced by the models above.
