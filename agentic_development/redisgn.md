The hierarchy: users → plans → weekly_goals → (tasks via categories)
plans is the top-level context — your "learn leetcode + java" umbrella. One active at a time, others archived. weekly_goals belong to a plan AND carry a category_id, so "solve 5 leetcode problems this week" is scoped to both the plan and the leetcode category. Tasks are standalone but share the same category system via the task_tags junction table — no direct FK to goals, which keeps them flexible.
Two junction tables: task_tags and journal_tags
Both tasks and journal entries are tagged using task_categories — the same category system serves both. This is the hashtag mechanic you mentioned. Instead of a text array on the row, a proper junction table means you can query "show me all tasks and journal entries tagged #system-design this month" efficiently, and renaming a category propagates everywhere automatically.
daily_checkins stays as a table
Even though it's triggered by a button click, persisting it gives you the streak history, the ability to show a check-in heatmap, and the ability to query "did I check in on this day?" without recomputing from activity tables. One row per user per day, UNIQUE(user_id, date) enforced.
weekly_reports stores a jsonb snapshot
Auto-generated every Monday, it captures that week's state as a frozen blob — completed tasks, weekly goal results, leetcode log totals, checkin count, journal entry count. Because it's a snapshot, it won't change if you later edit a task or journal entry. The plan_id FK links the report to whichever plan was active that week.
github_daily_stats is append-only by design
Sync writes new rows for dates that don't exist yet, never overwrites. UNIQUE(user_id, date) uses ON CONFLICT DO NOTHING — so a re-sync never corrupts existing data, just fills in gaps.
user_settings as a separate 1-to-1 table
Keeps users lean. github_token lives here (not in users) which makes it easier to scope access — your API routes that need the token query user_settings, not the main user record. When you add Google Calendar later, it's just two new columns here, no migration on the hot users table.
What's intentionally left out for MVP
The social layer (followers, public profiles, streak comparisons) has no tables yet — but the schema is ready for it. Adding a follows(follower_id, followee_id) junction and a is_public flag on plans is the entire migration needed when you get there.You