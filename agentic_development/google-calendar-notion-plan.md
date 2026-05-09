# Plan: Google Calendar + Notion Integrations

## Context

Two new manual-sync integrations for the productivity tracker:
1. **Google Calendar**: push individual tasks as all-day events (one-way, per-task button)
2. **Notion**: push a day's journal + LeetCode notes to a Notion page (one-way, per-day button)

Both are user-triggered with synced-state indicators (icon changes when synced).

---

## Schema Changes (`tracker/prisma/schema.prisma`)

**UserSettings** — add 5 new nullable fields:
```
googleAccessToken  String?
googleRefreshToken String?
googleTokenExpiry  DateTime?
notionToken        String?
notionPageId       String?
```

**Task** — add:
```
googleEventId String?
```

**JournalEntry** — add:
```
notionSyncedAt DateTime?
```

Run one combined migration: `npx prisma migrate dev --name add_google_calendar_and_notion_fields`

---

## npm Installs

```bash
npm install googleapis @notionhq/client
```

---

## Environment Variables

Add to `.env.local` and Vercel:
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://<domain>/api/auth/google/callback
```

Notion credentials are user-supplied (stored in UserSettings, not env vars).

---

## Phased Implementation

### Phase 1 — Schema + Types

1. Edit `tracker/prisma/schema.prisma` — add fields above
2. `npx prisma migrate dev --name add_google_calendar_and_notion_fields`
3. `npx prisma generate`
4. `tracker/src/lib/settings.ts`:
   - Extend `UserSettingsRow` + `UserSettingsPatch` with all 5 new fields
   - Add `getGoogleTokens(userId): Promise<{ accessToken, refreshToken, expiry }>`
   - Add `getNotionCredentials(userId): Promise<{ token, pageId }>`
5. `tracker/src/lib/tasks.ts` — add `googleEventId: string | null` to `TaskRow`
6. `tracker/src/lib/journal.ts`:
   - Add `notionSyncedAt: Date | null` to `JournalEntryRow`
   - In `upsertJournalEntry` update clause: add `notionSyncedAt: null` (reset on content change)

---

### Phase 2 — Google Calendar Lib + OAuth

**New: `tracker/src/lib/google-calendar.ts`** (add `import "server-only"`)

```ts
async function getAuthenticatedClient(userId): Promise<OAuth2Client | null>
// Loads tokens via getGoogleTokens(); returns null if no refreshToken.
// Refreshes access token if expiry within 5 min; persists new token via updateUserSettings.

export async function pushTaskToGoogleCalendar(userId, taskId): Promise<string>
// Fetches task from DB → calls getAuthenticatedClient → calendar.events.insert on 'primary'
// Event: { summary: task.title, start: { date: task.dueDate }, end: { date: task.dueDate } }
// Updates task.googleEventId in DB → returns event id
```

**New: `tracker/src/app/api/auth/google/route.ts`** — GET handler
- Calls `requireAuth()`, builds Google OAuth URL (scope: `calendar.events`, `access_type: offline`, `prompt: consent`), redirects to it.

**New: `tracker/src/app/api/auth/google/callback/route.ts`** — GET handler
- Reads `code` from query params, exchanges for tokens, calls `requireAuth()`, stores tokens via `updateUserSettings`, redirects to `/settings?google=connected`. On error → `/settings?google=error`.

---

### Phase 3 — Notion Lib

**New: `tracker/src/lib/notion.ts`** (add `import "server-only"`)

```ts
export async function pushDayToNotion(userId, date): Promise<void>
// 1. getNotionCredentials() — throw if not configured
// 2. getJournalEntry(userId, date) — throw if no entry
// 3. prisma.leetcodeLog.findUnique for same date
// 4. Build Notion blocks (see template below)
// 5. notion.blocks.children.append({ block_id: pageId, children: blocks })
// 6. prisma.journalEntry.update({ notionSyncedAt: new Date() })
```

**Block template** (appended to user's page):
- Heading 2: date string
- Paragraph(s): journal content
- If LeetCode exists: Heading 3 "LeetCode" + bullet items (Easy/Medium/Hard counts > 0) + notes paragraph
- Divider

**New: `tracker/agentic_development/notion-template-format.md`** — documents the block structure for future modification.

---

### Phase 4 — Server Actions

**New: `tracker/src/app/actions/google-calendar.ts`**
```ts
export async function pushTaskToCalendarAction(taskId: string):
  Promise<{ ok: true; eventId: string } | { ok: false; error: string }>
// requireAuth → pushTaskToGoogleCalendar → revalidatePath("/today", "/planner", "/calendar")

export async function disconnectGoogleCalendarAction(): Promise<void>
// requireAuth → updateUserSettings({ googleAccessToken: null, googleRefreshToken: null, googleTokenExpiry: null })
// → revalidatePath("/settings")
```

**New: `tracker/src/app/actions/notion.ts`**
```ts
export async function pushDayToNotionAction(date: string):
  Promise<{ ok: true } | { ok: false; error: string }>
