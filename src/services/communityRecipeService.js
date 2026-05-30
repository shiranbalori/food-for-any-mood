import { isSupabaseConfigured } from '../lib/supabaseClient'
import { MOCK_COMMUNITY_RECIPES } from '../data/mockCommunityRecipes'

/**
 * Returns community recipes for the UI.
 * Step 2: query Supabase when `isSupabaseConfigured` is true.
 *
 * @returns {Promise<typeof MOCK_COMMUNITY_RECIPES>}
 */
export async function fetchCommunityRecipes() {
  if (!isSupabaseConfigured) {
    return MOCK_COMMUNITY_RECIPES
  }

  // Step 2: supabase.from('community_recipes').select(...)
  return MOCK_COMMUNITY_RECIPES
}
