import { API_BASE_URL, GENERATE_RECIPE_URL } from '../config/api'
import {
  applyRecipeIngredientParser,
  logRecipeValidationDetails,
  validateRecipeQuality,
} from '../utils/recipeIngredientParser'
import { logRecipeQualitySnapshot } from '../utils/recipeQualityLog'
import { parseUserIngredients, computeUserIngredientMatchPercent } from '../utils/ingredientRelevance'
import { sanitizeIngredientList, lightSanitizeRecipeSteps } from '../utils/ingredientFormatting'
import { enforceRecipeTypeTitle } from '../utils/recipeTypeGuard'
import {
  getEffectiveRecipeType,
  logRecipeValidation,
  inferRecipeCategory,
  resolveKosherCategory,
  validateRecipeCategory,
} from '../utils/recipeCategoryGuard'
import { detectRecipeLanguage, validateRecipeLanguage } from '../utils/recipeLanguage'
import { buildMockRecipe } from './mockRecipeProvider'
import {
  assessIngredientFeasibility,
  buildValidationFailureMessage,
  validateRecipeBeforeReturn,
} from '../utils/recipePreReturnValidation'
import { assessCategoryFit } from '../utils/recipeCategoryFit'
import { validateRecipeDiversity } from '../utils/recipeDiversity'
import { createRecipeGenerationTimer } from '../utils/recipeGenerationTiming'

const RECIPE_GENERATION_TIMEOUT_MS = 15000

/** When true, failed validation still returns the parsed AI recipe (no mock swap). */
const DISABLE_VALIDATION_FALLBACK = false

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
 * @property {string[]} [excludeTitles]
 * @property {string[]} [excludeCookingMethods]
 * @property {string[]} [excludeDessertCategories]
 * @property {number} [servings=4]
 * @property {'meal' | 'dessert'} [recipeType='meal']
 */

/**
 * @typedef {Object} AIRecipeResult
 * @property {import('./recipeService').GeneratedRecipe | null} recipe
 * @property {FallbackReason | null} fallbackReason
 * @property {boolean} [recipePossible=true]
 * @property {string} [impossibleReason]
 * @property {string[]} [missingIngredients]
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
    language: userInput.language ?? 'he',
    excludeTitles: userInput.excludeTitles ?? [],
    excludeCookingMethods: userInput.excludeCookingMethods ?? [],
    excludeDessertCategories: userInput.excludeDessertCategories ?? [],
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
    excludeTitles: userInput.excludeTitles ?? [],
    excludeCookingMethods: userInput.excludeCookingMethods ?? [],
    excludeDessertCategories: userInput.excludeDessertCategories ?? [],
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

function isPreferenceBasedGeneration(userInput) {
  return parseUserIngredients(userInput?.ingredients ?? '').length === 0
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

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} timed out after ${ms / 1000}s`))
      }, ms)
    }),
  ])
}

/**
 * Step 2 — call POST /generate-recipe.
 *
 * @param {ReturnType<typeof buildApiRequestPayload>} payload
 * @param {ReturnType<typeof createRecipeGenerationTimer> | null} [timer]
 * @returns {Promise<{ recipe: import('./recipeService').GeneratedRecipe, source: string, geminiError: string | null }>}
 */
