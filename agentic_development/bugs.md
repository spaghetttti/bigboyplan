# Bugs Log

## Open

- [ ] ActivityHeatmap month/weekday axis labels are too large and overlap the grid cells on some viewport sizes.
- [ ] Error toasts use the same styling as success toasts — should be visually distinct (see todo.md).

## Resolved

- 2026-04-14: GitHub sync date bounds clamped to avoid API range error.
- 2026-05-01: Shadow DB migration failure — old `TRUNCATE TABLE "TaskCompletion"` without CASCADE blocked `prisma migrate dev`. Fixed by resetting schema and creating a fresh init migration.
- 2026-05-01: `updateSettingsForm` returned `{ ok: true }` breaking `<form action>` compatibility. Fixed: return type changed to `Promise<void>`.
- 2026-05-01: `WeeklyPlannerBoard` prop mismatch after rewrite (expected old `PlanTask[]`, received new `TaskWithTags[]`). Fixed: component rewritten to match new Task shape.
