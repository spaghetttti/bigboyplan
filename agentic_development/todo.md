# DevTrack Feature Todo

## Priority 1 — Usability / correctness

- [x] Fix text clipping (descenders like `g`, `y`) across planner/calendar/settings controls.
- [x] Render planner columns Monday-first instead of Sunday-first.
- [x] Add edit mode for existing planner tasks (title/detail/category/hours/date).

## Priority 2 — Consistency tracking

- [ ] Add daily `Check in` button.
- [ ] Add check-in persistence model (per date).
- [ ] Add satisfying check-in pop-up animation (small but clear visual feedback).
- [ ] Add month consistency tracker grid (day-by-day boxes, checked/unchecked state).

## Priority 3 — Calendar richness

- [ ] Build month-view calendar grid.
- [ ] Show per-day activity tags when work was done (DSA, Java, DevOps, etc.).
- [ ] Add compact day popover/details entry point from month cells.

## Priority 4 — Feedback UX

- [ ] Add success notifications/toasts for:
  - task creation
  - log save
  - daily note save
- [ ] Keep error messaging distinct from success messaging.

## Suggested implementation order

1. Planner correctness fixes (line-height + Monday-first + task edit)
2. Check-in data model + button + tracker
3. Calendar month grid + day tags
4. Toast notification system across actions