async function fetchRecipeFromBackend(payload, timer = null) {
  const url = GENERATE_RECIPE_URL
  const body = JSON.stringify(payload)

  timer?.mark('fetchRecipeFromBackend:prepare')

  console.log('[aiRecipeService] recipeType received:', payload.recipeType)
  console.log('[aiRecipeService] selectedLanguage:', payload.language)
  console.log('[aiRecipeService] Calling generate-recipe:', url)
  console.log('[aiRecipeService] API_BASE_URL:', API_BASE_URL)
  console.log('[aiRecipeService] Payload:', payload)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), RECIPE_GENERATION_TIMEOUT_MS)
  const fetchStartedAt = performance.now()

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
    timer?.mark(
      'fetchRecipeFromBackend:http',
      response.ok ? 'Success' : 'Failed',
      `${response.status} in ${Math.round(performance.now() - fetchStartedAt)}ms`,
    )
  } catch (error) {
    const elapsed = Math.round(performance.now() - fetchStartedAt)
    if (error?.name === 'AbortError') {
      timer?.mark('fetchRecipeFromBackend:http', 'Failed', `aborted after ${elapsed}ms`)
      console.warn('[aiRecipeService] Backend request timed out after 15s — using local fallback')
      throw new Error('Recipe API timed out after 15 seconds', { cause: error })
    }
    timer?.fail('fetchRecipeFromBackend:http', error, `${elapsed}ms`)
    logFetchError('Generate-recipe fetch failed', error)
    throw error
  } finally {
    clearTimeout(timeoutId)
  }

  const responseText = await response.text()
  timer?.mark('fetchRecipeFromBackend:readBody', 'Success', `${responseText.length} chars`)
  console.log('[aiRecipeService] Generate response status:', response.status, response.statusText)

  if (!response.ok) {
    timer?.mark('fetchRecipeFromBackend:response', 'Failed', `HTTP ${response.status}`)
    throw new Error(`Recipe API failed (${response.status}): ${responseText}`)
  }

  let data
  try {
    data = JSON.parse(responseText)
    timer?.mark('fetchRecipeFromBackend:parseJson', 'Success', `source=${data.source ?? 'unknown'}`)
  } catch (error) {
    timer?.fail('fetchRecipeFromBackend:parseJson', error)
    logFetchError('Generate-recipe JSON parse failed', error)
    throw new Error('Backend returned invalid JSON', { cause: error })
  }

  const recipe = data.recipe ?? data

  console.log('RAW_GEMINI', recipe)
  console.log(
    '[aiRecipeService] Backend source:',
    data.source ?? 'unknown',
    'fallbackUsed:',
    data.fallbackUsed ?? false,
    'geminiError:',
    data.geminiError ?? null,
  )

  if (data.recipePossible === false) {
    timer?.mark('fetchRecipeFromBackend:recipePossible', 'Failed', data.impossibleReason ?? '')
    return {
      recipePossible: false,
      impossibleReason: data.impossibleReason ?? '',
      missingIngredients: Array.isArray(data.missingIngredients) ? data.missingIngredients : [],
      recipe: null,
      source: data.source ?? 'none',
      geminiError: data.geminiError ?? null,
    }
  }

  if (!isValidGeneratedRecipe(recipe)) {
    timer?.mark('fetchRecipeFromBackend:validatePayload', 'Failed', 'invalid recipe shape')
    console.error('[aiRecipeService] Invalid recipe payload:', recipe)
    throw new Error('Backend returned an invalid recipe payload')
  }

  timer?.mark(
    'fetchRecipeFromBackend:complete',
    'Success',
    `source=${data.source ?? 'unknown'} gemini=${data.source === 'gemini'}`,
  )

  const resolvedCategory = data.resolvedCategory ?? null
  const recipeWithMeta =
    resolvedCategory && recipe ? { ...recipe, resolvedCategory } : recipe

  return {
    recipe: recipeWithMeta,
    recipePossible: true,
    source: data.source ?? 'unknown',
    geminiError: data.geminiError ?? null,
    resolvedCategory,
  }
}

/**
 * @param {ReturnType<typeof normalizeUserInput>} userInput
 * @param {import('./recipeService').GeneratedRecipe} recipe
 * @param {{ fallbackUsed?: boolean, skipReparse?: boolean, recipeSource?: string }} [meta]
 */