// requireAuth → pushDayToNotion → revalidatePath("/today", "/calendar")
```

**Edit: `tracker/src/app/actions/settings.ts`** — `updateSettingsForm` reads + saves `notionToken`, `notionPageId`.

---

### Phase 5 — Client Components

**New: `tracker/src/components/tasks/CalendarSyncButton.tsx`** (`"use client"`)
```tsx
// Props: taskId, googleEventId: string | null, dueDate: string | null
// Imports pushTaskToCalendarAction directly (valid: client component in server component tree)
// - googleEventId set → green CheckCircle2 icon (status indicator, not clickable)
// - googleEventId null + dueDate null → nothing
// - googleEventId null + dueDate set → Calendar icon button; onClick: startTransition(pushAction)
// Uses useTransition + useToast for loading/error feedback
```

**New: `tracker/src/components/journal/NotionSyncButton.tsx`** (`"use client"`)
```tsx
// Props: date, notionSyncedAt: Date | null, isConfigured: boolean
// Imports pushDayToNotionAction directly
// - !isConfigured → render nothing
// - notionSyncedAt set → green "Synced" chip + "Re-sync" button
// - notionSyncedAt null → "Push to Notion" button
// Uses useTransition + useToast
```

---

### Phase 6 — UI Wiring

**`tracker/src/components/plan/WeeklyPlannerBoard.tsx`**
- Add prop: `pushToCalendarAction: (taskId: string) => Promise<{ ok: true; eventId: string } | { ok: false; error: string }>`
- Render `<CalendarSyncButton taskId={t.id} googleEventId={t.googleEventId} dueDate={t.dueDate} />` inside each task `<li>`, in the top flex row between tags and checkbox

**`tracker/src/app/(app)/planner/page.tsx`**
- Pass `pushToCalendarAction={pushTaskToCalendarAction}` to `<WeeklyPlannerBoard>`

**`tracker/src/app/(app)/today/page.tsx`**
- Add `getUserSettings(userId)` to the `Promise.all`
- Render `<CalendarSyncButton>` in each task `<li>` row (both recurring and scheduled)
- Render `<NotionSyncButton date={date} notionSyncedAt={journalEntry?.notionSyncedAt ?? null} isConfigured={!!(settings.notionToken && settings.notionPageId)} />` below `<JournalForm>` in the Journal section

**`tracker/src/app/(app)/calendar/page.tsx`**
- Capture `getUserSettings(userId)` result
- Same `<CalendarSyncButton>` additions for day tasks
- Same `<NotionSyncButton>` in the journal section

**`tracker/src/app/(app)/settings/page.tsx`**
- Read `searchParams: Promise<{ google?: string }>` — show success/error banner
- Add Google Calendar section: if `settings.googleRefreshToken` set → "Connected" + Disconnect button (form with `disconnectGoogleCalendarAction`); else → `<a href="/api/auth/google">Connect Google Calendar</a>`
- Add Notion fields to existing UserSettings form: `notionToken` (password input) + `notionPageId` (text input)

---

## Verification

1. `npx tsc --noEmit` — zero errors
2. Dev smoke test:
   - Set up Google Cloud project → Calendar API enabled → OAuth credentials → add env vars to `.env.local`
   - In Settings: click "Connect Google Calendar" → consent screen → redirects back with "Connected"
   - Create a task with dueDate → calendar icon appears → click → event shows in Google Calendar → icon turns green checkmark
   - Paste Notion token + page ID in Settings → save → go to Today → write journal → "Push to Notion" → entry appended to Notion page → button shows "Synced"
   - Edit journal content → `notionSyncedAt` resets → button returns to "Push to Notion"
3. `npx prisma migrate deploy` on Neon prod after dev validation

---

## Critical Files

| File | Change |
|------|--------|
| `tracker/prisma/schema.prisma` | +6 new fields across 3 models |
| `tracker/src/lib/settings.ts` | extend types, add 2 helpers |
| `tracker/src/lib/tasks.ts` | add `googleEventId` to `TaskRow` |
| `tracker/src/lib/journal.ts` | add `notionSyncedAt`, reset on upsert |
| `tracker/src/lib/google-calendar.ts` | NEW |
| `tracker/src/lib/notion.ts` | NEW |
| `tracker/src/app/api/auth/google/route.ts` | NEW |
| `tracker/src/app/api/auth/google/callback/route.ts` | NEW |
| `tracker/src/app/actions/google-calendar.ts` | NEW |
| `tracker/src/app/actions/notion.ts` | NEW |
| `tracker/src/app/actions/settings.ts` | add notionToken/notionPageId |
| `tracker/src/components/tasks/CalendarSyncButton.tsx` | NEW |
| `tracker/src/components/journal/NotionSyncButton.tsx` | NEW |
| `tracker/src/components/plan/WeeklyPlannerBoard.tsx` | add prop + render CalendarSyncButton |
| `tracker/src/app/(app)/planner/page.tsx` | pass action prop |
| `tracker/src/app/(app)/today/page.tsx` | fetch settings, add both buttons |
| `tracker/src/app/(app)/calendar/page.tsx` | capture settings, add both buttons |
| `tracker/src/app/(app)/settings/page.tsx` | Google connect section + Notion fields |
| `tracker/agentic_development/notion-template-format.md` | NEW (docs) |
