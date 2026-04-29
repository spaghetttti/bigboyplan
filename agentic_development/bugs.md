# Bugs Log

## Open

1. Prisma datasource mismatch on deployment when `DATABASE_URL` is missing.
   - Status: mitigated with build-time fallback and Postgres-only datasource.
   - Permanent requirement: set `DATABASE_URL` in each environment.

2. GitHub sync GraphQL range overflow (`from`/`to` > 1 year).
   - Status: fixed by clamping sync range to 364 days.

3. Check-in celebration modal not rendering as true overlay — appears contained within component layout.
   - **What**: `<CheckInButton>` modal on successful check-in should be a full-viewport overlay (fixed, centered). Instead, it renders clipped/confined to the component's DOM subtree.
   - **Expected**: On click "Check In" → smooth fade-in overlay with campfire GIF covering entire screen, centered modal card, smooth fade-out + auto-dismiss after 2.6s.
   - **Actual**: Modal appears but stays within the component, not visible as a true overlay.
   - **Fixes tried**:
     1. Used `createPortal(modal, document.body)` — renders to body root, bypasses any containing block issues.
     2. Added explicit inline styles: `position: "fixed"`, `inset: 0`, `zIndex: 9999` to prevent any Tailwind class conflicts.
     3. Replaced CSS transitions with CSS `@keyframes` in globals.css (`campfire-backdrop-in`, `campfire-backdrop-out`, `campfire-card-in`, `campfire-card-out`) — no more `useTransition`/`requestAnimationFrame` timing.
     4. Used phase state machine (`"hidden" | "in" | "out"`) with explicit setTimeout timing (FADE_MS=420ms, HOLD_MS=2400ms).
   - **Status**: Still not rendering as true overlay — issue persists despite all fixes. Needs investigation into why portal isn't reaching document.body or a different rendering approach.

## Resolved

- 2026-04-14: Updated GitHub sync date bounds and settings copy.
