import { RECIPE_GENERATION_MODE } from '../config/recipeProvider'
import { generateAIRecipe } from './aiRecipeService'
import { buildMockRecipe } from './mockRecipeProvider'

/**
 * @typedef {'dairy' | 'meat' | 'parve' | 'any'} RecipeCategory
 * @typedef {'spotify' | 'youtube'} MusicPlatform
 *
 * @typedef {Object} GenerateRecipeParams
 * @property {RecipeCategory} category
 * @property {string} ingredients
 * @property {number} cookingTime
 * @property {string} mood
 * @property {boolean} isGlutenFree
 * @property {MusicPlatform} musicPlatform
 * @property {number} [servings=4]
 * @property {'meal' | 'dessert'} [recipeType='meal']
 *
 * @typedef {Object} GenerateRecipeOptions
 * @property {string} [language='he']
 * @property {string} [pantrySuffix]
 * @property {string[]} [excludeTemplateKeys]
 * @property {string[]} [excludeTitles]
 * @property {string[]} [excludeCookingMethods]
 * @property {string[]} [excludeDessertCategories]
 *
 * @typedef {Object} RecipeNutrition
 * @property {number} calories
 * @property {number} protein
 * @property {number} carbs
 * @property {number} fat
 * @property {number} servings
 *
 * @typedef {Object} GeneratedRecipe
 * @property {string} name
 * @property {string} description
 * @property {string[]} ingredients
 * @property {string[]} steps
 * @property {number} matchPercentage
 * @property {number} spiceLevel
 * @property {RecipeNutrition} nutrition
 * @property {number} healthScore
 * @property {string[]} tags
 * @property {object} playlist
 * @property {{ ingredient: string, reason: string }[]} [optionalUpgrades]
 * @property {boolean} [generatedFromPreferences]
 *
 * @typedef {Object} AppRecipeResult
 * @property {object | null} recipe
 * @property {'fallback' | null} fallbackReason
 * @property {boolean} [recipePossible=true]
 * @property {string} [impossibleReason]
 * @property {string[]} [missingIngredients]
 */

/** @deprecated Use RECIPE_GENERATION_MODE from config/recipeProvider.js */
export const RECIPE_PROVIDER = RECIPE_GENERATION_MODE

const DEFAULT_OPTIONS = {
  language: 'he',
  excludeTemplateKeys: [],
  excludeTitles: [],
  excludeCookingMethods: [],
  excludeDessertCategories: [],
}

/**
 * @param {GenerateRecipeParams} params
 */
export function normalizeGenerateParams(params) {
  return {
    category: params.category,
    ingredients: params.ingredients ?? '',
    cookingTime: params.cookingTime ?? 30,
    mood: params.mood ?? 'cozy',
    isGlutenFree: Boolean(params.isGlutenFree),
    musicPlatform: params.musicPlatform ?? 'spotify',
    servings: params.servings ?? 4,
    recipeType: params.recipeType ?? 'meal',
  }
}

/**
 * @param {unknown} value
 * @returns {value is GeneratedRecipe}
 */
export function validateGeneratedRecipe(value) {
  if (!value || typeof value !== 'object') return false
  const r = /** @type {GeneratedRecipe} */ (value)
  return (
    typeof r.name === 'string' &&
    typeof r.description === 'string' &&
    Array.isArray(r.ingredients) &&
    r.ingredients.length > 0 &&
    Array.isArray(r.steps) &&
    r.steps.length > 0 &&
    typeof r.matchPercentage === 'number' &&
    typeof r.spiceLevel === 'number' &&
    r.nutrition &&
    typeof r.nutrition.calories === 'number' &&
    typeof r.healthScore === 'number' &&
    Array.isArray(r.tags) &&
    r.playlist != null
  )
}

/** @param {GenerateRecipeParams} params @param {GenerateRecipeOptions} options */
async function generateWithMockProvider(params, options) {
  return buildMockRecipe(params, options)
}

/** Ensures a valid recipe never returns alongside recipePossible=false. */
function reconcileGenerationResult(result) {
  if (!result || typeof result !== 'object') return result
  if (validateGeneratedRecipe(result.recipe)) {
    return {
      ...result,
      recipe: result.recipe,
      recipePossible: true,
      impossibleReason: undefined,
      missingIngredients: [],
    }
  }
  if (result.recipePossible === false) {
    return {
      ...result,
      recipe: null,
    }
  }
  return result
}

