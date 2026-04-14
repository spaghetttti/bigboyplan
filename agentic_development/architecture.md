# Architecture Notes

## Runtime shape (current)

- Next.js App Router frontend (`tracker/`)
- Auth: NextAuth v5 with GitHub provider
- Data: Prisma client against PostgreSQL (`DATABASE_URL`)
- Integrations:
  - GitHub GraphQL contribution calendar sync
  - LeetCode manual logging (API integration pending spec step)

## Environment strategy

- Local: Docker Postgres (`docker-compose.yml`)
- Deploy: Supabase Postgres (`DATABASE_URL` from Supabase DB settings)
- Optional Supabase API client for server routes and future RLS flow

## Important constraints

- `DATABASE_URL` is mandatory for Prisma build/runtime.
- GitHub contribution query range must stay under 1 year.
