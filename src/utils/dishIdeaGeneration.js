/**
 * Dish-idea-first generation: user names a recognizable dish, then the engine
 * builds a complete recipe (adding base ingredients when needed).
 */

import { canonicalIngredient, ingredientsMatch } from '../data/ingredientKnowledge'
import { parseUserIngredients } from './ingredientRelevance'
import { REALISTIC_DESSERT_PATTERNS, buildRealisticDessertFromPattern } from './dessertRecipeBuilder'
import { REALISTIC_MEAL_PATTERNS, buildRealisticMealFromPattern } from './mealRecipeBuilder'
import { REALISTIC_SOUP_PATTERNS, buildRealisticSoupFromPattern } from './soupRecipeBuilder'
import { stripQuantityPrefix, parseAnyLeadingMeasurement } from './measurementUnits'
import { stripBasicPantryLabel } from './dessertRecipeBuilder'
import { normalizeDishIdea } from './dishIdeaUtils'

/** @typedef {'meal' | 'dessert' | 'soup_stew'} DishRecipeType */

/**
 * @typedef {Object} DishIdeaTarget
 * @property {string} key
 * @property {DishRecipeType} recipeType
 * @property {string} patternId
 * @property {string} [categoryHint]
 */

/** @type {Array<DishIdeaTarget & { match: RegExp }>} */
const DISH_IDEA_TARGETS = [
  {
    key: 'shakshuka',
    recipeType: 'meal',
    patternId: 'parve_shakshuka',
    categoryHint: 'parve',
    match: /שקשוק|shakshuka/i,
  },
  {
    key: 'cheese_shakshuka',
    recipeType: 'meal',
    patternId: 'dairy_tomato_egg_skillet',
    categoryHint: 'dairy',
    match: /שקשוק.*גבינ|cheese\s*shakshuka/i,
  },
  {
    key: 'cheesecake',
    recipeType: 'dessert',
    patternId: 'dairy_cheese_cake',
    categoryHint: 'dairy',
    match: /cheesecake|cheese\s*cake|עוג(?:ת|ה)\s*גבינ/i,
  },
  {
    key: 'carrot_cake',
    recipeType: 'dessert',
    patternId: 'carrot_cake',
    categoryHint: 'dairy',
    match: /carrot\s*cake|עוג(?:ת|ה)\s*גזר/i,
  },
  {
    key: 'pancakes',
    recipeType: 'meal',
    patternId: 'classic_pancakes',
    categoryHint: 'dairy',
    match: /pancake|פנקייק/i,
  },
  {
    key: 'pizza',
    recipeType: 'meal',
    patternId: 'margherita_pizza',
    categoryHint: 'dairy',
    match: /pizza|פיצה/i,
  },
  {
    key: 'tomato_pasta',
    recipeType: 'meal',
    patternId: 'tomato_basil_pasta',
    categoryHint: 'parve',
    match: /tomato\s*pasta|pasta\s*tomato|פסטה\s*עגבנ|ספגטי\s*עגבנ|spaghetti/i,
  },
  {
    key: 'vegetable_soup',
    recipeType: 'soup_stew',
    patternId: 'vegetable_soup',
    categoryHint: 'parve',
    match: /vegetable\s*soup|מרק\s*ירקות/i,
  },
]

function getAllPatterns() {
  return [...REALISTIC_MEAL_PATTERNS, ...REALISTIC_DESSERT_PATTERNS, ...REALISTIC_SOUP_PATTERNS]
}

function findPatternById(patternId) {
  return getAllPatterns().find((pattern) => pattern.id === patternId) ?? null
}

function canonFromLine(line) {
  const stripped = stripBasicPantryLabel(String(line ?? ''))
  const parsed = parseAnyLeadingMeasurement(stripped)
  const base = parsed?.name?.trim() || stripQuantityPrefix(stripped)
  return canonicalIngredient(base)
}

function findPatternByName(dishIdea, recipeType) {
  const text = dishIdea.toLowerCase()
  const pool = getAllPatterns().filter((pattern) => {
    if (recipeType === 'dessert') return REALISTIC_DESSERT_PATTERNS.some((p) => p.id === pattern.id)
    if (recipeType === 'soup_stew') return REALISTIC_SOUP_PATTERNS.some((p) => p.id === pattern.id)
    return REALISTIC_MEAL_PATTERNS.some((p) => p.id === pattern.id)
  })

  for (const pattern of pool) {
    const nameHe = String(pattern.nameHe ?? '')
    const nameEn = String(pattern.nameEn ?? '').toLowerCase()
    if (nameEn && (nameEn === text || text.includes(nameEn) || nameEn.includes(text))) return pattern
    if (nameHe && (nameHe === dishIdea || dishIdea.includes(nameHe) || nameHe.includes(dishIdea))) {
      return pattern
    }
    if (pattern.id.replace(/_/g, ' ').includes(text.replace(/\s+/g, ' '))) return pattern
  }
  return null
}

