-- DevTrack MVP schema + RLS (SPEC.md §3, §3.7)
-- Apply via Supabase Dashboard → SQL → New query, or: supabase db push
--
-- users.id is tied to auth.users.id so auth.uid() RLS works. On signup, insert
-- public.users with id = auth.uid() (Step 3 / auth flow).
--
-- Local Docker Postgres (no Supabase): use docker/postgres/init/01-devtrack-local.sql instead.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  github_id text not null unique,
  github_login text not null,
  email text,
  avatar_url text,
  leetcode_username text,
  github_username text,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  date date not null,
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, title, date)
);

create index if not exists daily_tasks_user_id_date_idx
  on public.daily_tasks (user_id, date);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists journal_entries_user_id_date_idx
  on public.journal_entries (user_id, date desc);

create or replace function public.set_journal_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists journal_entries_set_updated_at on public.journal_entries;
create trigger journal_entries_set_updated_at
  before update on public.journal_entries
  for each row
  execute function public.set_journal_updated_at();

create table if not exists public.leetcode_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  easy_solved integer not null default 0,
  medium_solved integer not null default 0,
  hard_solved integer not null default 0,
  total_solved integer not null default 0,
  source text not null default 'manual'
    check (source in ('scrape', 'manual')),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists leetcode_snapshots_user_id_date_idx
  on public.leetcode_snapshots (user_id, date desc);

create table if not exists public.github_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  commits integer not null default 0,
  synced_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists github_activity_user_id_date_idx
  on public.github_activity (user_id, date desc);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  metric_type text not null,
  target_value integer not null,
  current_value integer not null default 0,
  deadline date not null,
  is_preset boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists goals_user_id_archived_idx
  on public.goals (user_id, is_archived);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.journal_entries enable row level security;
alter table public.leetcode_snapshots enable row level security;
alter table public.github_activity enable row level security;
alter table public.goals enable row level security;

-- public.users: own row only (id = auth user)
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

create policy "users_insert_own"
  on public.users for insert
  with check (auth.uid() = id);

create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "users_delete_own"
  on public.users for delete
  using (auth.uid() = id);

-- Child tables: user_id = auth.uid()
create policy "daily_tasks_select_own"
  on public.daily_tasks for select
  using (auth.uid() = user_id);

create policy "daily_tasks_insert_own"
  on public.daily_tasks for insert
  with check (auth.uid() = user_id);

create policy "daily_tasks_update_own"
  on public.daily_tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "daily_tasks_delete_own"
  on public.daily_tasks for delete
  using (auth.uid() = user_id);

create policy "journal_entries_select_own"
  on public.journal_entries for select
  using (auth.uid() = user_id);

create policy "journal_entries_insert_own"
  on public.journal_entries for insert
  with check (auth.uid() = user_id);

create policy "journal_entries_update_own"
  on public.journal_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "journal_entries_delete_own"
  on public.journal_entries for delete
  using (auth.uid() = user_id);

create policy "leetcode_snapshots_select_own"
  on public.leetcode_snapshots for select
  using (auth.uid() = user_id);

create policy "leetcode_snapshots_insert_own"
  on public.leetcode_snapshots for insert
  with check (auth.uid() = user_id);

create policy "leetcode_snapshots_update_own"
  on public.leetcode_snapshots for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "leetcode_snapshots_delete_own"
  on public.leetcode_snapshots for delete
  using (auth.uid() = user_id);

create policy "github_activity_select_own"
  on public.github_activity for select
  using (auth.uid() = user_id);

create policy "github_activity_insert_own"
  on public.github_activity for insert
  with check (auth.uid() = user_id);

create policy "github_activity_update_own"
  on public.github_activity for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "github_activity_delete_own"
  on public.github_activity for delete
  using (auth.uid() = user_id);

create policy "goals_select_own"
  on public.goals for select
  using (auth.uid() = user_id);

create policy "goals_insert_own"
  on public.goals for insert
  with check (auth.uid() = user_id);

create policy "goals_update_own"
  on public.goals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "goals_delete_own"
  on public.goals for delete
  using (auth.uid() = user_id);