function finalizeRecipeForUser(userInput, recipe, meta = {}) {
  const parserOptions = {
    cookingTime: userInput.cookingTime,
    servings: userInput.servings,
    recipeType: userInput.recipeType,
    category: userInput.category,
    isGlutenFree: userInput.isGlutenFree,
    source: meta.recipeSource ?? 'unknown',
  }

  let parsed
  let validation

  if (meta.skipReparse) {
    console.log('[aiRecipeService] Skipping frontend re-parse (recipe already processed)', {
      recipeSource: meta.recipeSource,
    })
    const userIngredients = parseUserIngredients(userInput.ingredients)
    const cleanedIngredients = sanitizeIngredientList(recipe.ingredients ?? [])
    const cleanedSteps = lightSanitizeRecipeSteps(recipe.steps ?? [])
    const cleanedRecipe = {
      ...recipe,
      ingredients: cleanedIngredients,
      steps: cleanedSteps,
    }
    parsed = {
      ...cleanedRecipe,
      matchPercentage: isPreferenceBasedGeneration(userInput)
        ? cleanedRecipe.matchPercentage
        : computeUserIngredientMatchPercent(userIngredients, cleanedRecipe),
    }
    validation = validateRecipeQuality(
      userIngredients,
      parsed,
      userInput.language,
      parserOptions,
    )
  } else {
    ;({ recipe: parsed, validation } = applyRecipeIngredientParser(
      recipe,
      userInput.ingredients,
      userInput.language,
      {
        ...parserOptions,
        preserveOriginalSteps: meta.recipeSource === 'gemini',
      },
    ))
  }

  console.log('PARSED_RECIPE', parsed)

  const kosherCategory = resolveKosherCategory(userInput.category, parsed)
  const typed = enforceRecipeTypeTitle(parsed, userInput.recipeType, kosherCategory, userInput.language)
  const resolvedCategory = inferRecipeCategory(typed)
  const categoryPassed = validateRecipeCategory(userInput.recipeType, userInput.category, typed)
  const languagePassed = validateRecipeLanguage(userInput.language, typed)
  const recipeLanguageUsed = detectRecipeLanguage(typed)
  const ingredientValidationPassed = Boolean(validation?.ok)
  const passed = categoryPassed && languagePassed && ingredientValidationPassed

  logRecipeQualitySnapshot({
    userIngredientsRaw: userInput.ingredients,
    recipe: typed,
    validation,
    tags: typed.tags,
    source: meta.recipeSource ?? 'ai',
  })

  logRecipeValidationDetails(validation, {
    categoryMismatch: categoryPassed
      ? null
      : {
          selectedRecipeType: userInput.recipeType,
          selectedCategory: userInput.category,
          generatedTitle: typed.name,
        },
    languageMismatch: languagePassed
      ? null
      : { expected: userInput.language, detected: recipeLanguageUsed },
    generatedTitle: typed.name,
  })

  if (!languagePassed) {
    console.warn(
      '[aiRecipeService] Recipe language mismatch — expected:',
      userInput.language,
      'detected:',
      recipeLanguageUsed,
    )
  }

  if (!categoryPassed) {
    console.warn('[aiRecipeService] Category/type mismatch:', {
      selectedRecipeType: userInput.recipeType,
      selectedCategory: userInput.category,
      generatedTitle: typed.name,
    })
  }

  if (!validation.titleValidation?.ok) {
    console.warn('[aiRecipeService] Title mismatch:', validation.titleValidation)
  }

  logRecipeValidation({
    selectedRecipeType: userInput.recipeType,
    selectedCategory: userInput.category,
    generatedTitle: typed.name,
    validationPassed: passed,
    fallbackUsed: Boolean(meta.fallbackUsed),
    recipeSource: meta.recipeSource ?? 'unknown',
    skipReparse: Boolean(meta.skipReparse),
    selectedLanguage: userInput.language,
    recipeLanguageUsed,
  })

  const preferenceBased = isPreferenceBasedGeneration(userInput)
  const categoryFit = assessCategoryFit(userInput.ingredients, {
    category: userInput.category,
    isGlutenFree: userInput.isGlutenFree,
    language: userInput.language,
  })
  const categoryNote = (categoryFit.categoryNote || typed.categoryNote || '').trim()

  return {
    recipe: {
      ...typed,
      category: userInput.category,
      resolvedCategory,
      generatedFromPreferences: preferenceBased,
      categoryNote: categoryNote || undefined,
      optionalUpgrades: preferenceBased ? [] : (typed.optionalUpgrades ?? []),
    },
    passed,
    validation,
    categoryPassed,
    languagePassed,
    ingredientValidationPassed,
  }
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
      excludeTitles: userInput.excludeTitles,
      excludeCookingMethods: userInput.excludeCookingMethods,
      excludeDessertCategories: userInput.excludeDessertCategories,
    },
  )
  console.warn('[aiRecipeService] Using frontend mock fallback recipe')
  return finalizeRecipeForUser(userInput, recipe, {
    fallbackUsed: true,
    skipReparse: true,
    recipeSource: 'frontend-mock',
  }).recipe
}

/**
 * Parse Hebrew ingredients, validate quality, and fall back if needed.
 *
 * @param {ReturnType<typeof normalizeUserInput>} userInput
 * @param {import('./recipeService').GeneratedRecipe} recipe
 */
