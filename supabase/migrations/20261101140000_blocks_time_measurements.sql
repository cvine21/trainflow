-- Workout blocks (sets / superset / rounds / EMOM / AMRAP / for time), session time,
-- and a dated body measurements log. Apply in Supabase SQL Editor after the init migration.

alter table public.workouts add column if not exists blocks jsonb;
alter table public.workouts add column if not exists time text;

create table if not exists public.measurements (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id text not null,
  date text not null,
  weight_kg double precision,
  height_cm double precision,
  chest_cm double precision,
  waist_cm double precision,
  hips_cm double precision,
  thigh_cm double precision,
  arm_cm double precision,
  body_fat_pct double precision,
  note text,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

create index if not exists measurements_user_updated_idx on public.measurements (user_id, updated_at);
create index if not exists measurements_user_client_idx on public.measurements (user_id, client_id);

alter table public.measurements enable row level security;

drop policy if exists "measurements_own" on public.measurements;
create policy "measurements_own" on public.measurements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
