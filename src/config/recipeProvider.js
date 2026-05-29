/**
 * Recipe generation mode — no secrets here.
 * Default is AI/backend; set VITE_RECIPE_PROVIDER=mock for local templates only.
 *
 * Backend API URL: VITE_API_BASE_URL (see src/config/api.js)
 *
 * @type {'mock' | 'ai'}
 */
export const RECIPE_GENERATION_MODE =
  import.meta.env.VITE_RECIPE_PROVIDER === 'mock' ? 'mock' : 'ai'

export function isAiRecipeMode() {
  return RECIPE_GENERATION_MODE === 'ai'
}

export function isMockRecipeMode() {
  return RECIPE_GENERATION_MODE === 'mock'
}
