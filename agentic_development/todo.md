# DevTrack Feature Todo

## Priority 1 — Usability / correctness

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