function processGeneratedRecipe(userInput, recipe, { source = 'unknown', timer = null } = {}) {
  console.log('[aiRecipeService] processGeneratedRecipe input', { source, recipe })

  timer?.mark('processGeneratedRecipe:start', 'Success', `source=${source}`)
  const { recipe: result, passed, validation, categoryPassed, languagePassed } =
    finalizeRecipeForUser(userInput, recipe, {
      fallbackUsed: source !== 'gemini',
      skipReparse: source === 'gemini' || source === 'mock',
      recipeSource: source,
    })
  timer?.mark(
    'processGeneratedRecipe:finalize',
    passed ? 'Success' : 'Failed',
    `category=${categoryPassed} language=${languagePassed} ingredients=${validation?.ok !== false}`,
  )

  if (passed) {
    return { recipe: result, ok: true }
  }

  console.warn('[aiRecipeService] Validation failed after processing', {
    source,
    ingredientValidation: validation?.ok,
    categoryPassed,
    languagePassed,
    failedChecks: Object.entries(validation?.checks ?? {})
      .filter(([, ok]) => !ok)
      .map(([name]) => name),
  })

  if (DISABLE_VALIDATION_FALLBACK) {
    return { recipe: result, ok: true }
  }

  return { recipe: null, ok: false, validation }
}

/**
 *
 * @param {ReturnType<typeof normalizeUserInput>} userInput
 */
function fetchMockFallbackRecipe(userInput, timer = null) {
  timer?.mark('fetchMockFallbackRecipe:start')
  const recipe = buildCategoryFallbackRecipe(userInput)
  timer?.mark('fetchMockFallbackRecipe:complete', 'Success')
  return recipe
}