/** @param {GenerateRecipeParams} params @param {GenerateRecipeOptions} options */
async function generateWithAiProvider(params, options) {
  const result = reconcileGenerationResult(await generateAIRecipe({ ...params, ...options }))
  if (result.recipePossible === false) {
    return result
  }
  const meta = buildAiRecipeMeta(params, options)
  if (result.recipe?.templateKey) {
    meta.templateKey = result.recipe.templateKey
  }
  return { recipe: result.recipe, meta, fallbackReason: result.fallbackReason, recipePossible: true }
}

/** @param {GenerateRecipeParams} params @param {GenerateRecipeOptions} options */
function buildAiRecipeMeta(params, options) {
  return {
    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    templateKey: `ai-${Date.now()}`,
    category: params.category,
    mood: params.mood,
    cookingTime: params.cookingTime,
    isGlutenFree: params.isGlutenFree,
    musicPlatform: params.musicPlatform,
    language: options.language ?? 'he',
    style: 'comfort',
    cookTime: params.cookingTime,
  }
}

/**
 * Routes to mock templates or AI/backend service based on RECIPE_GENERATION_MODE.
 * @param {GenerateRecipeParams} params
 * @param {GenerateRecipeOptions} options
 */
async function generateWithActiveProvider(params, options) {
  if (RECIPE_GENERATION_MODE === 'ai') {
    return generateWithAiProvider(params, options)
  }
  return generateWithMockProvider(params, options)
}

/**
 * Generates a recipe (Hebrew by default).
 *
 * @param {GenerateRecipeParams} params
 * @param {GenerateRecipeOptions} [options]
 * @returns {Promise<GeneratedRecipe>}
 */
export async function generateRecipe(params, options = {}) {
  const normalized = normalizeGenerateParams(params)
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }
  const result = await generateWithActiveProvider(normalized, mergedOptions)
  const recipe = result.recipe

  if (!validateGeneratedRecipe(recipe)) {
    throw new Error('Recipe provider returned an invalid recipe payload')
  }

  return recipe
}

/** Maps GeneratedRecipe to the flat model used by UI and localStorage. */
function toAppRecipe(recipe, meta) {
  return {
    id: meta.id,
    templateKey: recipe.templateKey ?? meta.templateKey,
    category: meta.category,
    resolvedCategory: recipe.resolvedCategory ?? recipe.category ?? meta.category,
    mood: meta.mood,
    time: meta.cookingTime,
    glutenFree: meta.isGlutenFree,
    musicPlatform: meta.musicPlatform,
    language: meta.language,
    style: meta.style,
    name: recipe.name,
    description: recipe.description,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    matchPercent: recipe.matchPercentage,
    cookTime: meta.cookTime,
    servings: recipe.nutrition.servings,
    calories: recipe.nutrition.calories,
    protein: recipe.nutrition.protein,
    carbs: recipe.nutrition.carbs,
    fat: recipe.nutrition.fat,
    healthScore: recipe.healthScore,
    spiceLevel: recipe.spiceLevel,
    tags: recipe.tags,
    playlist: recipe.playlist,
    optionalUpgrades: recipe.optionalUpgrades ?? [],
    generatedFromPreferences: Boolean(recipe.generatedFromPreferences),
    categoryNote: recipe.categoryNote ?? null,
    savedAt: null,
  }
}

/**
 * Generates a recipe and returns the UI/storage model.
 * Uses the FastAPI backend by default; falls back to mock if the server fails.
 *
 * @param {GenerateRecipeParams} params
 * @param {GenerateRecipeOptions} [options]
 * @returns {Promise<AppRecipeResult>}
 */
export async function generateAppRecipe(params, options = {}) {
  const normalized = normalizeGenerateParams(params)
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }
  const result = reconcileGenerationResult(await generateWithActiveProvider(normalized, mergedOptions))

  if (result.recipePossible === false || !validateGeneratedRecipe(result.recipe)) {
    return {
      recipe: null,
      recipePossible: false,
      impossibleReason: result.impossibleReason ?? '',
      missingIngredients: result.missingIngredients ?? [],
      fallbackReason: null,
    }
  }

  const recipe = result.recipe
  const meta = result.meta ?? buildAiRecipeMeta(normalized, mergedOptions)
  const fallbackReason = result.fallbackReason ?? null

  if (!validateGeneratedRecipe(recipe)) {
    throw new Error('Recipe provider returned an invalid recipe payload')
  }

  const recipeForUI = toAppRecipe(recipe, meta)
  console.log('RENDERED_RECIPE', recipeForUI)

  return {
    recipe: recipeForUI,
    recipePossible: true,
    fallbackReason,
  }
}
