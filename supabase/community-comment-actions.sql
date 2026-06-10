-- FOOD FOR ANY MOOD — Community comment edit + report
-- Run in Supabase SQL Editor after community-comments.sql

-- Allow comment owners to edit their own comments
drop policy if exists "Users can update own comments" on public.recipe_comments;
create policy "Users can update own comments"
  on public.recipe_comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant update on public.recipe_comments to authenticated;

-- Moderation queue: reports are stored, comments are not auto-deleted
create table if not exists public.recipe_comment_reports (
  id          uuid        primary key default gen_random_uuid(),
  comment_id  uuid        not null references public.recipe_comments (id) on delete cascade,
  reporter_id uuid        not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (comment_id, reporter_id)
);

create index if not exists recipe_comment_reports_comment_id_idx
  on public.recipe_comment_reports (comment_id, created_at desc);

alter table public.recipe_comment_reports enable row level security;

drop policy if exists "Users can view own comment reports" on public.recipe_comment_reports;
create policy "Users can view own comment reports"
  on public.recipe_comment_reports for select
  using (auth.uid() = reporter_id);

drop policy if exists "Users can insert own comment reports" on public.recipe_comment_reports;
create policy "Users can insert own comment reports"
  on public.recipe_comment_reports for insert
  with check (auth.uid() = reporter_id);

grant select, insert on public.recipe_comment_reports to authenticated;
