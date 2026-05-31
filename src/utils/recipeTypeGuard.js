/** Hard guards so dessert requests never get savory fallback titles. */

export const DESSERT_BLOCKED_TITLE_WORDS = [
  'תבשיל ביתי',
  'תבשיל',
  'ארוחה',
  'מנה',
  'פסטה',
  'סלט',
  'מרק',
]

export const DESSERT_FALLBACK_TITLES = [
  'עוגת שוקולד ביתית',
  'עוגיות מהירות',
  'מאפינס וניל',
  'קינוח גבינה',
  'בראוניז מהיר',
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
]

const DESSERT_TITLE_BY_CATEGORY = {
  dairy: 'קינוח גבינה',
  parve: 'עוגיות מהירות',
}

export function isBlockedSavoryTitleForDessert(title) {
  const text = String(title ?? '').trim().toLowerCase()
  if (!text) return true
  return DESSERT_BLOCKED_TITLE_WORDS.some((word) => text.includes(word.toLowerCase()))
}

export function isValidDessertTitle(title) {
  const text = String(title ?? '').trim().toLowerCase()
  if (!text || isBlockedSavoryTitleForDessert(text)) return false
  if (DESSERT_TITLE_KEYWORDS.some((keyword) => text.includes(keyword))) return true
  return DESSERT_FALLBACK_TITLES.some(
    (fallback) => text === fallback.toLowerCase() || text.includes(fallback.toLowerCase()),
  )
}

export function pickGuaranteedDessertTitle(category = 'dairy') {
  if (category === 'meat') return null
  return DESSERT_TITLE_BY_CATEGORY[category] ?? DESSERT_FALLBACK_TITLES[0]
}

/**
 * @param {{ name?: string }} recipe
 * @param {'meal' | 'dessert'} recipeType
 * @param {'dairy' | 'meat' | 'parve'} [category='dairy']
 */
export function enforceRecipeTypeTitle(recipe, recipeType, category = 'dairy') {
  if (recipeType !== 'dessert') return recipe
  if (category === 'meat') return recipe
  if (isValidDessertTitle(recipe?.name)) return recipe
  const name = pickGuaranteedDessertTitle(category)
  if (!name) return recipe
  return { ...recipe, name }
}
