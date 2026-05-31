import { API_BASE_URL, GENERATE_RECIPE_URL, HEALTH_URL } from '../config/api'
import {
  applyRecipeIngredientParser,
} from '../utils/recipeIngredientParser'
import { enforceRecipeTypeTitle } from '../utils/recipeTypeGuard'
import {
  getEffectiveRecipeType,
  logRecipeValidation,
  validateRecipeCategory,
} from '../utils/recipeCategoryGuard'
import { buildMockRecipe } from './mockRecipeProvider'

const GEMINI_REQUEST_TIMEOUT_MS = 15000

/**
 * @typedef {'fallback'} FallbackReason
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
 * @property {number} [servings=4]
 * @property {'meal' | 'dessert'} [recipeType='meal']
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
    servings: userInput.servings ?? 4,
    recipeType: userInput.recipeType ?? 'meal',
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
    servings: userInput.servings ?? 4,
    recipeType: userInput.recipeType ?? 'meal',
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

  console.log('[aiRecipeService] recipeType received:', payload.recipeType)
  console.log('[aiRecipeService] Calling generate-recipe:', url)
  console.log('[aiRecipeService] API_BASE_URL:', API_BASE_URL)
  console.log('[aiRecipeService] Payload:', payload)
  console.log('[aiRecipeService] JSON body:', body)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS)

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
      signal: controller.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      console.warn('[aiRecipeService] Backend request timed out after 15s — using local fallback')
      throw new Error('Recipe API timed out after 15 seconds', { cause: error })
    }
    logFetchError('Generate-recipe fetch failed', error)
    throw error
  } finally {
    clearTimeout(timeoutId)
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
 * @param {ReturnType<typeof normalizeUserInput>} userInput
 * @param {import('./recipeService').GeneratedRecipe} recipe
 * @param {{ fallbackUsed?: boolean }} [meta]
 */
function finalizeRecipeForUser(userInput, recipe, meta = {}) {
  const parserOptions = {
    cookingTime: userInput.cookingTime,
    servings: userInput.servings,
    recipeType: userInput.recipeType,
    category: userInput.category,
  }

  const { recipe: parsed } = applyRecipeIngredientParser(
    recipe,
    userInput.ingredients,
    userInput.language,
    parserOptions,
  )

  const typed = enforceRecipeTypeTitle(parsed, userInput.recipeType, userInput.category)
  const passed = validateRecipeCategory(userInput.recipeType, userInput.category, typed)

  logRecipeValidation({
    selectedRecipeType: userInput.recipeType,
    selectedCategory: userInput.category,
    generatedTitle: typed.name,
    validationPassed: passed,
    fallbackUsed: Boolean(meta.fallbackUsed),
  })

  return { recipe: typed, passed }
}

function buildCategoryFallbackRecipe(userInput) {
  const effectiveRecipeType = getEffectiveRecipeType(userInput.recipeType, userInput.category)
  const { recipe } = buildMockRecipe(
    {
      category: userInput.category,
      ingredients: userInput.ingredients,
      cookingTime: userInput.cookingTime,
      mood: userInput.mood,
      isGlutenFree: userInput.isGlutenFree,
      musicPlatform: userInput.musicPlatform,
      servings: userInput.servings,
      recipeType: effectiveRecipeType,
    },
    {
      language: userInput.language,
      pantrySuffix: userInput.pantrySuffix,
      excludeTemplateKeys: userInput.excludeTemplateKeys,
    },
  )
  return finalizeRecipeForUser(userInput, recipe, { fallbackUsed: true }).recipe
}

/**
 * Parse Hebrew ingredients, validate quality, and fall back if needed.
 *
 * @param {ReturnType<typeof normalizeUserInput>} userInput
 * @param {import('./recipeService').GeneratedRecipe} recipe
 */
function processGeneratedRecipe(userInput, recipe) {
  const { recipe: result, passed } = finalizeRecipeForUser(userInput, recipe)

  if (passed) {
    return result
  }

  console.warn('[aiRecipeService] Category/type validation failed — using category fallback')
  return buildCategoryFallbackRecipe(userInput)
}

/**
 *
 * @param {ReturnType<typeof normalizeUserInput>} userInput
 */
function fetchMockFallbackRecipe(userInput) {
  return buildCategoryFallbackRecipe(userInput)
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

  console.log('[aiRecipeService] recipeType received:', normalized.recipeType)
  console.log('[aiRecipeService] category received:', normalized.category)

  const isHealthy = await checkBackendHealth()
  if (!isHealthy) {
    console.warn('[aiRecipeService] Backend unreachable — using local mock fallback')
    return {
      recipe: fetchMockFallbackRecipe(normalized),
      fallbackReason: 'fallback',
    }
  }

  try {
    const { recipe: backendRecipe, source, geminiError } = await fetchRecipeFromBackend(payload)
    const recipe = processGeneratedRecipe(normalized, backendRecipe)

    if (source === 'gemini') {
      console.log('[aiRecipeService] Recipe generated successfully via Gemini')
      return { recipe, fallbackReason: null }
    }

    console.warn('[aiRecipeService] Backend connected but Gemini failed:', geminiError)
    return {
      recipe,
      fallbackReason: 'fallback',
    }
  } catch (error) {
    logFetchError('Generate-recipe failed after health check', error)
    console.warn('[aiRecipeService] Using local mock fallback after generate failure')
    return {
      recipe: fetchMockFallbackRecipe(normalized),
      fallbackReason: 'fallback',
    }
  }
}