function patternToTarget(pattern) {
  return {
    key: pattern.id,
    recipeType: REALISTIC_DESSERT_PATTERNS.some((p) => p.id === pattern.id)
      ? 'dessert'
      : REALISTIC_SOUP_PATTERNS.some((p) => p.id === pattern.id)
        ? 'soup_stew'
        : 'meal',
    patternId: pattern.id,
    categoryHint: pattern.category,
  }
}

/**
 * Resolve a dish idea to a concrete pattern target.
 */
export function resolveDishIdeaTarget(dishIdeaRaw, { category = 'any', recipeType = 'meal', language = 'he' } = {}) {
  void language
  const dishIdea = normalizeDishIdea(dishIdeaRaw)
  if (!dishIdea) return null

  for (const target of DISH_IDEA_TARGETS) {
    if (target.match.test(dishIdea)) {
      if (target.key === 'shakshuka' && (category === 'dairy' || /גבינ|cheese/i.test(dishIdea))) {
        return DISH_IDEA_TARGETS.find((item) => item.key === 'cheese_shakshuka') ?? target
      }
      return target
    }
  }

  const byName = findPatternByName(dishIdea, recipeType)
  if (byName) {
    return patternToTarget(byName)
  }

  for (const fallbackType of ['dessert', 'soup_stew', 'meal']) {
    if (fallbackType === recipeType) continue
    const crossMatch = findPatternByName(dishIdea, fallbackType)
    if (crossMatch) return patternToTarget(crossMatch)
  }

  return null
}

function buildFromPattern(recipeType, pattern, ctx) {
  const options = { ...ctx, forceFullPatternIngredients: true }
  if (recipeType === 'dessert') return buildRealisticDessertFromPattern(pattern, options)
  if (recipeType === 'soup_stew') return buildRealisticSoupFromPattern(pattern, options)
  return buildRealisticMealFromPattern(pattern, options)
}

export function computeBaseIngredientsAdded(userIngredients, recipeIngredients) {
  const userCanons = new Set()
  for (const item of userIngredients) {
    const canon = canonicalIngredient(item)
    if (canon) userCanons.add(canon)
  }

  if (!userIngredients.length) return (recipeIngredients ?? []).length > 0

  return (recipeIngredients ?? []).some((line) => {
    const lineCanon = canonFromLine(line)
    if (lineCanon && userCanons.has(lineCanon)) return false
    if (userIngredients.some((userIng) => ingredientsMatch(userIng, line))) return false
    return true
  })
}

/**
 * Build a complete recipe for a named dish idea.
 */
export function buildRecipeFromDishIdea(
  dishIdeaRaw,
  {
    category = 'any',
    recipeType = 'meal',
    ingredients = '',
    language = 'he',
    cookingTime = 30,
    servings = 4,
    pantryLabel = '',
    excludeTitles = [],
    excludeTemplateKeys = [],
    excludeCookingMethods = [],
    excludeDessertCategories = [],
  } = {},
) {
  const dishIdea = normalizeDishIdea(dishIdeaRaw)
  const target = resolveDishIdeaTarget(dishIdea, { category, recipeType, language })
  if (!target) return null

  if (excludeTemplateKeys.includes(target.patternId)) return null
  if (excludeTitles.some((title) => title.trim() === dishIdea)) return null

  const pattern = findPatternById(target.patternId)
  if (!pattern) return null

  const filteredUserIngredients = parseUserIngredients(ingredients)
  const displayNames = filteredUserIngredients.map((item) => item)

  const built = buildFromPattern(target.recipeType, pattern, {
    filteredUserIngredients,
    displayNames,
    language,
    cookingTime,
    servings,
    pantryLabel,
  })

  const patternName = language === 'en' ? pattern.nameEn : pattern.nameHe
  const titleExcluded = excludeTitles.some((title) => title.trim() === String(built.name ?? '').trim())
  if (titleExcluded) return null

  const baseIngredientsAdded = computeBaseIngredientsAdded(filteredUserIngredients, built.ingredients)

  return {
    target,
    pattern,
    built: {
      ...built,
      name: patternName || built.name,
      requestedDishIdea: dishIdea,
      patternId: target.patternId,
    },
    recipeType: target.recipeType,
    dishIdea,
    baseIngredientsAdded,
    patternCategory: pattern.category ?? target.categoryHint ?? 'parve',
  }
}

export function shouldShowBaseIngredientsNotice(recipe) {
  return Boolean(recipe?.baseIngredientsAdded)
}
