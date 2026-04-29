# DevTrack Feature Todo

## Priority 1 — Usability / correctness

- [] Quick survey done. Here's what I found, then let's pick an order — this is too much to do in one shot.

Major drift between docs and code:

Area	Docs claim	Reality
Heatmap	/calendar 120-day	/dashboard 365-day (just built); /calendar still has its own
Activity score	github + lc×3 + tasks×1	(checkedIn?3:0) + leetcode + github + dailyTasks + planTasks (stats.ts)
Goal.category	PlanCategory enum	plain String with default "OTHER"
Schema dates	DateTime in SPEC	most are String (LeetcodeLog, GithubDailyStat, TaskCompletion, PlanTask, DailyNote, DailyCheckIn) — significant undocumented decision
Multi-tenancy	"queries scoped to session.user.id" (arch §47)	only Plan has userId; Goal, DailyTask, LeetcodeLog, GithubDailyStat, Setting, DailyCheckIn are global (single-tenant)
DailyCheckIn model	not mentioned	exists, drives campfire check-in
Server actions	5 files listed	also leetcode.ts, checkin.ts
Component dirs	nested by feature	mostly flat at src/components/
Styling	"no shadcn" (SPEC §0)	shadcn CLI + tw-animate-css were imported in globals.css until just now
Bug: Vercel crash after "Continue with GitHub" is a separate, urgent issue. Most likely cause: missing env vars (AUTH_SECRET, AUTH_GITHUB_ID/SECRET, DATABASE_URL) or callback URL mismatch on the GitHub OAuth app, not a code bug — but I need to see Vercel logs to confirm.

Recommended order (each tackled in its own pass):

Vercel crash first — it's blocking actual use; cheap to diagnose if you can paste the error from Vercel logs and confirm which env vars are set.
Schema audit & realign — decide String vs DateTime dates, decide single-tenant vs multi-tenant (right now you can't deploy this for anyone but yourself), confirm Goal.category should be enum or stay string. This is the highest-impact item — it shapes the docs.
Rewrite SPEC.md & architecture.md — only after #2, so we're documenting the intended state, not yesterday's state.
Cleanup pass — delete MonthConsistencyGrid (replaced by ActivityHeatmap), unify the two heatmap implementations (/dashboard vs /calendar), drop tw-animate-css/shadcn deps if unused.
Which do you want to start with? My suggestion: #1 (the crash) right now while it's painful, then #2 (schema decisions) — those decisions drive what we write in the docs anyway.



- [x] Fix text clipping (descenders like `g`, `y`) across planner/calendar/settings controls.
- [x] Render planner columns Monday-first instead of Sunday-first.
- [x] Add edit mode for existing planner tasks (title/detail/category/hours/date).

## Priority 2 — Consistency tracking

- [x] Add daily `Check in` button (Today page).
- [x] Add check-in persistence model (per date — `DailyCheckIn` model, Prisma migration done).
- [ ] Add check-in button to Dashboard page (same `CheckInButton` component, same server action, placed below `SummaryGrid`).
- [ ] Caveman campfire celebration overlay on check-in success:
  - Show full-screen (or centred modal) overlay using the GIF: `https://i.pinimg.com/originals/97/e9/79/97e979731beadb50be38e6e273ebfeef.gif`
  - Auto-dismiss after 2.5 s with a fade-out transition
  - Only trigger on a NEW check-in (not when button is already checked in on page load)
  - Triggered inside `CheckInButton` on successful server action return
  - Replace the current scale-pop animation entirely — the GIF IS the animation
- [ ] Add month consistency tracker grid (day-by-day boxes, checked/unchecked state). ← partially done, needs heatmap upgrade below

## Priority 3 — Calendar richness / Activity heatmap

- [ ] Replace `MonthConsistencyGrid` with GitHub-style interactive heatmap using the imported `github-interactive-heatmap` jQuery plugin:
  - **Dependencies to install**: `jquery`, `moment` (+ `moment/locale` bundle). Copy `github-interactive-heatmap/dist/jquery.heatmap.js` into `src/lib/` or import from relative path.
  - **New server data query** (in `dashboard/page.tsx`): aggregate per-day activity for the past 365 days:
    - `DailyCheckIn` — checked-in days
    - `PlanTask` — completed tasks grouped by category (DSA, Java, Design, DevOps, Review, Mock)
    - `LeetcodeLog` — problems solved count per day
    - `GithubDailyStat` — commit count per day
    - Shape: `{ date: string, count: number, meta: { checkedIn, leetcode, github, tasksByCategory } }[]`
    - `count` = sum of: `(checkedIn ? 3 : 0) + leetcode + github + completedTasks` (single activity score for heatmap intensity)
  - **New client component** `ActivityHeatmap` (`"use client"`) wrapping the jQuery plugin:
    - `useEffect` mounts plugin on a `useRef` div, cleans up on unmount
    - Custom `titleFormatter` renders HTML tooltip: date + check-in ✓/✗ + leetcode count + github commits + task categories done
    - DevTrack purple color scheme: `{ 0: '#1a1a1e', 0.25: '#3b2f6e', 0.5: '#6d4fc2', 0.75: '#a78bfa', 1: '#c4b5fd' }` (matches existing `--heatmap-*` CSS vars)
    - `cellSize: 12`, `gutter: 2`, `locale: 'en-US'`
    - Bootstrap tooltips NOT needed — use native `title` attribute or a custom React tooltip
  - Replace the current `MonthConsistencyGrid` section on Dashboard with `ActivityHeatmap`
  - Keep the "X days checked in this month" stat line below the heatmap

- [ ] Build month-view calendar grid (separate from heatmap — for Calendar page).
- [ ] Show per-day activity tags when work was done (DSA, Java, DevOps, etc.).
- [ ] Add compact day popover/details entry point from month cells.

## Priority 4 — Feedback UX

- [ ] Add success notifications/toasts for:
  - task creation
  - log save
  - daily note save
- [ ] Keep error messaging distinct from success messaging.


## Priority 4.5 - Persistant Github activiy , sync -> save in db -> so next syncs only append new activity instead of overriding all off the already synced data 

## Priority 5 - Collapsible view for weekly calendar for each day and it's tasks preview just as type of tasks in stead of full on tasks with description

## Suggested implementation order

1. ~~Planner correctness fixes~~ ✓
2. ~~Check-in data model + Today button~~ ✓ → **next**: dashboard button + campfire overlay
3. Activity heatmap (replace MonthConsistencyGrid)
4. Calendar month grid + day tags
5. Toast notification system across actions
