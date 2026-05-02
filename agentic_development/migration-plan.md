# Plan: Schema & App Rewrite — Adopt New Design

## Context

The app is being rewritten against a new schema design (`tracker/agentic_development/new.schema.prisma`) and architecture doc (`tracker/agentic_development/redisgn.md`). The current schema accreted around a single rich-Plan concept (with PlanPhase/Milestone/WeeklyTemplate/PlanConstraint and template-based task generation). The new design simplifies Plan to a thin umbrella, introduces measurable WeeklyGoal, replaces single-string category tagging with M:N junction tables, separates JournalEntry from plans, switches Setting to structured UserSettings, and reserves space for WeeklyReport snapshots. Goal: simpler, more flexible, journaling-first.

User decisions locked in this session:
- **Adopt new design fully** — drop PlanPhase/Milestone/WeeklyTemplate/PlanConstraint
- **M:N tag junctions** — TaskTag + JournalTag tables; multi-tag per task/entry
- **Structured UserSettings** — replace key-value Setting table
- **Truncate-and-rebuild** — acceptable to drop all current data
- **Single Task model with `isRecurring`** — replaces both DailyTask & PlanTask
- **Replace Goal with WeeklyGoal** — drop long-term goal concept entirely
- **Replace DailyNote with JournalEntry** — per-user, not per-plan
- **Defer WeeklyReport** — add empty table only, no UI/generation logic yet

---

## Final Target Schema (adapted from new.schema.prisma for Neon)

Models that stay as-is:
- **User** (drop direct relations to dropped models, add new ones)
- **DailyCheckIn** (no changes)
- **Category** (rename DB to `task_categories` to match new design; keep model name `Category` for migration compactness)

Models that change:
- **LeetcodeLog**: `count` → `easyCount` / `mediumCount` / `hardCount`
- **GithubDailyStat**: `commitCount` → `commits` / `prs` / `reviews`
- **Plan**: slim down to `userId, title, description, startDate, endDate, isActive, isArchived`. Drop relations to PlanPhase/Milestone/Template/Constraint/PlanTask/DailyNote.

Models added:
- **UserSettings** (1:1 with User): `leetcodeUsername, githubUsername, githubToken, timezone`. Replaces Setting key-value rows for known keys.
- **WeeklyGoal**: `userId, planId, categoryId?, weekNumber, year, title, description?, targetValue, metricUnit, actualValue, status (PENDING/IN_PROGRESS/COMPLETED/MISSED)`
- **Task**: `userId, title, notes?, completed, isRecurring, dueDate?, completedAt?` — replaces both DailyTask and PlanTask
- **TaskTag** (junction): `taskId, categoryId` (composite PK)
- **TaskCompletion**: keep, but FK now points to new Task (rebuild)
- **JournalEntry**: `userId, date, content` (`@@unique([userId, date])`) — replaces DailyNote
- **JournalTag** (junction): `journalId, categoryId` (composite PK)
- **WeeklyReport**: `userId, planId?, weekNumber, year, snapshot Json, generatedAt` — table only, no logic this round

Models dropped:
- **Setting** (key-value) — replaced by UserSettings
- **Goal** — replaced by WeeklyGoal
- **DailyNote** — replaced by JournalEntry
- **DailyTask** — replaced by Task (`isRecurring=true`)
- **PlanTask** — replaced by Task (`isRecurring=false, dueDate=set`)
- **PlanPhase** / **PlanMilestone** / **WeeklyTemplate** / **PlanConstraint** — gone, no replacement
- Enum **PlanTaskSource** — gone

Enum kept/added:
- **WeeklyGoalStatus**: PENDING, IN_PROGRESS, COMPLETED, MISSED

---

## Critical Files

**Schema & migration**:
- `tracker/prisma/schema.prisma` — full rewrite
- `tracker/prisma/migrations/<new_timestamp>_full_redesign/migration.sql` — TRUNCATE + DROP + CREATE + ALTER

**Lib layer**:
- `tracker/src/lib/settings.ts` — rewrite for UserSettings (typed getters/setters)
- `tracker/src/lib/categories.ts` — minor, keep `ensureUserCategories`
- `tracker/src/lib/plan/service.ts` — drastically slim (drop generateTasksFromTemplates, ensureSeededPlanForUser becomes minimal)
- `tracker/src/lib/plan/note-tags.ts` — adapt for JournalEntry tag extraction (or replace with junction-table writes)
- `tracker/src/lib/stats.ts` — rewrite all queries to use Task / JournalEntry / new Leetcode/Github fields
- `tracker/src/lib/github.ts` — read token from UserSettings; write commits/prs/reviews
- `tracker/src/lib/auth/upsert-github-user.ts` — also seed UserSettings row on first login
- New: `tracker/src/lib/weekly-goals.ts`, `tracker/src/lib/tasks.ts`, `tracker/src/lib/journal.ts`

