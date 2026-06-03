import { getIngredientLabel } from '../data/ingredientLabels'
import { canonicalIngredient } from '../data/ingredientKnowledge'
import { ingredientAppearsInText } from './ingredientRelevance'
import { buildDessertDishTitle, isIngredientListTitle } from './dessertDishTitle'
import { buildGroundedChefTitle } from './recipeGrounding'

const STAPLE_CANONICAL = new Set([
  'salt',
  'pepper',
  'black pepper',
  'oil',
  'olive',
  'olive oil',
  'water',
  'sugar',
])

const QTY_PREFIX =
  /^[\d./]+\s*(?:כפית|כפיות|כף|כפות|גרם|מ"ל|כוס|כוסות|tsp|tbsp|gram|grams|g|ml|cup|cups)?\s*/i

export const FORBIDDEN_GENERIC_TITLES = new Set([
  'תבשיל ביתי',
  'קינוח גבינה',
  'עוגה ביתית',
  'עוגת שוקולד ביתית',
  'עוגיות מהירות',
  'מאפינס וניל',
  'בראוניז מהיר',
  'מנה מהירה',
  'מנה מהתנור',
  'סלט ירקות טרי',
  'סלט טרי',
  'מוקפץ ירקות',
  'עוף בתנור',
  'תבשיל בשר',
  'קארי ביתי',
  'פסטה ביתית',
  'פסטה מהירה',
  'מנה מהירה במחבת',
  'מנה ביתית מהמטבח',
  'מנה ביתית בסיר',
  'ביצה עם פסטה',
  'פסטה עם ביצה',
  'קמח במחבת',
  'אורז מוקפץ',
  'homemade beef patties',
  'cheesecake dessert',
  'homemade chocolate cake',
  'quick cookies',
  'vanilla muffins',
  'quick brownies',
  'creamy home-cooked dish',
  'quick vegetable stir-fry',
])

function stripQtyPrefix(raw) {
  return String(raw ?? '')
    .replace(QTY_PREFIX, '')
    .trim()
}

function filterMainIngredients(ingredients = []) {
  return ingredients.filter((item) => {
    const canon = canonicalIngredient(stripQtyPrefix(item))
    return !canon || !STAPLE_CANONICAL.has(canon)
  })
}

function toDisplayLabels(ingredients, language = 'he') {
  return filterMainIngredients(ingredients).map((item) => {
    const bare = stripQtyPrefix(item)
    if (/[\u0590-\u05FF]/.test(bare) && !/[a-z]/i.test(bare)) return bare
    return getIngredientLabel(bare, language)
  })
}

function toMainCanon(ingredients) {
  return filterMainIngredients(ingredients)
    .map((item) => canonicalIngredient(stripQtyPrefix(item)))
    .filter(Boolean)
}

function joinHebrewNames(names) {
  const unique = [...new Set(names.filter(Boolean))]
  if (unique.length === 0) return ''
  if (unique.length === 1) return unique[0]
  if (unique.length === 2) return `${unique[0]} עם ${unique[1]}`
  return `${unique.slice(0, -1).join(', ')} ו${unique[unique.length - 1]}`
}

function joinEnglishNames(names) {
  const unique = [...new Set(names.filter(Boolean))]
  if (unique.length === 0) return ''
  if (unique.length === 1) return unique[0]
  if (unique.length === 2) return `${unique[0]} with ${unique[1]}`
  return `${unique.slice(0, -1).join(', ')} and ${unique[unique.length - 1]}`
}

function inferHebrewDessertPrefix(mainCanon) {
  const set = new Set(mainCanon)
  if (set.has('chocolate') || set.has('flour') || set.has('sugar')) return 'עוגת'
  if (set.has('blueberries') || set.has('honey')) return 'עוגת'
  return 'קינוח'
}

function inferEnglishDessertSuffix(mainCanon) {
  const set = new Set(mainCanon)
  if (set.has('chocolate') && (set.has('flour') || set.has('sugar'))) return 'Cake'
  if (set.has('chocolate')) return 'Brownies'
  if (set.has('flour') && set.has('sugar')) return 'Cookies'
  return 'Dessert'
}

export { isIngredientListTitle } from './dessertDishTitle'

export function isForbiddenGenericTitle(title) {
  const text = String(title ?? '').trim()
  if (!text) return true
  if (FORBIDDEN_GENERIC_TITLES.has(text)) return true
  return FORBIDDEN_GENERIC_TITLES.has(text.toLowerCase())
}

export function titleReflectsIngredients(title, ingredients = [], language = 'he') {
  const text = String(title ?? '').trim()
  if (!text || isForbiddenGenericTitle(text)) return false

  const mains = filterMainIngredients(ingredients)
  if (mains.length === 0) return true

  return mains.some((item) => ingredientAppearsInText(item, text))
}

/**
 * Build a dish title from the recipe's main ingredients (never generic-only).
 */
export function buildTitleFromIngredients(
  ingredients = [],
  { language = 'he', recipeType = 'meal' } = {},
) {
  if (recipeType === 'dessert') {
    return buildDessertDishTitle(ingredients, { language }).name
  }

  const mainNames = [...new Set(toDisplayLabels(ingredients, language))].filter(Boolean).slice(0, 2)
  const mainCanon = toMainCanon(ingredients)

  if (mainNames.length === 0) {
    return language === 'en' ? 'Homemade Dish' : 'מנה ביתית מהמטבח'
  }

  if (mainCanon.includes('chicken')) {
    return language === 'en' ? 'Homemade Chicken Dish' : 'עוף ביתי'
  }
  if (mainCanon.includes('beef') || mainCanon.includes('steak')) {
    return language === 'en' ? 'Homemade Beef Dish' : 'בשר בקר ביתי'
  }
  const canonSet = new Set(mainCanon)

  if (canonSet.has('flour') && (canonSet.has('egg') || canonSet.has('eggs'))) {
    return language === 'en' ? 'Quick flour and egg fritters' : 'לביבות קמח וביצה מהירות'
  }
  if (canonSet.has('cheese') && (canonSet.has('egg') || canonSet.has('eggs'))) {
    return language === 'en' ? 'Soft cheese omelette' : 'חביתת גבינה רכה'
  }
  if (canonSet.has('pasta') && (canonSet.has('egg') || canonSet.has('eggs'))) {
    return language === 'en' ? 'Pasta with egg and herbs' : 'פסטה עם ביצה ועשבי תיבול'
  }
  if (canonSet.has('cheese')) {
    return language === 'en' ? 'Soft cheese omelette' : 'חביתת גבינה רכה'
  }
  if (canonSet.has('egg') || canonSet.has('eggs')) {
    return language === 'en' ? 'Quick omelette' : 'חביתה מהירה'
  }
  if (mainCanon.includes('pasta')) {
    return buildGroundedChefTitle(ingredients, ingredients, language)
  }
  if (mainCanon.includes('rice')) {
    return language === 'en' ? 'Homestyle Rice Dish' : 'אורז ביתי'
  }

  const joined = language === 'en' ? joinEnglishNames(mainNames) : joinHebrewNames(mainNames)
  return language === 'en' ? `Quick ${joined} dish` : `מנה מהירה עם ${joined}`
}
