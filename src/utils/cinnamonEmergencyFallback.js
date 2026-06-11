/**
 * Hardcoded emergency fallback for קמח+סוכר+חמאה+קינמון + dessert (קינוח).
 * Bypasses frontend validation when normal generation fails.
 */

import { canonicalIngredient } from '../data/ingredientKnowledge'
import { parseUserIngredients } from './ingredientRelevance'
import { recommendPlaylist } from './playlistEngine'

const CINNAMON_DESSERT_CANONS = new Set(['flour', 'sugar', 'butter', 'cinnamon'])
const DESSERT_RECIPE_TYPES = new Set(['dessert', 'קינוח'])

export function describeCinnamonEmergencyDetection(userInput) {
  const recipeType = userInput?.recipeType ?? 'meal'
  const parsed = parseUserIngredients(userInput?.ingredients ?? '')
  const canons = parsed.map((item) => canonicalIngredient(item)).filter(Boolean)
  return {
    recipeType,
    recipeTypeMatches: DESSERT_RECIPE_TYPES.has(recipeType),
    canonicalIngredients: canons,
    hasAllRequiredCanons: [...CINNAMON_DESSERT_CANONS].every((c) => canons.includes(c)),
  }
}

export function isCinnamonDessertEmergencyInput(userInput) {
  const recipeType = userInput?.recipeType ?? 'meal'
  if (!DESSERT_RECIPE_TYPES.has(recipeType)) return false
  const parsed = parseUserIngredients(userInput?.ingredients ?? '')
  if (!parsed.length) return false
  const canons = new Set(parsed.map((item) => canonicalIngredient(item)).filter(Boolean))
  return [...CINNAMON_DESSERT_CANONS].every((c) => canons.has(c))
}

export function buildCinnamonEmergencyRecipe(userInput) {
  const language = userInput?.language ?? 'he'
  const category = userInput?.category ?? 'dairy'
  const cookingTime = userInput?.cookingTime ?? 30
  const mood = userInput?.mood ?? 'cozy'
  const musicPlatform = userInput?.musicPlatform ?? 'spotify'
  const servings = userInput?.servings ?? 4

  const name = 'עוגיות חמאה וקינמון'
  const ingredients = [
    '2 כוסות קמח',
    '100 גרם חמאה',
    '1/2 כוס סוכר',
    '1 כפית קינמון',
    '1 ביצה',
  ]
  const steps = [
    'מחממים תנור ל-180 מעלות.',
    'מערבבים בקערה חמאה רכה וסוכר עד לקבלת תערובת אחידה.',
    'מוסיפים ביצה וקינמון ומערבבים.',
    'מוסיפים קמח בהדרגה ולשים עד לקבלת בצק רך.',
    'יוצרים עוגיות קטנות ומניחים על תבנית עם נייר אפייה.',
    'אופים 12-15 דקות עד שהעוגיות מזהיבות קלות.',
  ]
  const description =
    language === 'he'
      ? 'עוגיות חמאה וקינמון קלאסיות — בצק פשוט שאופים עד פריך וזהוב.'
      : 'Classic butter cinnamon cookies — simple dough baked until lightly golden.'

  const playlist = recommendPlaylist(
    { mood, category, style: 'comfort', cookTime: cookingTime, spiceLevel: 0, recipeName: name },
    musicPlatform,
    language,
  )

  return {
    name,
    description,
    ingredients,
    steps,
    matchPercentage: 100,
    spiceLevel: 0,
    nutrition: { calories: 320, protein: 5, carbs: 38, fat: 16, servings },
    healthScore: 32,
    tags: category === 'parve' ? ['comfortFood'] : ['comfortFood', 'vegetarian'],
    playlist,
    optionalUpgrades: [],
    generatedFromPreferences: false,
    categoryNote: null,
    resolvedCategory: category === 'any' ? 'dairy' : category,
  }
}