**Server actions**:
- `tracker/src/app/actions/settings.ts` — rewrite for UserSettings
- `tracker/src/app/actions/tasks.ts` — rewrite for unified Task (handle isRecurring branching)
- `tracker/src/app/actions/plan.ts` — slim to plan create/activate/archive only
- DELETE `tracker/src/app/actions/goals.ts` → REPLACE with `weekly-goals.ts`
- ADD `tracker/src/app/actions/journal.ts`
- `tracker/src/app/actions/leetcode.ts` — accept easy/medium/hard
- `tracker/src/app/actions/categories.ts` — adapt deletion to handle tag junction cascades
- `tracker/src/app/actions/checkin.ts` — no change

**Pages**:
- `tracker/src/app/(app)/dashboard/page.tsx` — drop plan-progress stats, swap to WeeklyGoal+Task aggregates
- `tracker/src/app/(app)/today/page.tsx` — switch DailyTask→Task(isRecurring), DailyNote→JournalEntry, Goal→WeeklyGoal
- `tracker/src/app/(app)/planner/page.tsx` — major rewrite: no more weekly templates, becomes a Task list/board for the week
- `tracker/src/app/(app)/calendar/page.tsx` — DailyNote→JournalEntry, PlanTask→Task
- `tracker/src/app/(app)/goals/page.tsx` — rename concept to weekly-goals (URL stays `/goals` for now), rewrite for WeeklyGoal CRUD
- `tracker/src/app/(app)/settings/page.tsx` — replace plan-constraints form, replace key-value forms with UserSettings

**Components**:
- `tracker/src/components/plan/WeeklyPlannerBoard.tsx` — adapt to Task[]
- `tracker/src/components/plan/PlanTag.tsx` — accept category id (not name string)
- New: `MultiTagPicker` component for M:N selection
- `tracker/src/components/CheckInButton.tsx` — no change

---

## Implementation Plan — Phased

Execution order matters: schema first, then lib (since pages depend on lib), then actions, then pages. Within each phase, individual commits are encouraged.

### Phase 0 — Pre-flight (no code changes)
1. Snapshot prod (`pg_dump` from Neon, save locally) — even though we're truncating, keep a backup
2. Confirm dev DB is using a separate Neon branch / local Postgres so we can iterate without touching prod
3. Copy this plan to `tracker/agentic_development/migration-plan.md` for in-repo reference

### Phase 1 — Schema & migration SQL
1. Rewrite `prisma/schema.prisma` with the target shape (above)
2. Create migration file `<ts>_full_redesign/migration.sql`:
   - TRUNCATE existing data tables that stay (`DailyCheckIn`, `categories`, `LeetcodeLog`, `GithubDailyStat`)
   - DROP: `Setting`, `Goal`, `DailyTask`, `TaskCompletion`, `PlanTask`, `DailyNote`, `WeeklyTemplate`, `PlanMilestone`, `PlanPhase`, `PlanConstraint`, `Plan`
   - DROP enum `PlanTaskSource`
   - CREATE enum `WeeklyGoalStatus`
   - CREATE: `UserSettings`, `Plan` (new shape), `WeeklyGoal`, `Task`, `TaskTag`, `TaskCompletion` (new), `JournalEntry`, `JournalTag`, `WeeklyReport`
   - ALTER: `LeetcodeLog` (drop `count`, add `easyCount/mediumCount/hardCount`); `GithubDailyStat` (drop `commitCount`, add `commits/prs/reviews`)
3. Run against dev DB: `npx prisma migrate dev`
4. Run `npx prisma generate`

### Phase 2 — Lib layer rewrite
1. `lib/settings.ts` — replace `getSetting/setSetting` with typed `getUserSettings(userId)` + `updateUserSettings(userId, patch)`. Internal-only `getGithubToken(userId)` helper.
2. `lib/categories.ts` — keep `ensureUserCategories`, `getAllCategories`. Update `colorClassForCategory` consumers to take id-or-name.
3. `lib/plan/service.ts` — slim to `getActivePlan(userId)`, `createPlan(userId, data)`, `archivePlan(planId)`. Remove template generation entirely. `ensureSeededPlanForUser` becomes "create a default plan if user has none active".
4. `lib/stats.ts` — rewrite every query: TaskCompletion + Task (replacing DailyTask), drop PlanTask refs. Update `aggregatesForHeatmap` meta to include weeklyGoal progress, journal entry presence.
5. `lib/github.ts` — read token via `getUserSettings`, write GithubDailyStat with new commits/prs/reviews fields (sync only fills `commits`; prs/reviews default 0 for now).
6. `lib/auth/upsert-github-user.ts` — call `ensureUserCategories(userId)` AND create empty UserSettings row.
7. NEW `lib/weekly-goals.ts` — CRUD + status calc helpers (week_number/year derivation via ISO week).
8. NEW `lib/tasks.ts` — unified create/toggle/archive helpers handling both `isRecurring=true` (no dueDate) and `isRecurring=false` (with dueDate). Tag attach/detach via TaskTag.
9. NEW `lib/journal.ts` — upsert JournalEntry per (userId, date). Tag extraction → JournalTag rows.
10. Run `tsc --noEmit` after each file; expect type errors in dependents — fix as we go to Phase 3.

