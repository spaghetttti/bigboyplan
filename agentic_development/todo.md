# DevTrack Feature Todo


- [ ] Make a small gender options for default name Big Boy Plan , a option in setting to make the title to Big Girl Plan or Big Person Plan for they them
- [ ] Make on hover tooltip in gridview heatmap for each day what was done , Tasks, Leetcode, GithubActivity , Checkin
- [ ] Add success notifications/toasts for:
  - task creation
  - log save
  - daily note save
- [ ] Keep error messaging distinct from success messaging.



## Tech debt — Auth pattern review
Currently every Server Action calls `requireAuth()` (which calls `auth()` internally) and every page calls `auth()` directly to get userId. This works but is repetitive. 

Questions to explore:
- Does Next.js middleware auth already guarantee the session exists by the time a server component renders? (Yes for pages — middleware blocks unauthenticated routes. But Server Actions are not covered by middleware, so `requireAuth()` there is necessary.)
- Could we use a React cache()-wrapped `getAuthUser()` so `auth()` is called once per request across all server components on a page, instead of N times?
- Longer term: if the app grows, consider an explicit session context or a tRPC-style caller pattern that attaches userId once at the request boundary. 


## Suggested implementation order

1. ~~Planner correctness fixes~~ ✓
2. ~~Check-in data model + Today button~~ ✓ → **next**: dashboard button + campfire overlay
3. Activity heatmap (replace MonthConsistencyGrid)
4. Calendar month grid + day tags
5. Toast notification system across actions
