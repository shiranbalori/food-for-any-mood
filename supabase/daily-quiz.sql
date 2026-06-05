-- Daily Food Quiz schema (optional — localStorage fallback works without this)
-- Run in Supabase SQL Editor after daily-challenge.sql

-- ---------------------------------------------------------------------------
-- Quiz answer tracking (one answer per user per day)
-- ---------------------------------------------------------------------------
create table if not exists public.daily_quiz_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quiz_date date not null,
  quiz_id text,
  selected_index smallint not null check (selected_index >= 0 and selected_index <= 3),
  is_correct boolean not null default false,
  points_awarded integer not null default 0 check (points_awarded >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, quiz_date)
);

create index if not exists daily_quiz_answers_date_idx
  on public.daily_quiz_answers (quiz_date desc);

alter table public.daily_quiz_answers enable row level security;

create policy "Users can view own quiz answers"
  on public.daily_quiz_answers for select
  using (auth.uid() = user_id);

create policy "Users can insert own quiz answer"
  on public.daily_quiz_answers for insert
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Gamification quiz counters on user_gamification
-- ---------------------------------------------------------------------------
alter table public.user_gamification
  add column if not exists quizzes_answered integer not null default 0 check (quizzes_answered >= 0);

alter table public.user_gamification
  add column if not exists quiz_correct_count integer not null default 0 check (quiz_correct_count >= 0);

grant select, insert on public.daily_quiz_answers to authenticated;
