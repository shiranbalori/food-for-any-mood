/**
 * Central pattern selection for realistic fallback recipes.
 *
 * Works with recipeGenerationPolicy.js:
 * - Input: any reasonable ingredients; block only hard conflicts.
 * - Output: recipe must match selected category (add pantry staples when needed).
 * - Prefer recognizable real-world dishes; support regenerate via exclusions.
 */

import { isAnyCategory } from './recipeCategoryGuard'

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
    if (!patternMatchesSelectedCategory(pattern, category)) continue
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
