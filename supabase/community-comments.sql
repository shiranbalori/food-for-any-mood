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

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant select          on public.recipe_comments to anon, authenticated;
grant insert, delete  on public.recipe_comments to authenticated;