async function generateAIRecipeCore(userInput) {
  const timer = createRecipeGenerationTimer('generateAIRecipeCore')
  assertUserInput(userInput)

  const normalized = normalizeUserInput(userInput)
  timer.mark('normalizeInput')
  const payload = buildApiRequestPayload(normalized)
  timer.mark('buildApiPayload')

  console.log('[aiRecipeService] selectedLanguage:', normalized.language)
  console.log('[aiRecipeService] category received:', normalized.category)

  const feasibility = assessIngredientFeasibility(normalized.ingredients, {
    recipeType: normalized.recipeType,
    category: normalized.category,
    isGlutenFree: normalized.isGlutenFree,
    language: normalized.language,
  })
  timer.mark('assessIngredientFeasibility', feasibility.recipePossible ? 'Success' : 'Failed')
  if (!feasibility.recipePossible) {
    timer.printTable()
    const { reason, missingIngredients } = buildValidationFailureMessage({}, feasibility, {
      language: normalized.language,
    })
    return {
      recipe: null,
      recipePossible: false,
      impossibleReason: reason,
      missingIngredients,
      fallbackReason: null,
    }
  }

  try {
    const backendResult = await fetchRecipeFromBackend(payload, timer)
    if (backendResult.recipePossible === false) {
      timer.printTable()
      return {
        recipe: null,
        recipePossible: false,
        impossibleReason: backendResult.impossibleReason,
        missingIngredients: backendResult.missingIngredients ?? [],
        fallbackReason: null,
      }
    }

    const { recipe: backendRecipe, source, geminiError } = backendResult
    timer.mark('backendResult', 'Success', `source=${source} geminiError=${geminiError ?? 'none'}`)

    let processed = processGeneratedRecipe(normalized, backendRecipe, { source, timer })
    if (!processed.ok || !processed.recipe) {
      console.warn('[aiRecipeService] Validation failed — retrying generation once', {
        source,
        failedChecks: Object.entries(processed.validation?.checks ?? {})
          .filter(([, ok]) => !ok)
          .map(([name]) => name),
      })
      timer.mark('processGeneratedRecipe:retry', 'Failed')
      const retryResult = await fetchRecipeFromBackend(payload, timer)
      if (retryResult.recipePossible !== false && retryResult.recipe) {
        processed = processGeneratedRecipe(normalized, retryResult.recipe, {
          source: retryResult.source,
          timer,
        })
      }
    }

    if (!processed.ok || !processed.recipe) {
      timer.mark('processGeneratedRecipe:reject', 'Failed')
      timer.printTable()
      const { reason, missingIngredients } = buildValidationFailureMessage(
        processed.validation?.preReturn ?? processed.validation ?? {},
        null,
        { language: normalized.language },
      )
      return {
        recipe: null,
        recipePossible: false,
        impossibleReason:
          reason ||
          (normalized.language === 'he'
            ? 'לא הצלחנו ליצור מתכון אמין מהמרכיבים — נסו שוב.'
            : 'We could not create a trustworthy recipe from your ingredients — please try again.'),
        missingIngredients,
        fallbackReason: null,
      }
    }
    const recipe = processed.recipe
    const preReturn = validateRecipeBeforeReturn(recipe, normalized.ingredients, {
      language: normalized.language,
    })
    timer.mark('validateRecipeBeforeReturn', preReturn.ok ? 'Success' : 'Failed', preReturn.failures?.join(', '))
    const diversity = validateRecipeDiversity(recipe, {
      recipeType: normalized.recipeType,
      excludeTitles: normalized.excludeTitles,
      excludeCookingMethods: normalized.excludeCookingMethods,
      excludeDessertCategories: normalized.excludeDessertCategories,
    })
    timer.mark('validateRecipeDiversity', diversity.ok ? 'Success' : 'Failed', diversity.failures?.join(', '))
    if (!preReturn.ok) {
      console.warn('[aiRecipeService] Recipe failed pre-return validation:', preReturn.failures)
      timer.mark('preReturnValidation:reject', 'Failed')
      timer.printTable()
      const { reason, missingIngredients } = buildValidationFailureMessage(preReturn, null, {
        language: normalized.language,
      })
      return {
        recipe: null,
        recipePossible: false,
        impossibleReason: reason,
        missingIngredients,
        fallbackReason: null,
      }
    }
    if (!diversity.ok) {
      const hasRegenerationConstraints =
        normalized.excludeTitles.length > 0 ||
        normalized.excludeCookingMethods.length > 0 ||
        normalized.excludeDessertCategories.length > 0
      if (hasRegenerationConstraints) {
        console.warn(
          '[aiRecipeService] Recipe failed diversity validation — using diverse mock fallback:',
          diversity.failures,
        )
        timer.mark('diversityFallback:mock', 'Success')
        const fallbackRecipe = fetchMockFallbackRecipe(normalized, timer)
        timer.printTable()
        return {
          recipe: fallbackRecipe,
          recipePossible: true,
          fallbackReason: 'fallback',
        }
      }
      timer.printTable()
      const reason =
        normalized.language === 'he'
          ? 'לא הצלחנו ליצור מתכון שונה מהמתכון הקודם. נסו שוב.'
          : 'We could not generate a recipe different from the previous one. Please try again.'
      console.warn('[aiRecipeService] Recipe failed diversity validation:', diversity.failures)
      return {
        recipe: null,
        recipePossible: false,
        impossibleReason: reason,
        missingIngredients: [],
        fallbackReason: null,
      }
    }

    if (source === 'gemini') {
      console.log('[aiRecipeService] Recipe generated successfully via Gemini')
      console.log('[aiRecipeService] recipeLanguageUsed:', detectRecipeLanguage(recipe))
      timer.mark('complete', 'Success', 'gemini path')
      timer.printTable()
      return { recipe, recipePossible: true, fallbackReason: null }
    }

    console.warn('[aiRecipeService] Backend returned mock fallback recipe (not Gemini):', {
      source,
      fallbackUsed: true,
      geminiError,
    })
    timer.mark('complete', 'Success', `backend mock fallback source=${source}`)
    timer.printTable()
    return {
      recipe,
      recipePossible: true,
      fallbackReason: 'fallback',
    }
  } catch (error) {
    timer.fail('generateAIRecipeCore', error)
    logFetchError('Generate-recipe failed', error)
    console.warn('[aiRecipeService] Using local mock fallback after generate failure')
    const fallbackRecipe = fetchMockFallbackRecipe(normalized, timer)
    timer.mark('complete', 'Success', 'frontend mock after error')
    timer.printTable()
    return {
      recipe: fallbackRecipe,
      recipePossible: true,
      fallbackReason: 'fallback',
    }
  }
}

/**
 * Generates a recipe via FastAPI backend, with local mock fallback.
 * Hard limit: 15 seconds total including parsing and fallback.
 *
 * @param {AIRecipeUserInput} userInput
 * @returns {Promise<AIRecipeResult>}
 */
export async function generateAIRecipe(userInput) {
  const outerTimer = createRecipeGenerationTimer('generateAIRecipe')
  try {
    const result = await withTimeout(
      generateAIRecipeCore(userInput),
      RECIPE_GENERATION_TIMEOUT_MS,
      'Recipe generation',
    )
    outerTimer.mark('generateAIRecipeCore', 'Success')
    outerTimer.printTable()
    return result
  } catch (error) {
    outerTimer.fail('generateAIRecipeCore (15s outer timeout)', error)
    logFetchError('Recipe generation exceeded 15s limit', error)
    const normalized = normalizeUserInput(userInput)
    const recipe = fetchMockFallbackRecipe(normalized, outerTimer)
    outerTimer.mark('timeoutRecovery:mockFallback', 'Success')
    outerTimer.printTable()
    return {
      recipe,
      fallbackReason: 'fallback',
    }
  }
}
