-- FOOD FOR ANY MOOD — Community recipe comments
-- Paste into: Supabase Dashboard → SQL Editor → New query → Run

-- ---------------------------------------------------------------------------
-- Comments table
-- ---------------------------------------------------------------------------
create table if not exists public.recipe_comments (
  id         uuid        primary key default gen_random_uuid(),
  recipe_id  uuid        not null references public.community_recipes (id) on delete cascade,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  body       text        not null
               check (char_length(trim(body)) >= 1 and char_length(trim(body)) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists recipe_comments_recipe_id_idx
  on public.recipe_comments (recipe_id, created_at);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.recipe_comments enable row level security;

create policy "Comments are viewable by everyone"
  on public.recipe_comments for select
  using (true);

create policy "Authenticated users can insert comments"
  on public.recipe_comments for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.recipe_comments for delete
  using (auth.uid() = user_id);

create policy "Users can update own comments"
  on public.recipe_comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Comment reports (moderation queue — no auto-delete)
-- ---------------------------------------------------------------------------
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

create policy "Users can view own comment reports"
  on public.recipe_comment_reports for select
  using (auth.uid() = reporter_id);

create policy "Users can insert own comment reports"
  on public.recipe_comment_reports for insert
  with check (auth.uid() = reporter_id);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant select          on public.recipe_comments to anon, authenticated;
grant insert, update, delete on public.recipe_comments to authenticated;
grant select, insert  on public.recipe_comment_reports to authenticated;
