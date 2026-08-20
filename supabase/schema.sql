-- Run this once in your Supabase project's SQL Editor before connecting the app.
-- Auth (users, sessions, password reset) is handled entirely by Supabase Auth —
-- this table just stores the app's own data (player stats, trackers, quests, etc.)
-- as JSON documents, one row per document, scoped to the owning user via RLS.

create table if not exists app_data (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  collection text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (id, collection)
);

create index if not exists app_data_collection_user_idx on app_data (collection, user_id);

alter table app_data enable row level security;

create policy "Users manage their own rows"
  on app_data
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- MIGRATION — run this once if app_data already exists with the
-- old single-column primary key (id). Fixes a bug where documents
-- in different collections sharing the same id (e.g. a "profiles"
-- row and a "players" row both keyed by the user's uid) would
-- overwrite each other on upsert.
-- ============================================================
-- alter table app_data drop constraint app_data_pkey;
-- alter table app_data add primary key (id, collection);

-- ============================================================
-- REAL CROSS-USER LEADERBOARD & FRIEND CHEERS
-- RLS above intentionally limits every user to their own rows.
-- These two SECURITY DEFINER functions are the one deliberate,
-- narrow exception: leaderboard() exposes only name/school/level/xp
-- (never trackers, journal, contacts, etc.), and send_cheer() lets
-- one user drop a notification row into another user's collection.
-- Run this once in the SQL Editor.
-- ============================================================
create or replace function public.leaderboard(limit_n int default 100)
returns table(user_id uuid, name text, school text, level int, total_xp int, streak int)
language sql
security definer
set search_path = public
as $$
  select
    pl.user_id,
    coalesce(pr.data->>'name', 'Bloomer') as name,
    pr.data->>'school' as school,
    coalesce((pl.data->>'level')::int, 1) as level,
    coalesce((pl.data->>'totalXp')::int, 0) as total_xp,
    coalesce((pl.data->>'streak')::int, 0) as streak
  from app_data pl
  left join app_data pr on pr.user_id = pl.user_id and pr.collection = 'profiles'
  where pl.collection = 'players'
  order by total_xp desc
  limit limit_n;
$$;

grant execute on function public.leaderboard(int) to authenticated;

create or replace function public.send_cheer(target_user_id uuid, message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into app_data (id, user_id, collection, data)
  values (
    gen_random_uuid()::text,
    target_user_id,
    'notifications',
    jsonb_build_object('userId', target_user_id, 'message', message, 'read', false, 'ts', floor(extract(epoch from now()) * 1000))
  );
end;
$$;

grant execute on function public.send_cheer(uuid, text) to authenticated;
