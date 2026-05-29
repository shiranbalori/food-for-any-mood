/**
 * Frontend API configuration (public — no secrets here).
 *
 * Local development (.env):
 *   VITE_API_BASE_URL=http://127.0.0.1:8010
 *
 * Production (Vercel environment variables):
 *   VITE_API_BASE_URL=https://your-service.onrender.com
 *
 * GEMINI_API_KEY must NEVER be added to the frontend or any VITE_* variable.
 */

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8010'

/** Render / local backend base URL — no trailing slash. */
export const API_BASE_URL = rawBaseUrl.replace(/\/$/, '')

export const HEALTH_URL = `${API_BASE_URL}/health`
export const GENERATE_RECIPE_URL = `${API_BASE_URL}/generate-recipe`
export const ANALYZE_INGREDIENTS_IMAGE_URL = `${API_BASE_URL}/analyze-ingredients-image`
