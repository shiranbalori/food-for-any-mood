-- Allow users to remove their own star rating (toggle-off in UI).
-- Run in Supabase SQL editor if delete on recipe_ratings is not yet allowed.

grant delete on public.recipe_ratings to authenticated;

drop policy if exists "Users can delete own ratings" on public.recipe_ratings;

create policy "Users can delete own ratings"
  on public.recipe_ratings for delete
  using (auth.uid() = user_id);
