-- Community recipe shares (run in Supabase SQL editor if not using full schema refresh)

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
