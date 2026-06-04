-- FOOD FOR ANY MOOD — Supabase community recipes schema
-- Paste this entire file into: Supabase Dashboard → SQL Editor → New query → Run

-- ---------------------------------------------------------------------------
-- Profiles (display name for recipe authors)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Community recipes
-- ---------------------------------------------------------------------------
create table if not exists public.community_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) >= 2),
  description text not null default '',
  ingredients text[] not null default '{}',
  steps text[] not null default '{}',
  kosher_category text not null check (kosher_category in ('dairy', 'meat', 'parve')),
  recipe_type text not null default 'meal' check (recipe_type in ('meal', 'dessert')),
  is_gluten_free boolean not null default false,
  image_url text,
  view_count integer not null default 0 check (view_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists community_recipes_created_at_idx
  on public.community_recipes (created_at desc);

alter table public.community_recipes enable row level security;

create policy "Community recipes are viewable by everyone"
  on public.community_recipes for select
  using (true);

create policy "Authenticated users can insert own recipes"
  on public.community_recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own recipes"
  on public.community_recipes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own recipes"
  on public.community_recipes for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Private user recipes (owner-only until shared to community)
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

create policy "Users can view own private recipes"
  on public.user_recipes for select
  using (auth.uid() = user_id);

create policy "Users can insert own private recipes"
  on public.user_recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own private recipes"
  on public.user_recipes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own private recipes"
  on public.user_recipes for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Likes
-- ---------------------------------------------------------------------------
create table if not exists public.recipe_likes (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.community_recipes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (recipe_id, user_id)
);

create index if not exists recipe_likes_recipe_id_idx on public.recipe_likes (recipe_id);

alter table public.recipe_likes enable row level security;

create policy "Likes are viewable by everyone"
  on public.recipe_likes for select
  using (true);

create policy "Authenticated users can like"
  on public.recipe_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own likes"
  on public.recipe_likes for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Ratings (1–5 stars, one per user per recipe)
-- ---------------------------------------------------------------------------
create table if not exists public.recipe_ratings (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.community_recipes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating >= 1 and rating <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id, user_id)
);

create index if not exists recipe_ratings_recipe_id_idx on public.recipe_ratings (recipe_id);

alter table public.recipe_ratings enable row level security;

create policy "Ratings are viewable by everyone"
  on public.recipe_ratings for select
  using (true);

create policy "Authenticated users can rate"
  on public.recipe_ratings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own ratings"
  on public.recipe_ratings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Shares
-- ---------------------------------------------------------------------------
create table if not exists public.recipe_shares (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.community_recipes (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists recipe_shares_recipe_id_idx on public.recipe_shares (recipe_id);

alter table public.recipe_shares enable row level security;

create policy "Shares are viewable by everyone"
  on public.recipe_shares for select
  using (true);

create policy "Anyone can record a share"
  on public.recipe_shares for insert
  with check (user_id is null or auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.increment_recipe_views(recipe_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.community_recipes
  set view_count = view_count + 1
  where id = recipe_uuid;
end;
$$;

grant execute on function public.increment_recipe_views(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Community recipe images (Supabase Storage)
-- ---------------------------------------------------------------------------
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

-- Table-level grants (required — without these you get "permission denied for table ...")
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
grant select, insert on public.recipe_shares to anon, authenticated;
