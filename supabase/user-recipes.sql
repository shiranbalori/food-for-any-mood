-- FOOD FOR ANY MOOD — Private user recipes (run in Supabase SQL Editor after schema.sql)

-- ---------------------------------------------------------------------------
-- Private user recipes (visible only to owner until shared to community)
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
  -- NULL = private only; set = published to community (public visibility via community_recipes RLS)
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

grant select, insert, update, delete on public.user_recipes to authenticated;
