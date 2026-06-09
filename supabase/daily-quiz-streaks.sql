-- Food For Any Mood — Daily Quiz Streak Bonus columns
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run: all statements use ADD COLUMN IF NOT EXISTS

-- quiz_current_streak          consecutive days the user answered the quiz (any answer)
-- quiz_longest_streak          all-time best participation streak
-- last_quiz_date               date of last quiz answer (used to detect missed days)
-- quiz_streak_bonus_count      how many 10-day participation milestones have been awarded
-- quiz_correct_streak          consecutive correct answers (reset on any wrong answer)
-- quiz_correct_streak_bonus_count  how many 10-correct milestones have been awarded

ALTER TABLE public.user_gamification
  ADD COLUMN IF NOT EXISTS quiz_current_streak              integer NOT NULL DEFAULT 0
    CHECK (quiz_current_streak >= 0),
  ADD COLUMN IF NOT EXISTS quiz_longest_streak              integer NOT NULL DEFAULT 0
    CHECK (quiz_longest_streak >= 0),
  ADD COLUMN IF NOT EXISTS last_quiz_date                   date,
  ADD COLUMN IF NOT EXISTS quiz_streak_bonus_count          integer NOT NULL DEFAULT 0
    CHECK (quiz_streak_bonus_count >= 0),
  ADD COLUMN IF NOT EXISTS quiz_correct_streak              integer NOT NULL DEFAULT 0
    CHECK (quiz_correct_streak >= 0),
  ADD COLUMN IF NOT EXISTS quiz_correct_streak_bonus_count  integer NOT NULL DEFAULT 0
    CHECK (quiz_correct_streak_bonus_count >= 0);
