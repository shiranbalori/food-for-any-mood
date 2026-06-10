-- Daily Quiz rotation: global schedule + shown-question history
-- Run in Supabase SQL Editor after daily-quiz.sql

-- One assigned question per calendar day (same for all users)
create table if not exists public.daily_quiz_schedule (
  quiz_date date primary key,
  quiz_id text not null,
  cycle_number integer not null default 1 check (cycle_number >= 1),
  created_at timestamptz not null default now()
);

create index if not exists daily_quiz_schedule_quiz_id_idx
  on public.daily_quiz_schedule (quiz_id);

-- Tracks which question IDs were shown in the current cycle
create table if not exists public.daily_quiz_rotation (
  id text primary key default 'global',
  cycle_number integer not null default 1 check (cycle_number >= 1),
  used_quiz_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into public.daily_quiz_rotation (id)
values ('global')
on conflict (id) do nothing;

alter table public.daily_quiz_schedule enable row level security;
alter table public.daily_quiz_rotation enable row level security;

drop policy if exists "Quiz schedule is readable by everyone" on public.daily_quiz_schedule;
create policy "Quiz schedule is readable by everyone"
  on public.daily_quiz_schedule for select
  using (true);

drop policy if exists "Authenticated users can assign quiz schedule" on public.daily_quiz_schedule;
create policy "Authenticated users can assign quiz schedule"
  on public.daily_quiz_schedule for insert
  with check (auth.uid() is not null);

drop policy if exists "Quiz rotation is readable by everyone" on public.daily_quiz_rotation;
create policy "Quiz rotation is readable by everyone"
  on public.daily_quiz_rotation for select
  using (true);

drop policy if exists "Authenticated users can update quiz rotation" on public.daily_quiz_rotation;
create policy "Authenticated users can update quiz rotation"
  on public.daily_quiz_rotation for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "Authenticated users can insert quiz rotation" on public.daily_quiz_rotation;
create policy "Authenticated users can insert quiz rotation"
  on public.daily_quiz_rotation for insert
  with check (auth.uid() is not null);

grant select on public.daily_quiz_schedule to anon, authenticated;
grant insert on public.daily_quiz_schedule to authenticated;
grant select, insert, update on public.daily_quiz_rotation to authenticated;

-- Atomically record today's quiz if not already assigned
create or replace function public.assign_daily_quiz(
  p_quiz_date date,
  p_quiz_id text,
  p_cycle_number integer,
  p_used_quiz_ids text[]
)
returns table (quiz_id text, cycle_number integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing record;
begin
  select s.quiz_id, s.cycle_number
  into v_existing
  from public.daily_quiz_schedule s
  where s.quiz_date = p_quiz_date;

  if found then
    return query select v_existing.quiz_id, v_existing.cycle_number;
    return;
  end if;

  insert into public.daily_quiz_rotation (id)
  values ('global')
  on conflict (id) do nothing;

  insert into public.daily_quiz_schedule (quiz_date, quiz_id, cycle_number)
  values (p_quiz_date, p_quiz_id, p_cycle_number)
  on conflict (quiz_date) do nothing;

  select s.quiz_id, s.cycle_number
  into v_existing
  from public.daily_quiz_schedule s
  where s.quiz_date = p_quiz_date;

  if v_existing.quiz_id = p_quiz_id then
    update public.daily_quiz_rotation r
    set
      cycle_number = p_cycle_number,
      used_quiz_ids = p_used_quiz_ids,
      updated_at = now()
    where r.id = 'global';
  end if;

  return query select v_existing.quiz_id, v_existing.cycle_number;
end;
$$;

grant execute on function public.assign_daily_quiz(date, text, integer, text[]) to anon, authenticated;
