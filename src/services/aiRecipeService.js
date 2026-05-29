import { API_BASE_URL, GENERATE_RECIPE_URL, HEALTH_URL } from '../config/api'
import { buildMockRecipe } from './mockRecipeProvider'

/**
 * @typedef {'unreachable' | 'gemini'} FallbackReason
 *
 * @typedef {Object} AIRecipeUserInput
 * @property {string} category
 * @property {string} ingredients
 * @property {number} cookingTime
 * @property {string} mood
 * @property {boolean} isGlutenFree
 * @property {string} musicPlatform
 * @property {string} [language='he']
 * @property {string} [pantrySuffix]
 * @property {string[]} [excludeTemplateKeys]
 */

/**
 * @typedef {Object} AIRecipeResult
 * @property {import('./recipeService').GeneratedRecipe} recipe
 * @property {FallbackReason | null} fallbackReason
 */

const FETCH_OPTIONS = {
  mode: 'cors',
  credentials: 'omit',
  headers: {
    Accept: 'application/json',
  },
}

/**
 * Payload sent to POST /generate-recipe on the FastAPI backend.
 * @param {AIRecipeUserInput} userInput
 */
function buildApiRequestPayload(userInput) {
  return {
    category: userInput.category,
    ingredients: userInput.ingredients ?? '',
    cookingTime: userInput.cookingTime ?? 30,
    mood: userInput.mood ?? 'cozy',
    isGlutenFree: Boolean(userInput.isGlutenFree),
    musicPlatform: userInput.musicPlatform ?? 'spotify',
  }
}

function normalizeUserInput(userInput) {
  return {
    category: userInput.category,
    ingredients: userInput.ingredients ?? '',
    cookingTime: userInput.cookingTime ?? 30,
    mood: userInput.mood ?? 'cozy',
    isGlutenFree: Boolean(userInput.isGlutenFree),
    musicPlatform: userInput.musicPlatform ?? 'spotify',
    language: userInput.language ?? 'he',
    pantrySuffix: userInput.pantrySuffix,
    excludeTemplateKeys: userInput.excludeTemplateKeys ?? [],
  }
}

function assertUserInput(userInput) {
  if (!userInput?.category) {
    throw new Error('AI recipe request requires a category')
  }
  if (!userInput?.mood) {
    throw new Error('AI recipe request requires a mood')
  }
}

/**
 * @param {unknown} value
 * @returns {value is import('./recipeService').GeneratedRecipe}
 */
function isValidGeneratedRecipe(value) {
  if (!value || typeof value !== 'object') return false
  const recipe = /** @type {import('./recipeService').GeneratedRecipe} */ (value)
  return (
    typeof recipe.name === 'string' &&
    typeof recipe.description === 'string' &&
    Array.isArray(recipe.ingredients) &&
    recipe.ingredients.length > 0 &&
    Array.isArray(recipe.steps) &&
    recipe.steps.length > 0 &&
    typeof recipe.matchPercentage === 'number' &&
    typeof recipe.spiceLevel === 'number' &&
    recipe.nutrition &&
    typeof recipe.nutrition.calories === 'number' &&
    typeof recipe.healthScore === 'number' &&
    Array.isArray(recipe.tags) &&
    recipe.playlist != null
  )
}

function logFetchError(label, error) {
  console.error(`[aiRecipeService] ${label}`)
  console.error('[aiRecipeService] Error name:', error?.name)
  console.error('[aiRecipeService] Error message:', error?.message)
  console.error('[aiRecipeService] Full error:', error)
  if (error?.cause) {
    console.error('[aiRecipeService] Error cause:', error.cause)
  }
}

/**
 * Step 1 — verify the FastAPI backend is reachable.
 * @returns {Promise<boolean>}
 */
