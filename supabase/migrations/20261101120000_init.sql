-- Coach Journal: multi-device sync schema
-- Apply in Supabase SQL Editor if CLI is not configured.

create extension if not exists "pgcrypto";

-- Clients
create table if not exists public.clients (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  birth_date text,
  height_cm double precision,
  weight_kg double precision,
  goal text,
  health text,
  notes text,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

create index if not exists clients_user_updated_idx on public.clients (user_id, updated_at);
create index if not exists clients_user_deleted_idx on public.clients (user_id, deleted_at);

-- Workouts (exercises payload kept as jsonb, same shape as the app)
create table if not exists public.workouts (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id text not null,
  date text not null,
  title text not null default '',
  status text not null check (status in ('planned', 'completed')),
  exercises jsonb not null default '[]'::jsonb,
  notes text,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

create index if not exists workouts_user_updated_idx on public.workouts (user_id, updated_at);
create index if not exists workouts_user_client_idx on public.workouts (user_id, client_id);

-- Exercise library
create table if not exists public.exercises (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null default 'Другое',
  metrics jsonb not null default '[]'::jsonb,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

create index if not exists exercises_user_updated_idx on public.exercises (user_id, updated_at);

alter table public.clients enable row level security;
alter table public.workouts enable row level security;
alter table public.exercises enable row level security;

drop policy if exists "clients_own" on public.clients;
create policy "clients_own" on public.clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "workouts_own" on public.workouts;
create policy "workouts_own" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "exercises_own" on public.exercises;
create policy "exercises_own" on public.exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
