/** Hard guards so dessert requests never get savory fallback titles. */

import {
  buildTitleFromIngredients,
  isForbiddenGenericTitle,
  isIngredientListTitle,
  titleReflectsIngredients,
} from './ingredientBasedTitle'
import { buildDessertDishTitle } from './dessertDishTitle'

export const DESSERT_BLOCKED_TITLE_WORDS = [
  'תבשיל ביתי',
  'תבשיל',
  'ארוחה',
  'מנה',
  'פסטה',
  'סלט',
  'מרק',
]

const DESSERT_TITLE_KEYWORDS = [
  'עוג',
  'קינוח',
  'מוס',
  'בראונ',
  'מאפין',
  'גלידה',
  'סורבה',
  'טירמיסו',
  'פנקייק',
  'מתוק',
  'שוקולד',
  'קרם',
  'cake',
  'cookie',
  'brownie',
  'muffin',
  'dessert',
  'cheesecake',
  'chocolate',
]

export function isBlockedSavoryTitleForDessert(title) {
  const text = String(title ?? '').trim().toLowerCase()
  if (!text) return true
  return DESSERT_BLOCKED_TITLE_WORDS.some((word) => text.includes(word.toLowerCase()))
}

export function isValidDessertTitle(title, ingredients = [], language = 'he') {
  const text = String(title ?? '').trim()
  if (!text || isBlockedSavoryTitleForDessert(text) || isForbiddenGenericTitle(text)) {
    return false
  }
  if (isIngredientListTitle(text, ingredients, language)) {
    return false
  }

  if (ingredients.length > 0 && !titleReflectsIngredients(text, ingredients, language)) {
    return false
  }

  return DESSERT_TITLE_KEYWORDS.some((keyword) => text.toLowerCase().includes(keyword))
}

export function pickGuaranteedDessertTitle(category = 'dairy', language = 'he', ingredients = []) {
  if (category === 'meat') return null
  return buildDessertDishTitle(ingredients, { language }).name
}

/**
 * @param {{ name?: string, ingredients?: string[] }} recipe
 * @param {'meal' | 'dessert'} recipeType
 * @param {'dairy' | 'meat' | 'parve'} [category='dairy']
 */
export function enforceRecipeTypeTitle(recipe, recipeType, category = 'dairy', language = 'he') {
  if (recipeType !== 'dessert') return recipe
  if (category === 'meat') return recipe

  const ingredients = recipe?.ingredients ?? []
  if (isValidDessertTitle(recipe?.name, ingredients, language)) {
    return recipe
  }

  const name = buildDessertDishTitle(ingredients, { language }).name
  return { ...recipe, name }
}