async function checkBackendHealth() {
  const url = HEALTH_URL

  console.log('[aiRecipeService] Calling health:', url)
  console.log('[aiRecipeService] API_BASE_URL:', API_BASE_URL)

  try {
    const response = await fetch(url, {
      ...FETCH_OPTIONS,
      method: 'GET',
    })

    const responseText = await response.text()
    console.log('[aiRecipeService] Health response status:', response.status, response.statusText)
    console.log('[aiRecipeService] Health response body:', responseText)

    if (!response.ok) {
      throw new Error(`Health check failed (${response.status}): ${responseText}`)
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch (error) {
      throw new Error('Health endpoint returned invalid JSON', { cause: error })
    }

    if (data?.status !== 'ok') {
      throw new Error(`Health endpoint returned unexpected status: ${JSON.stringify(data)}`)
    }

    if (data?.service !== 'food-for-any-mood-api') {
      throw new Error(
        `Wrong server on ${url}. Expected food-for-any-mood-api, got: ${JSON.stringify(data)}. ` +
          `Check VITE_API_BASE_URL in src/config/api.js (currently ${API_BASE_URL}).`,
      )
    }

    return true
  } catch (error) {
    logFetchError('Health check failed', error)
    return false
  }
}

/**
 * Step 2 — call POST /generate-recipe after health succeeds.
 *
 * @param {ReturnType<typeof buildApiRequestPayload>} payload
 * @returns {Promise<{ recipe: import('./recipeService').GeneratedRecipe, source: string, geminiError: string | null }>}
 */
async function fetchRecipeFromBackend(payload) {
  const url = GENERATE_RECIPE_URL
  const body = JSON.stringify(payload)

  console.log('[aiRecipeService] Calling generate-recipe:', url)
  console.log('[aiRecipeService] API_BASE_URL:', API_BASE_URL)
  console.log('[aiRecipeService] Payload:', payload)
  console.log('[aiRecipeService] JSON body:', body)

  let response

  try {
    response = await fetch(url, {
      ...FETCH_OPTIONS,
      method: 'POST',
      headers: {
        ...FETCH_OPTIONS.headers,
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (error) {
    logFetchError('Generate-recipe fetch failed', error)
    throw error
  }

  const responseText = await response.text()
  console.log('[aiRecipeService] Generate response status:', response.status, response.statusText)
  console.log('[aiRecipeService] Generate response body:', responseText)

  if (!response.ok) {
    throw new Error(`Recipe API failed (${response.status}): ${responseText}`)
  }

  let data
  try {
    data = JSON.parse(responseText)
  } catch (error) {
    logFetchError('Generate-recipe JSON parse failed', error)
    throw new Error('Backend returned invalid JSON', { cause: error })
  }

  const recipe = data.recipe ?? data

  if (!isValidGeneratedRecipe(recipe)) {
    console.error('[aiRecipeService] Invalid recipe payload:', recipe)
    throw new Error('Backend returned an invalid recipe payload')
  }

  return {
    recipe,
    source: data.source ?? 'unknown',
    geminiError: data.geminiError ?? null,
  }
}

/**
 * Local Hebrew mock used when the backend or Gemini is unavailable.
 *
 * @param {ReturnType<typeof normalizeUserInput>} userInput
 */
function fetchMockFallbackRecipe(userInput) {
  const { recipe } = buildMockRecipe(
    {
      category: userInput.category,
      ingredients: userInput.ingredients,
      cookingTime: userInput.cookingTime,
      mood: userInput.mood,
      isGlutenFree: userInput.isGlutenFree,
      musicPlatform: userInput.musicPlatform,
    },
    {
      language: userInput.language,
      pantrySuffix: userInput.pantrySuffix,
      excludeTemplateKeys: userInput.excludeTemplateKeys,
    },
  )

  return recipe
}

/**
 * Generates a recipe via health check + FastAPI backend, with local mock fallback.
 *
 * @param {AIRecipeUserInput} userInput
 * @returns {Promise<AIRecipeResult>}
 */
export async function generateAIRecipe(userInput) {
  assertUserInput(userInput)

  const normalized = normalizeUserInput(userInput)
  const payload = buildApiRequestPayload(normalized)

  const isHealthy = await checkBackendHealth()
  if (!isHealthy) {
    console.warn('[aiRecipeService] Backend unreachable — using local mock fallback')
    return {
      recipe: fetchMockFallbackRecipe(normalized),
      fallbackReason: 'unreachable',
    }
  }

  try {
    const { recipe, source, geminiError } = await fetchRecipeFromBackend(payload)

    if (source === 'gemini') {
      console.log('[aiRecipeService] Recipe generated successfully via Gemini')
      return { recipe, fallbackReason: null }
    }

    console.warn('[aiRecipeService] Backend connected but Gemini failed:', geminiError)
    return {
      recipe,
      fallbackReason: 'gemini',
    }
  } catch (error) {
    logFetchError('Generate-recipe failed after health check', error)
    console.warn('[aiRecipeService] Using local mock fallback after generate failure')
    return {
      recipe: fetchMockFallbackRecipe(normalized),
      fallbackReason: 'unreachable',
    }
  }
}
