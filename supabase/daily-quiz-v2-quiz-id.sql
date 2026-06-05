-- Daily Quiz v2: add quiz_id column for question tracking
-- Run in Supabase SQL Editor if daily-quiz.sql was already applied

alter table public.daily_quiz_answers
  add column if not exists quiz_id text;
