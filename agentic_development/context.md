# Quick Context

- Project folder: `tracker/`
- Goal: personal progress tracker (DevTrack) with auth, tasks, goals, journal, and activity visuals.
- Implementation status:
  - Step 1 scaffold complete
  - Step 2 DB groundwork complete (Docker + Supabase SQL)
  - Step 3 auth complete (NextAuth + middleware)
- Recent fixes:
  - Prisma switched to PostgreSQL datasource
  - GitHub sync date range clamped to avoid API error

## Next suggested step

- Step 4 from `tracker/SPEC.md`: settings model normalization and sync preferences tied to authenticated user.
