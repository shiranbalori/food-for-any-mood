-- FOOD FOR ANY MOOD — Fix "permission denied for table community_recipes"
-- Run this entire script in: Supabase Dashboard → SQL Editor → Run
--
-- Fixes two common issues:
--   1. Missing GRANTs for anon / authenticated roles
--   2. Missing or duplicate RLS policies

-- ---------------------------------------------------------------------------
-- 1. Schema + table privileges (required before RLS can work)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

grant select on public.community_recipes to anon, authenticated;
grant insert, update, delete on public.community_recipes to authenticated;

grant select, insert, update, delete on public.user_recipes to authenticated;

grant select on public.recipe_likes to anon, authenticated;
grant insert, delete on public.recipe_likes to authenticated;

grant select on public.recipe_ratings to anon, authenticated;
grant insert, update on public.recipe_ratings to authenticated;

-- Future tables in public schema (optional safety net)
alter default privileges in schema public
  grant select on tables to anon, authenticated;

alter default privileges in schema public
  grant insert, update, delete on tables to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Enable RLS on all community tables
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.community_recipes enable row level security;
alter table public.recipe_likes enable row level security;
alter table public.recipe_ratings enable row level security;
alter table public.user_recipes enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Drop old policies (safe to re-run)
-- ---------------------------------------------------------------------------
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

drop policy if exists "Community recipes are viewable by everyone" on public.community_recipes;
drop policy if exists "Authenticated users can insert own recipes" on public.community_recipes;
drop policy if exists "Users can update own recipes" on public.community_recipes;
drop policy if exists "Users can delete own recipes" on public.community_recipes;

drop policy if exists "Likes are viewable by everyone" on public.recipe_likes;
drop policy if exists "Authenticated users can like" on public.recipe_likes;
drop policy if exists "Users can remove own likes" on public.recipe_likes;

drop policy if exists "Ratings are viewable by everyone" on public.recipe_ratings;
drop policy if exists "Authenticated users can rate" on public.recipe_ratings;
drop policy if exists "Users can update own ratings" on public.recipe_ratings;

-- ---------------------------------------------------------------------------
-- 4. Profiles
-- ---------------------------------------------------------------------------
create policy "Profiles are viewable by everyone"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 5. Community recipes
-- ---------------------------------------------------------------------------
create policy "Community recipes are viewable by everyone"
  on public.community_recipes
  for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can insert own recipes"
  on public.community_recipes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own recipes"
  on public.community_recipes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own recipes"
  on public.community_recipes
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6. Likes
-- ---------------------------------------------------------------------------
create policy "Likes are viewable by everyone"
  on public.recipe_likes
  for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can like"
  on public.recipe_likes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can remove own likes"
  on public.recipe_likes
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 7. Ratings (1–5 stars)
-- ---------------------------------------------------------------------------
create policy "Ratings are viewable by everyone"
  on public.recipe_ratings
  for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can rate"
  on public.recipe_ratings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own ratings"
  on public.recipe_ratings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 8. View counter RPC (used when expanding recipe details)
-- ---------------------------------------------------------------------------
grant execute on function public.increment_recipe_views(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. Community recipe image URL column + Storage bucket
-- ---------------------------------------------------------------------------
alter table public.community_recipes
  add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-recipe-images',
  'community-recipe-images',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Community recipe images are publicly readable" on storage.objects;
drop policy if exists "Authenticated users can upload own community recipe images" on storage.objects;
drop policy if exists "Users can update own community recipe images" on storage.objects;
drop policy if exists "Users can delete own community recipe images" on storage.objects;

create policy "Community recipe images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'community-recipe-images');

create policy "Authenticated users can upload own community recipe images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'community-recipe-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own community recipe images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'community-recipe-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'community-recipe-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own community recipe images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'community-recipe-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- 10. Community recipe gluten-free flag
-- ---------------------------------------------------------------------------
alter table public.community_recipes
  add column if not exists is_gluten_free boolean not null default false;

-- ---------------------------------------------------------------------------
-- 11. Private user recipes (owner-only RLS)
-- ---------------------------------------------------------------------------
create table if not exists public.user_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) >= 2),
  description text not null default '',
  ingredients text[] not null default '{}',
  steps text[] not null default '{}',
  kosher_category text not null check (kosher_category in ('dairy', 'meat', 'parve', 'any')),
  recipe_type text not null default 'meal' check (recipe_type in ('meal', 'dessert')),
  cooking_time integer not null default 30 check (cooking_time >= 5 and cooking_time <= 180),
  servings integer not null default 4 check (servings in (1, 2, 4, 6, 8)),
  shared_community_recipe_id uuid references public.community_recipes (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_recipes_user_id_created_at_idx
  on public.user_recipes (user_id, created_at desc);

alter table public.user_recipes enable row level security;

drop policy if exists "Users can view own private recipes" on public.user_recipes;
drop policy if exists "Users can insert own private recipes" on public.user_recipes;
drop policy if exists "Users can update own private recipes" on public.user_recipes;
drop policy if exists "Users can delete own private recipes" on public.user_recipes;

create policy "Users can view own private recipes"
  on public.user_recipes
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own private recipes"
  on public.user_recipes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own private recipes"
  on public.user_recipes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own private recipes"
  on public.user_recipes
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Shares (community recipe stats)
create table if not exists public.recipe_shares (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.community_recipes (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists recipe_shares_recipe_id_idx on public.recipe_shares (recipe_id);

alter table public.recipe_shares enable row level security;

drop policy if exists "Shares are viewable by everyone" on public.recipe_shares;
drop policy if exists "Anyone can record a share" on public.recipe_shares;

create policy "Shares are viewable by everyone"
  on public.recipe_shares for select
  using (true);

create policy "Anyone can record a share"
  on public.recipe_shares for insert
  with check (user_id is null or auth.uid() = user_id);

grant select, insert on public.recipe_shares to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Daily challenge gamification (run supabase/daily-challenge.sql for full setup)
-- ---------------------------------------------------------------------------
grant select on public.user_gamification to anon, authenticated;
grant insert, update on public.user_gamification to authenticated;
grant select on public.challenge_submissions to anon, authenticated;
grant insert, update on public.challenge_submissions to authenticated;
grant select on public.challenge_submission_likes to anon, authenticated;
grant insert, delete on public.challenge_submission_likes to authenticated;

alter table if exists public.user_gamification enable row level security;
alter table if exists public.challenge_submissions enable row level security;
alter table if exists public.challenge_submission_likes enable row level security;
