/**
 * Frontend API configuration (public — no secrets here).
 *
 * Local development (.env):
 *   VITE_API_BASE_URL=http://127.0.0.1:8010
 *
 * Backend must listen on the same port (see backend/run.ps1 — default 8010).
 * Do not use --port 8000 unless you also set VITE_API_BASE_URL to match.
 *
 * Production (Vercel environment variables):
 *   VITE_API_BASE_URL=https://your-service.onrender.com
 *
 * GEMINI_API_KEY must NEVER be added to the frontend or any VITE_* variable.
 */

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8010'

/** Render / local backend base URL — no trailing slash. */
export const API_BASE_URL = rawBaseUrl.replace(/\/$/, '')

console.log('[config/api] API_BASE_URL:', API_BASE_URL)

export const HEALTH_URL = `${API_BASE_URL}/health`
export const GENERATE_RECIPE_URL = `${API_BASE_URL}/generate-recipe`
export const ANALYZE_INGREDIENTS_IMAGE_URL = `${API_BASE_URL}/analyze-ingredients-image`
export const MORE_RECIPE_IDEAS_URL = `${API_BASE_URL}/more-recipe-ideas`
export const NUTRITION_ANALYSIS_URL = `${API_BASE_URL}/nutrition-analysis`
export const GENERATE_THEMED_MEAL_URL = `${API_BASE_URL}/generate-themed-meal`
export const UPGRADE_THEMED_MEAL_URL = `${API_BASE_URL}/upgrade-themed-meal`
export const UPGRADE_RECIPE_URL = `${API_BASE_URL}/upgrade-recipe`
