# DevTrack Feature Todo

## Pending

- [ ] Gender-inclusive app name: option in Settings to switch "Big Boy Plan" title to "Big Girl Plan" or "Big Person Plan"
- [ ] Planner page: prev/next week navigation (currently shows current week only)
- [ ] Google Calendar integration — see `google-calendar-notion-plan.md`
- [ ] Notion integration — see `google-calendar-notion-plan.md`
- [ ] Edit/Delete Tasks in Planner page
- [ ] Add List of Journal Entries , this weeks entries in Calendar page with Pagination to get more older journal, 
- [ ] Add List of LeetCode logs in Calendar page with Pagination to get more older Leetcode Logs with notes   
- [ ] Make Both List of Journal Entries and LeetCode logs with export history button to download a .md file with all Journal Logs , or all Leetcode logs
 
## Completed

- [x] Heatmap tooltip: shows per-day breakdown (tasks, LeetCode, GitHub, check-in)
- [x] Toast notifications for task creation, log save, journal save, and other DB mutations
- [x] Full schema rewrite: unified Task model, JournalEntry, WeeklyGoal, UserSettings, M:N tags (2026-05)
- [x] Multi-user data isolation: all tables now scoped by userId
- [x] Weekly planner board: 7-column layout using new Task model
- [x] MultiTagPicker component: M:N category selection in task/recurring forms
- [x] WeeklyGoal CRUD: ISO week tracking, targetValue/actualValue, status auto-derivation
- [x] LeetCode log split into easy/medium/hard counts
- [x] GitHub token moved to UserSettings (was global Setting key-value)
- [x] Production deploy: Neon Postgres + Vercel (2026-04-30)

## Tech debt

- Auth pattern: every page calls `requireAuth()` directly. Could use React `cache()` to deduplicate `auth()` across server components on the same request. Low priority for now.
- `WeeklyReport` table exists in schema but has no generation logic or UI.
- `@dnd-kit` is installed but not wired to any drag-and-drop UI.
