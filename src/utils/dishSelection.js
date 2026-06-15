/**
 * Dish-first selection: pick a recognizable real-world dish, then build the recipe.
 */

import { canonicalIngredient } from '../data/ingredientKnowledge'
import { parseUserIngredients } from './ingredientRelevance'
import { validateGeneratedRecipeRealism } from './recipeRealismValidation'
import {
  buildRealisticDessertFromPattern,
  buildRealisticMealFromPattern,
  buildRealisticSoupFromPattern,
} from './recipeDishPatterns'
import { rankDessertPatterns } from './dessertRecipeBuilder'
import { rankMealPatterns } from './mealRecipeBuilder'
import { rankSoupPatterns } from './soupRecipeBuilder'

function canonizeList(ingredients) {
  const canons = new Set()
  for (const item of ingredients) {
    const canon = canonicalIngredient(item)
    if (canon) canons.add(canon)
  }
  return canons
}

function buildFromPattern(recipeType, pattern, ctx) {
  const {
    filteredUserIngredients,
    displayNames,
    language,
    cookingTime,
    servings,
  } = ctx

  if (recipeType === 'dessert') {
    return buildRealisticDessertFromPattern(pattern, {
      filteredUserIngredients,
      displayNames,
      language,
      cookingTime,
      servings,
    })
  }
  if (recipeType === 'soup_stew') {
    return buildRealisticSoupFromPattern(pattern, {
      filteredUserIngredients,
      displayNames,
      language,
      cookingTime,
      servings,
    })
  }
  return buildRealisticMealFromPattern(pattern, {
    filteredUserIngredients,
    displayNames,
    language,
    cookingTime,
    servings,
  })
}

/**
 * Try ranked dish patterns until one passes realism validation.
 */
export function selectAndBuildDishFromPatterns(
  userIngredientsRaw,
  {
    recipeType = 'meal',
    category = 'any',
    selectedCategory = category,
    userIngredientsRaw: userIngredientsInput = '',
    language = 'he',
    displayNames = [],
    cookingTime = 30,
    servings = 4,
    excludeTitles = [],
    excludeTemplateKeys = [],
    excludeCookingMethods = [],
    excludeDessertCategories = [],
  } = {},
) {
  const filteredUserIngredients = Array.isArray(userIngredientsRaw)
    ? userIngredientsRaw
    : parseUserIngredients(userIngredientsRaw)
  if (!filteredUserIngredients.length) return null

  const canons = canonizeList(filteredUserIngredients)
  const ingredientsBlob =
    userIngredientsInput ||
    (Array.isArray(userIngredientsRaw) ? userIngredientsRaw.join(', ') : String(userIngredientsRaw ?? ''))
  const rankOptions = {
    category,
    selectedCategory,
    userIngredientsRaw: ingredientsBlob,
    language,
    excludeTitles,
    excludeTemplateKeys,
    excludeCookingMethods,
    excludeDessertCategories,
  }

  let ranked = []
  if (recipeType === 'dessert') {
    ranked = rankDessertPatterns(canons, rankOptions)
  } else if (recipeType === 'soup_stew') {
    ranked = rankSoupPatterns(canons, rankOptions)
  } else {
    ranked = rankMealPatterns(canons, rankOptions)
  }

  const ctx = {
    filteredUserIngredients,
    displayNames,
    language,
    cookingTime,
    servings,
  }

  for (const { pattern } of ranked) {
    if (!pattern?.userQuantities) continue
    const built = buildFromPattern(recipeType, pattern, ctx)
    const realism = validateGeneratedRecipeRealism(built, filteredUserIngredients, {
      language,
      forPatternSelection: true,
      recipeType,
    })
    if (realism.ok) {
      return { pattern, built, realism }
    }
  }

  return null
}
