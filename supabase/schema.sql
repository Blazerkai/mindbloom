-- Run this once in your Supabase project's SQL Editor before connecting the app.
-- Auth (users, sessions, password reset) is handled entirely by Supabase Auth —
-- this table just stores the app's own data (player stats, trackers, quests, etc.)
-- as JSON documents, one row per document, scoped to the owning user via RLS.

create table if not exists app_data (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  collection text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists app_data_collection_user_idx on app_data (collection, user_id);

alter table app_data enable row level security;

create policy "Users manage their own rows"
  on app_data
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
