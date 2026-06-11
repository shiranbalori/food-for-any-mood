/**
 * Familiar real-world dish patterns for ingredient-based fallback recipes.
 * Mirrors backend/recipe_dish_patterns.py (subset).
 */

import { canonicalIngredient } from '../data/ingredientKnowledge'
import { parseUserIngredients } from './ingredientRelevance'

const DISH_PATTERNS = [
  {
    id: 'butter_cinnamon_cookies',
    required: new Set(['flour', 'sugar', 'cinnamon', 'butter']),
    recipeType: 'dessert',
    nameHe: 'עוגיות חמאה וקינמון',
    nameEn: 'Butter Cinnamon Cookies',
    titleKeywordsHe: ['עוג', 'קינמון', 'חמאה', 'בצק'],
    titleKeywordsEn: ['cookie', 'cake', 'cinnamon', 'butter'],
    stepsHe: (bake) => [
      'מחממים תנור ל-180 מעלות לפני שאופים את העוגיות.',
      'מרככים חמאה ומערבבים עם סוכר וקינמון בקערה עד לתערובת אחידה.',
      'מוסיפים קמח ולשים עד לקבלת בצק רך.',
      `יוצרים עוגיות, מסדרים על תבנית ואופים בתנור ${bake} דקות עד פריך וזהוב.`,
      'מקררים על רשת כמה דקות לפני ההגשה.',
      'מקררים לגמרי ומגישים עם תה או קפה.',
    ],
    stepsEn: (bake) => [
      'Preheat the oven to 180°C.',
      'Soften butter and mix with sugar and cinnamon.',
      'Add flour and mix until a soft dough forms.',
      `Shape cookies and bake for about ${bake} minutes until crisp.`,
      'Cool on a rack before serving.',
      'Serve with tea or coffee.',
    ],
  },
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

export function getBestDishPattern(userIngredientsRaw, { recipeType = 'meal', category = 'dairy' } = {}) {
  const userIngredients = Array.isArray(userIngredientsRaw)
    ? userIngredientsRaw
    : parseUserIngredients(userIngredientsRaw)
  if (!userIngredients.length) return null

  const canons = canonicalizeIngredients(userIngredients)
  let best = null
  let bestScore = 0

  for (const pattern of DISH_PATTERNS) {
    if (pattern.recipeType !== recipeType) continue
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
