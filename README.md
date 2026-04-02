# Local goals tracker

Next.js app for daily tasks, manual LeetCode logs, goals, and GitHub contribution sync. Data lives in SQLite (`prisma/dev.db`) on your machine.

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
