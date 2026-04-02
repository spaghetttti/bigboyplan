# DevTrack (tracker)

Next.js app aligned with [SPEC.md](./SPEC.md): personal learning & goal tracker. Current codebase still uses local SQLite (Prisma) from the first MVP; later steps migrate to Supabase + auth per the spec.

**Step 1 (scaffold) done:** Tailwind v4, shadcn/ui (base-nova), Syne + DM Mono, DevTrack dark tokens + heatmap scale in `globals.css`, TanStack Query provider, plus deps: `next-auth@beta`, `@supabase/supabase-js`, `@dnd-kit/*`, `react-hook-form`, `recharts`.

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
