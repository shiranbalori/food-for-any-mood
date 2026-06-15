/**
 * Central pattern selection for realistic fallback recipes.
 *
 * Works with recipeGenerationPolicy.js:
 * - Input: any reasonable ingredients; block only hard conflicts.
 * - Output: recipe must match selected category (add pantry staples when needed).
 * - Prefer recognizable real-world dishes; support regenerate via exclusions.
 */

import { isAnyCategory } from './recipeCategoryGuard'
import {
  buildUserIngredientProfile,
  suggestCategoryFromIngredients,
} from './recipeGenerationPolicy'

/** Common pantry staples the engine may add for realistic dishes. */
export const REAL_WORLD_PANTRY_CANONS = new Set([
  'water',
  'salt',
  'black pepper',
  'pepper',
  'oil',
  'olive',
  'olive oil',
  'garlic',
  'onion',
  'butter',
  'cheese',
  'milk',
  'cream',
  'sugar',
  'baking powder',
  'egg',
  'eggs',
  'chicken',
  'paprika',
  'cumin',
  'oregano',
  'basil',
  'thyme',
  'ginger',
  'vanilla',
])

const DAIRY_RESTRICTED_CANONS = new Set([
  'milk',
  'cheese',
  'cream',
  'butter',
  'yogurt',
  'ricotta',
  'parmesan',
  'feta',
  'mozzarella',
  'cottage cheese',
])

const LAND_MEAT_RESTRICTED_CANONS = new Set([
  'chicken',
  'beef',
  'turkey',
  'lamb',
  'pork',
  'meat',
  'steak',
  'ground beef',
])

const EGG_CANONS = new Set(['egg', 'eggs'])

export function resolvePatternCategory(selectedCategory, userIngredientsRaw = '') {
  if (selectedCategory === 'vegan') return 'parve'
  if (isAnyCategory(selectedCategory)) {
    const profile = buildUserIngredientProfile(userIngredientsRaw)
    return suggestCategoryFromIngredients(profile)
  }
  return selectedCategory
}

function patternUsesRestrictedCanons(pattern, restrictedSet) {
  for (const canon of pattern.required ?? []) {
    if (restrictedSet.has(canon)) return true
  }
  for (const staple of pattern.pantryStaples ?? []) {
    if (restrictedSet.has(staple.canon)) return true
  }
  return false
}

/**
 * Block dairy/meat patterns unless the user selected that category or listed those ingredients.
 */
export function patternAllowedForUserIngredients(
  pattern,
  { selectedCategory = 'any', userCanons = new Set(), userIngredientsRaw = '' } = {},
) {
  const profile = buildUserIngredientProfile(userIngredientsRaw)
  const effectiveCategory = resolvePatternCategory(selectedCategory, userIngredientsRaw)
  const patternCategory = pattern.category ?? 'parve'

  if (!patternMatchesSelectedCategory(pattern, effectiveCategory)) return false

  const userAllowsDairy = selectedCategory === 'dairy' || profile.hasDairy
  if (!userAllowsDairy) {
    if (patternCategory === 'dairy') return false
    if (patternUsesRestrictedCanons(pattern, DAIRY_RESTRICTED_CANONS)) return false
  }

  const userAllowsMeat = selectedCategory === 'meat' || profile.hasLandMeat
  if (!userAllowsMeat) {
    if (patternCategory === 'meat') return false
    if (patternUsesRestrictedCanons(pattern, LAND_MEAT_RESTRICTED_CANONS)) return false
  }

  if (selectedCategory === 'vegan') {
    if (patternCategory === 'dairy' || patternCategory === 'meat') return false
    if (patternUsesRestrictedCanons(pattern, DAIRY_RESTRICTED_CANONS)) return false
    if (patternUsesRestrictedCanons(pattern, LAND_MEAT_RESTRICTED_CANONS)) return false
    for (const canon of pattern.required ?? []) {
      if (EGG_CANONS.has(canon)) return false
    }
    for (const staple of pattern.pantryStaples ?? []) {
      if (EGG_CANONS.has(staple.canon)) return false
    }
  }

  void userCanons
  return true
}

/**
 * @param {object} pattern
 * @param {string} category
 */
export function patternMatchesSelectedCategory(pattern, category) {
  if (isAnyCategory(category)) return true
  if (category === 'vegan') {
    return pattern.category === 'parve' || pattern.category === 'vegan'
  }
  return !pattern.category || pattern.category === category
}

/**
 * Rank realistic dish patterns for generation / regenerate.
 *
 * @param {object[]} patterns
 * @param {Set<string>} userCanons
 * @param {(pattern: object, userCanons: Set<string>) => number|null} scorePattern
 * @param {object} [options]
 */
export function rankRealisticPatterns(
  patterns,
  userCanons,
  scorePattern,
  {
    category = 'any',
    selectedCategory = category,
    userIngredientsRaw = '',
    language = 'he',
    excludeTitles = [],
    excludeTemplateKeys = [],
    excludeCookingMethods = [],
    excludeDessertCategories = [],
    isExcludedTitle = () => false,
  } = {},
) {
  const ranked = []

  for (const pattern of patterns) {
    if (
      !patternAllowedForUserIngredients(pattern, {
        selectedCategory,
        userCanons,
        userIngredientsRaw,
      })
    ) {
      continue
    }
    if (excludeTemplateKeys.includes(pattern.id)) continue
    if (isExcludedTitle(pattern, language, excludeTitles)) continue
    if (pattern.cookingMethod && excludeCookingMethods.includes(pattern.cookingMethod)) continue
    if (pattern.dessertCategory && excludeDessertCategories.includes(pattern.dessertCategory)) continue

    const score = scorePattern(pattern, userCanons)
    if (score == null) continue
    ranked.push({ pattern, score })
  }

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return (b.pattern.selectionPriority ?? 0) - (a.pattern.selectionPriority ?? 0)
  })

  return ranked
}

export function getBestRankedPattern(ranked) {
  return ranked[0]?.pattern ?? null
}
