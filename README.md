# DevTrack (tracker)

Next.js app aligned with [SPEC.md](./SPEC.md): personal learning & goal tracker. The app now expects PostgreSQL via `DATABASE_URL` (local Docker or Supabase remote).

**Step 1 (scaffold) done:** Tailwind v4, shadcn/ui (base-nova), Syne + DM Mono, DevTrack dark tokens + heatmap scale in `globals.css`, TanStack Query provider, plus deps: `next-auth@beta`, `@supabase/supabase-js`, `@supabase/ssr`, `@dnd-kit/*`, `react-hook-form`, `recharts`.

**Step 2 (database):** Two options — **local Postgres (Docker)** is the default path for now; **Supabase** stays optional for later.

| Path | Schema | Notes |
|------|--------|--------|
| **Docker** | [`docker/postgres/init/01-devtrack-local.sql`](docker/postgres/init/01-devtrack-local.sql) | Plain Postgres, same tables as SPEC §3, no `auth.users` FK, **RLS off** (fine for local dev). |
| **Supabase** | [`supabase/migrations/20260402190000_devtrack_schema.sql`](supabase/migrations/20260402190000_devtrack_schema.sql) | `users.id` → `auth.users`, **RLS on** — run when you configure a Supabase project. |

Supabase clients live in [`src/lib/supabase/`](src/lib/supabase/) whenever you add keys to `.env.local`.

### Local Postgres (Docker)

1. From `tracker/`: `docker compose up -d` (first start applies init SQL automatically).
2. Connection string: `postgresql://devtrack:devtrack@localhost:5432/devtrack?schema=public`
3. To reset the DB completely: `docker compose down -v` then `docker compose up -d` (destroys the volume).

If you change `01-devtrack-local.sql` after the DB already exists, either run the new SQL manually or wipe the volume as above.

**Step 3 (auth) done:** NextAuth.js v5 + GitHub OAuth; profile upsert into Prisma `users` (SPEC §3.1); JWT/session includes `session.user.id`; optional mirror to Supabase `users` when service-role env is set ([`src/lib/auth/sync-user-supabase.ts`](src/lib/auth/sync-user-supabase.ts)). Routes: [`/login`](src/app/login/page.tsx), [`/api/auth/*`](src/app/api/auth/[...nextauth]/route.ts), app shell under [`(app)/`](src/app/(app)/). [`src/middleware.ts`](src/middleware.ts) allows `/login` and `/api/auth/*`; everything else requires a session. `/` redirects to `/dashboard` or `/login`.

1. [Create a GitHub OAuth App](https://github.com/settings/developers): Application callback URL `http://localhost:3000/api/auth/callback/github` (add production URL when you deploy).
2. Set `AUTH_SECRET` (or `NEXTAUTH_SECRET`) — e.g. `openssl rand -base64 32`.
3. Set `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` or `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`.
4. `npm run dev` → open `/login` → **Continue with GitHub**.

### Supabase / Vercel

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API:** copy URL + anon + service_role into `.env.local` ([`.env.example`](.env.example)).
3. **Project Settings → Database:** copy a Postgres connection string and set `DATABASE_URL` (required for Prisma at build/runtime).
4. **SQL Editor:** run [`supabase/migrations/20260402190000_devtrack_schema.sql`](supabase/migrations/20260402190000_devtrack_schema.sql).

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

The token is stored in your configured Postgres database.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build (runs `prisma generate`)
- `npm run db:studio` — Prisma Studio for your `DATABASE_URL` database
- `docker compose up -d` / `docker compose down` — local Postgres ([`docker-compose.yml`](docker-compose.yml))
