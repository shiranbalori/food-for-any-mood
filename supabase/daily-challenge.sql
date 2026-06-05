-- Daily Challenge gamification schema
-- Run in Supabase SQL Editor after schema.sql

-- ---------------------------------------------------------------------------
-- User gamification (points, levels, achievements)
-- ---------------------------------------------------------------------------
create table if not exists public.user_gamification (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_points integer not null default 0 check (total_points >= 0),
  challenges_completed integer not null default 0 check (challenges_completed >= 0),
  photos_uploaded integer not null default 0 check (photos_uploaded >= 0),
  likes_received integer not null default 0 check (likes_received >= 0),
  unlocked_achievements text[] not null default '{}',
  weekly_top_awards text[] not null default '{}',
  five_like_awards uuid[] not null default '{}',
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_challenge_date date,
  updated_at timestamptz not null default now()
);

create index if not exists user_gamification_points_idx
  on public.user_gamification (total_points desc, challenges_completed desc);

alter table public.user_gamification enable row level security;

create policy "Gamification is viewable by everyone"
  on public.user_gamification for select
  using (true);

create policy "Users can upsert own gamification"
  on public.user_gamification for insert
  with check (auth.uid() = user_id);

create policy "Users can update own gamification"
  on public.user_gamification for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Daily challenge submissions
-- ---------------------------------------------------------------------------
create table if not exists public.challenge_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  dish_name text not null check (char_length(trim(dish_name)) >= 2),
  description text not null default '',
  photo_url text,
  created_at timestamptz not null default now(),
  unique (challenge_date, user_id)
);

create index if not exists challenge_submissions_date_idx
  on public.challenge_submissions (challenge_date desc, created_at desc);

create index if not exists challenge_submissions_user_idx
  on public.challenge_submissions (user_id, created_at desc);

alter table public.challenge_submissions enable row level security;

create policy "Challenge submissions are viewable by everyone"
  on public.challenge_submissions for select
  using (true);

create policy "Authenticated users can insert own challenge submission"
  on public.challenge_submissions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own challenge submission"
  on public.challenge_submissions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Challenge submission likes
-- ---------------------------------------------------------------------------
create table if not exists public.challenge_submission_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  submission_id uuid not null references public.challenge_submissions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, submission_id)
);

create index if not exists challenge_submission_likes_submission_idx
  on public.challenge_submission_likes (submission_id);

alter table public.challenge_submission_likes enable row level security;

create policy "Challenge likes are viewable by everyone"
  on public.challenge_submission_likes for select
  using (true);

create policy "Authenticated users can like challenge submissions"
  on public.challenge_submission_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own challenge likes"
  on public.challenge_submission_likes for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Challenge submission images (Supabase Storage)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'challenge-submission-images',
  'challenge-submission-images',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Challenge submission images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'challenge-submission-images');

create policy "Authenticated users can upload own challenge images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'challenge-submission-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own challenge images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'challenge-submission-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'challenge-submission-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own challenge images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'challenge-submission-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant select on public.user_gamification to anon, authenticated;
grant insert, update on public.user_gamification to authenticated;
grant select on public.challenge_submissions to anon, authenticated;
grant insert, update on public.challenge_submissions to authenticated;
grant select on public.challenge_submission_likes to anon, authenticated;
grant insert, delete on public.challenge_submission_likes to authenticated;
