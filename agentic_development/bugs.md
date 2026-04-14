# Bugs Log

## Open

1. Prisma datasource mismatch on deployment when `DATABASE_URL` is missing.
   - Status: mitigated with build-time fallback and Postgres-only datasource.
   - Permanent requirement: set `DATABASE_URL` in each environment.

2. GitHub sync GraphQL range overflow (`from`/`to` > 1 year).
   - Status: fixed by clamping sync range to 364 days.

## Resolved

- 2026-04-14: Updated GitHub sync date bounds and settings copy.
