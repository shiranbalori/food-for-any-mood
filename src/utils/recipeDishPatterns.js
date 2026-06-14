/**
 * Familiar real-world dish patterns for ingredient-based fallback recipes.
 * Mirrors backend/recipe_dish_patterns.py (subset).
 */

import { canonicalIngredient } from '../data/ingredientKnowledge'
import { parseUserIngredients } from './ingredientRelevance'
import {
  REALISTIC_DESSERT_PATTERNS,
  buildDessertIngredientList,
  buildRealisticDessertFromPattern,
  getBestDessertPattern,
} from './dessertRecipeBuilder'

const MEAL_DISH_PATTERNS = [
  {
    id: 'creamy_mushroom_pasta',
    required: new Set(['pasta', 'cream', 'mushroom']),
    recipeType: 'meal',
    nameHe: 'פסטה בשמנת ופטריות',
    nameEn: 'Creamy Mushroom Pasta',
    titleKeywordsHe: ['פסטה', 'פטריות', 'שמנת'],
    titleKeywordsEn: ['pasta', 'mushroom', 'cream'],
    stepsHe: (cook) => [
      'מרתיחים סיר עם מים מומלחים ומבשלים את הפסטה.',
      'מטגנים פטריות במחבת עד הזהבה.',
      `מוסיפים שמנת ומבשלים ${cook} דקות עד רוטב סמיך.`,
      'מערבבים עם הפסטה ומגישים חם.',
    ],
    stepsEn: (cook) => [
      'Boil salted water and cook the pasta.',
      'Sauté mushrooms until golden.',
      `Add cream and simmer for about ${cook} minutes until thickened.`,
      'Toss with pasta and serve hot.',
    ],
  },
  {
    id: 'shakshuka',
    required: new Set(['egg', 'tomato']),
    recipeType: 'meal',
    nameHe: 'שקשוקה',
    nameEn: 'Shakshuka',
    titleKeywordsHe: ['שקשוק', 'ביצ', 'עגבנ'],
    titleKeywordsEn: ['shakshuka', 'egg', 'tomato'],
    stepsHe: (cook) => [
      'מחממים שמן במחבת ומטגנים בצל אם יש.',
      'מוסיפים עגבניות ומבשלים רוטב עד סמיכות.',
      `שוברים ביצים לתוך הרוטב ומכסים ${cook} דקות.`,
      'מגישים ישר מהמחבת.',
    ],
    stepsEn: (cook) => [
      'Warm oil in a skillet and sauté onion if using.',
      'Add tomatoes and simmer until thickened.',
      `Crack eggs into the sauce, cover, and cook about ${cook} minutes.`,
      'Serve straight from the pan.',
    ],
  },
]

const DESSERT_DISH_PATTERNS = REALISTIC_DESSERT_PATTERNS.map((pattern) => ({
  ...pattern,
  recipeType: 'dessert',
}))

const DISH_PATTERNS = [...MEAL_DISH_PATTERNS, ...DESSERT_DISH_PATTERNS]

function canonicalizeIngredients(userIngredients) {
  const canons = new Set()
  for (const item of userIngredients) {
    const canon = canonicalIngredient(item)
    if (canon) canons.add(canon)
    else if (item?.trim()) canons.add(item.trim().toLowerCase())
  }
  return canons
}

function scorePattern(pattern, canons) {
  if (![...pattern.required].every((item) => canons.has(item))) return null
  return pattern.required.size * 10 + (canons.size - pattern.required.size <= 2 ? 2 : 0)
}

function isExcludedPatternTitle(pattern, language, excludeTitles = []) {
  if (!excludeTitles.length) return false
  const name = language === 'he' ? pattern.nameHe : pattern.nameEn
  const normalized = String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
  return excludeTitles.some(
    (title) =>
      String(title ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ') === normalized,
  )
}

export function getBestDishPattern(
  userIngredientsRaw,
  {
    recipeType = 'meal',
    category = 'dairy',
    language = 'he',
    excludeTitles = [],
    excludeTemplateKeys = [],
  } = {},
) {
  if (recipeType === 'dessert') {
    return getBestDessertPattern(userIngredientsRaw, {
      category,
      language,
      excludeTitles,
      excludeTemplateKeys,
    })
  }

  const userIngredients = Array.isArray(userIngredientsRaw)
    ? userIngredientsRaw
    : parseUserIngredients(userIngredientsRaw)
  if (!userIngredients.length) return null

  const canons = canonicalizeIngredients(userIngredients)
  let best = null
  let bestScore = 0

  for (const pattern of DISH_PATTERNS) {
    if (pattern.recipeType !== recipeType) continue
    if (pattern.category && pattern.category !== category) continue
    if (excludeTemplateKeys.includes(pattern.id)) continue
    if (isExcludedPatternTitle(pattern, language, excludeTitles)) continue
    const score = scorePattern(pattern, canons)
    if (score != null && score > bestScore) {
      bestScore = score
      best = pattern
    }
  }

  return bestScore >= 20 ? best : null
}

export function buildPatternSteps(pattern, { language = 'he', cookingTime = 30 } = {}) {
  if (!pattern) return null
  const bake = Math.min(cookingTime, Math.max(20, Math.round(cookingTime * 0.85)))
  const cook = Math.min(cookingTime, Math.max(12, Math.round(cookingTime / 2)))
  const time = pattern.recipeType === 'dessert' ? bake : cook
  return language === 'he' ? pattern.stepsHe(time) : pattern.stepsEn(time)
}

export function getDishPatternName(pattern, language = 'he') {
  if (!pattern) return ''
  return language === 'he' ? pattern.nameHe : pattern.nameEn
}

export function buildPatternIngredients(
  pattern,
  { language = 'he', filteredUserIngredients = [], displayNames = [], pantryLabel } = {},
) {
  if (!pattern) return []
  if (pattern.userQuantities) {
    return buildDessertIngredientList(pattern, filteredUserIngredients, displayNames, {
      language,
      pantryLabel,
    })
  }
  if (language === 'he' && typeof pattern.ingredientsHe === 'function') {
    return pattern.ingredientsHe()
  }
  if (language === 'en' && typeof pattern.ingredientsEn === 'function') {
    return pattern.ingredientsEn()
  }
  return []
}

export { buildRealisticDessertFromPattern } from './dessertRecipeBuilder'
