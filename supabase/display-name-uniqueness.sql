-- Public display names: trim-aware uniqueness + no email fallback on signup
-- Run in Supabase Dashboard → SQL Editor

-- Backfill: normalize existing rows (spaces-only names become empty)
update public.profiles
set display_name = trim(display_name)
where display_name is distinct from trim(display_name);

-- Case-insensitive unique display names after trim (min 3 chars)
create unique index if not exists profiles_display_name_lower_unique
  on public.profiles (lower(trim(display_name)))
  where length(trim(display_name)) >= 3;

-- Always store trimmed display names
create or replace function public.normalize_profile_display_name()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.display_name := trim(new.display_name);
  return new;
end;
$$;

drop trigger if exists profiles_normalize_display_name on public.profiles;
create trigger profiles_normalize_display_name
  before insert or update of display_name on public.profiles
  for each row execute function public.normalize_profile_display_name();

-- Trim-aware, case-insensitive uniqueness check
create or replace function public.is_display_name_taken(
  candidate text,
  exclude_user_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where length(trim(candidate)) >= 3
      and length(trim(display_name)) >= 3
      and lower(trim(display_name)) = lower(trim(candidate))
      and (exclude_user_id is null or id <> exclude_user_id)
  );
$$;

grant execute on function public.is_display_name_taken(text, uuid) to anon, authenticated;

-- New users: empty display_name until they choose one (UI shows "משתמש" fallback)
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
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
