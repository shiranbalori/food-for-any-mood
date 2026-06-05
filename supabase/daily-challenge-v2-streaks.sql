-- Daily Challenge v2: streak tracking columns
-- Run in Supabase SQL Editor after daily-challenge.sql

alter table public.user_gamification
  add column if not exists current_streak integer not null default 0 check (current_streak >= 0);

alter table public.user_gamification
  add column if not exists longest_streak integer not null default 0 check (longest_streak >= 0);

alter table public.user_gamification
  add column if not exists last_challenge_date date;

create index if not exists user_gamification_streak_idx
  on public.user_gamification (current_streak desc);
