-- Food For Any Mood — add missing columns + tables
-- Run in: Supabase Dashboard → SQL Editor → New query → Run

-- 1. Add image_url column to community_recipes (was missing, caused 400 on SELECT)
ALTER TABLE public.community_recipes
  ADD COLUMN IF NOT EXISTS image_url text;

-- 2. Create recipe_shares table (was missing entirely)
CREATE TABLE IF NOT EXISTS public.recipe_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.community_recipes (id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recipe_shares_recipe_id_idx
  ON public.recipe_shares (recipe_id);

ALTER TABLE public.recipe_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shares are viewable by everyone" ON public.recipe_shares;
DROP POLICY IF EXISTS "Anyone can record a share"      ON public.recipe_shares;

CREATE POLICY "Shares are viewable by everyone"
  ON public.recipe_shares FOR SELECT
  USING (true);

CREATE POLICY "Anyone can record a share"
  ON public.recipe_shares FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

GRANT SELECT, INSERT ON public.recipe_shares TO anon, authenticated;
