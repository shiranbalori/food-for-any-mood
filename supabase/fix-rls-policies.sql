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