### Phase 3 — Server actions rewrite
1. `actions/settings.ts` — single `updateSettingsForm` action writing UserSettings; keep `runGithubSync`.
2. `actions/tasks.ts` — `addTaskForm` (handles both recurring + scheduled), `toggleTaskCompletion`, `archiveTask`, `addTagToTask`, `removeTagFromTask`.
3. `actions/plan.ts` — slim to `createPlanForm`, `archivePlan`, `setActivePlan`. Drop everything template/constraint-related.
4. DELETE `actions/goals.ts`. ADD `actions/weekly-goals.ts` with `addWeeklyGoalForm`, `updateWeeklyGoalProgress`, `deleteWeeklyGoal`.
5. ADD `actions/journal.ts` with `upsertJournalEntryForm`, `addTagToEntry`, `removeTagFromEntry`.
6. `actions/leetcode.ts` — accept easy/medium/hard counts.
7. `actions/categories.ts` — no major change; cascade deletes already handle TaskTag/JournalTag.
8. `actions/checkin.ts` — unchanged.

### Phase 4 — Page rewrites (one PR-sized chunk per page)
1. `/today` — switch to Task (filter `isRecurring=true OR dueDate=today`), JournalEntry, WeeklyGoal sidebar. Delete leetcode-form's count field, add easy/medium/hard inputs.
2. `/planner` — rewrite: drop template/regenerate UI. Becomes a 7-column board listing Tasks where `dueDate` falls in the week. Add-task form creates Task with `dueDate`, optional tags.
3. `/goals` — rewrite for WeeklyGoal: list this week's goals with progress bars; form has targetValue/metricUnit; weekly archive view.
4. `/calendar` — JournalEntry replaces DailyNote textarea; tag chips below; date-by-date Task list.
5. `/dashboard` — drop plan-phase widget; add "this week's WeeklyGoals progress" card; keep heatmap (data shape adjusted in Phase 2).
6. `/settings` — drop plan-constraints form; replace pat/leetcode key-value forms with single UserSettings form (leetcodeUsername, githubUsername, githubToken, timezone).

### Phase 5 — Components
1. Update `WeeklyPlannerBoard` props to `Task[]` shape.
2. Update `PlanTag` to render from category object (id + name + color).
3. NEW `MultiTagPicker` (client) — checkbox list of categories, used in task/journal forms.
4. Verify `ActivityHeatmap` still renders (data shape may need a tweak in `aggregatesForHeatmap`).

### Phase 6 — Verify & deploy
1. `npx tsc --noEmit` — zero errors
2. `npx prisma migrate dev` against dev DB — clean apply
3. Manual smoke: login, add task, check off, write journal, set weekly goal, sync github
4. `DATABASE_URL=<neon-prod> npx prisma migrate deploy` — apply to prod (DESTROYS prod data per user OK)
5. Redeploy Vercel
6. Verify on production with both GitHub accounts (multi-tenancy still intact)

---

## Verification

End-to-end sanity after deploy:
- Sign in with GitHub → User row created → UserSettings row created → 7 system categories seeded
- `/today` renders without errors; can create a recurring Task and a scheduled Task
- `/goals` lets you create a WeeklyGoal with targetValue, marks COMPLETED on hitting it
- `/calendar` renders JournalEntry textarea, hashtag → JournalTag rows in DB
- `/settings` saves UserSettings; `/settings` GitHub sync still pulls commits
- `/dashboard` heatmap renders with new data shape
- Sign in with second GitHub account → fully isolated data

---

## Open risks & follow-ups

- **`generateTasksFromTemplates` deletion**: callers in `/today`, `/planner`, `/calendar` currently invoke it on every render. Removing means tasks must be created explicitly — confirm UX is acceptable (no auto-population).
- **Plan concept thinning**: with PlanPhase/Constraint gone, the "plan" is barely more than a label. Confirm this is OK for now; can re-add structure later.
- **Hashtag → JournalTag extraction**: current `extractGoalMentionsFromNote` just returns category names; new flow needs to insert JournalTag rows. Decide: extract on save (server action) or extract on read (display only)?
- **WeeklyReport**: table created, generation deferred. Add a follow-up todo in `agentic_development/todo.md`.
- **Deferred**: long-term Goal concept; multi-plan UI (currently single active plan).
