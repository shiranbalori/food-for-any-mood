/**
 * Dish-specific cooking knowledge for named-dish generation.
 * Ensures realistic base ingredients and blocks inappropriate pantry additions.
 */

import { canonicalIngredient } from '../data/ingredientKnowledge'
import { stripQuantityPrefix, parseAnyLeadingMeasurement } from './measurementUnits'
import { stripBasicPantryLabel } from './dessertRecipeBuilder'

/** @typedef {'meal' | 'dessert' | 'soup_stew'} DishRecipeType */

/**
 * @typedef {Object} DishCookingProfile
 * @property {string} [patternId]
 * @property {RegExp} [match]
 * @property {DishRecipeType} [recipeType]
 * @property {string[]} requiredCanons
 * @property {string[]} [forbiddenCanons]
 * @property {string[]} [skipGenericCanons]
 * @property {boolean} [requiresLiquid]
 * @property {boolean} [requiresBakingStaples]
 * @property {boolean} [useButterNotOil]
 */

/** @type {DishCookingProfile[]} */
const DISH_COOKING_PROFILES = [
  {
    patternId: 'classic_pancakes',
    match: /pancake|פנקייק/i,
    recipeType: 'meal',
    requiredCanons: ['flour', 'egg', 'milk', 'sugar', 'baking powder', 'salt', 'butter'],
    forbiddenCanons: ['oil', 'olive', 'olive oil'],
    skipGenericCanons: ['oil', 'onion', 'garlic', 'paprika', 'cumin', 'black pepper'],
    useButterNotOil: true,
  },
  {
    patternId: 'dairy_cheese_cake',
    match: /cheesecake|cheese\s*cake|עוג(?:ת|ה)\s*גבינ/i,
    recipeType: 'dessert',
    requiredCanons: ['flour', 'cheese', 'milk', 'butter', 'sugar', 'egg', 'vanilla', 'salt'],
    forbiddenCanons: ['oil', 'olive', 'olive oil', 'onion', 'garlic'],
    skipGenericCanons: ['oil', 'onion', 'garlic', 'paprika', 'cumin'],
    requiresBakingStaples: true,
  },
  {
    patternId: 'parve_shakshuka',
    match: /shakshuka|שקשוק/i,
    recipeType: 'meal',
    requiredCanons: ['tomato', 'egg', 'onion', 'garlic', 'oil', 'paprika', 'cumin'],
    skipGenericCanons: ['butter', 'baking powder', 'flour', 'sugar'],
  },
  {
    patternId: 'margherita_pizza',
    match: /pizza|פיצה|margherita/i,
    recipeType: 'meal',
    requiredCanons: ['flour', 'tomato', 'cheese', 'water', 'salt', 'oil', 'garlic'],
    skipGenericCanons: ['butter', 'baking powder', 'sugar'],
    requiresLiquid: true,
  },
  {
    patternId: 'tomato_basil_pasta',
    match: /tomato\s*pasta|pasta\s*tomato|פסטה\s*עגבנ|spaghetti/i,
    recipeType: 'meal',
    requiredCanons: ['pasta', 'tomato', 'garlic', 'oil', 'salt', 'basil'],
    skipGenericCanons: ['butter', 'baking powder', 'sugar'],
  },
  {
    patternId: 'vegetable_soup',
    match: /vegetable\s*soup|מרק\s*ירקות/i,
    recipeType: 'soup_stew',
    requiredCanons: ['carrot', 'onion', 'potato', 'water', 'salt', 'oil'],
    skipGenericCanons: ['butter', 'baking powder', 'sugar'],
    requiresLiquid: true,
  },
]

function canonFromLine(line) {
  const stripped = stripBasicPantryLabel(String(line ?? ''))
  const parsed = parseAnyLeadingMeasurement(stripped)
  const base = parsed?.name?.trim() || stripQuantityPrefix(stripped)
  return canonicalIngredient(base)
}

function lineMatchesForbiddenCanon(line, forbiddenCanon) {
  const lineCanon = canonFromLine(line)
  if (!lineCanon) return false
  if (lineCanon === forbiddenCanon) return true
  if (forbiddenCanon === 'oil' && (lineCanon === 'olive' || lineCanon === 'olive oil')) return true
  if (forbiddenCanon === 'olive oil' && (lineCanon === 'oil' || lineCanon === 'olive')) return true
  return false
}

export function getDishCookingProfile({ patternId, dishIdea, recipeName, recipeType } = {}) {
  const text = [dishIdea, recipeName].filter(Boolean).join(' ')
  for (const profile of DISH_COOKING_PROFILES) {
    if (patternId && profile.patternId === patternId) return profile
  }
  for (const profile of DISH_COOKING_PROFILES) {
    if (profile.match?.test(text)) return profile
  }
  if (recipeType === 'soup_stew') {
    return {
      requiredCanons: ['water', 'salt'],
      skipGenericCanons: ['baking powder', 'vanilla', 'sugar'],
      requiresLiquid: true,
    }
  }
  if (recipeType === 'dessert') {
    return {
      requiredCanons: [],
      skipGenericCanons: ['onion', 'garlic', 'paprika', 'cumin'],
      requiresBakingStaples: true,
    }
  }
  return null
}

export function stripForbiddenDishIngredients(recipe, profile) {
  if (!profile?.forbiddenCanons?.length) return recipe
  const ingredients = (recipe.ingredients ?? []).filter(
    (line) => !profile.forbiddenCanons.some((canon) => lineMatchesForbiddenCanon(line, canon)),
  )
  return { ...recipe, ingredients }
}

export function resolveDishCookingOptions(recipe, options = {}) {
  const profile = options.dishProfile ?? getDishCookingProfile({
    patternId: options.patternId ?? recipe.patternId,
    dishIdea: options.dishIdea ?? recipe.requestedDishIdea,
    recipeName: recipe.name,
    recipeType: options.recipeType ?? 'meal',
  })

  return {
    ...options,
    dishProfile: profile,
    skipGenericCanons: profile?.skipGenericCanons ?? options.skipGenericCanons,
    useButterNotOil: profile?.useButterNotOil ?? options.useButterNotOil,
  }
}

export function applyDishCookingProfile(recipe, options = {}) {
  const resolved = resolveDishCookingOptions(recipe, options)
  const profile = resolved.dishProfile
  if (!profile) return recipe

  let next = stripForbiddenDishIngredients(recipe, profile)
  if (profile.patternId) {
    next = { ...next, patternId: profile.patternId }
  }
  return next
}
