# DevTrack (tracker)

Next.js app aligned with [SPEC.md](./SPEC.md): personal learning & goal tracker. Current codebase still uses local SQLite (Prisma) from the first MVP; later steps migrate to Supabase + auth per the spec.

**Step 1 (scaffold) done:** Tailwind v4, shadcn/ui (base-nova), Syne + DM Mono, DevTrack dark tokens + heatmap scale in `globals.css`, TanStack Query provider, plus deps: `next-auth@beta`, `@supabase/supabase-js`, `@supabase/ssr`, `@dnd-kit/*`, `react-hook-form`, `recharts`.

**Step 2 (database):** Two options — **local Postgres (Docker)** is the default path for now; **Supabase** stays optional for later.

| Path | Schema | Notes |
|------|--------|--------|
| **Docker** | [`docker/postgres/init/01-devtrack-local.sql`](docker/postgres/init/01-devtrack-local.sql) | Plain Postgres, same tables as SPEC §3, no `auth.users` FK, **RLS off** (fine for local dev). |
| **Supabase** | [`supabase/migrations/20260402190000_devtrack_schema.sql`](supabase/migrations/20260402190000_devtrack_schema.sql) | `users.id` → `auth.users`, **RLS on** — run when you configure a Supabase project. |

Supabase clients live in [`src/lib/supabase/`](src/lib/supabase/) whenever you add keys to `.env.local`.

### Local Postgres (Docker)

1. From `tracker/`: `docker compose up -d` (first start applies init SQL automatically).
2. Connection string: `postgresql://devtrack:devtrack@localhost:5432/devtrack`
3. To reset the DB completely: `docker compose down -v` then `docker compose up -d` (destroys the volume).

If you change `01-devtrack-local.sql` after the DB already exists, either run the new SQL manually or wipe the volume as above.

### Supabase (when you are ready)

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API:** copy URL + anon + service_role into `.env.local` ([`.env.example`](.env.example)).
3. **SQL Editor:** run [`supabase/migrations/20260402190000_devtrack_schema.sql`](supabase/migrations/20260402190000_devtrack_schema.sql).

## Setup

```bash
cd tracker
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## GitHub token

1. Create a [personal access token](https://github.com/settings/tokens) (classic or fine-grained).
2. For the contribution calendar GraphQL query, the token must identify you: classic token with default `read:user` is enough for public contributions; include **`repo`** if you need private-repository activity reflected in your graph.
3. Paste the token in **Settings → Save token**, then **Sync GitHub now**.

The token is stored only in your local database. Do not commit `prisma/dev.db`.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build (runs `prisma generate`)
- `npm run db:studio` — Prisma Studio for the SQLite file
- `docker compose up -d` / `docker compose down` — local Postgres ([`docker-compose.yml`](docker-compose.yml))
