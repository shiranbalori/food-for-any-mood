/**
 * Real-world meal recipe construction for ingredient-based fallback.
 * User ingredients stay primary; basic pantry staples are marked clearly.
 */

import { canonicalIngredient, ingredientsMatch } from '../data/ingredientKnowledge'
import { getIngredientLabel } from '../data/ingredientLabels'
import { applyRecipeQuantities } from './recipeQuantities'
import { parseUserIngredients } from './ingredientRelevance'
import {
  getBasicPantryLabel,
  scoreDessertPattern as scoreMealPattern,
} from './dessertRecipeBuilder'

function userHasCanon(userCanons, canon) {
  if (userCanons.has(canon)) return true
  if (canon === 'egg' && userCanons.has('eggs')) return true
  if (canon === 'eggs' && userCanons.has('egg')) return true
  return false
}

function canonizeList(ingredients) {
  const canons = new Set()
  for (const item of ingredients) {
    const canon = canonicalIngredient(item)
    if (canon) canons.add(canon)
  }
  return canons
}

function labelForCanon(canon, displayNames, filteredUserIngredients, language) {
  const index = filteredUserIngredients.findIndex(
    (item) => canonicalIngredient(item) === canon || ingredientsMatch(item, canon),
  )
  if (index >= 0 && displayNames[index]) return displayNames[index]
  return getIngredientLabel(canon, language)
}

function isExcludedMealTitle(pattern, language, excludeTitles = []) {
  if (!excludeTitles.length) return false
  const name = language === 'en' ? pattern.nameEn : pattern.nameHe
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

/** @type {import('./dessertRecipeBuilder').RealisticDessertPattern[]} */
export const REALISTIC_MEAL_PATTERNS = [
  {
    id: 'dairy_savory_cheese_pancakes',
    required: new Set(['flour', 'cheese', 'milk']),
    category: 'dairy',
    preferred: ['cheese'],
    supportive: ['egg'],
    selectionPriority: 24,
    nameHe: 'לביבות גבינה',
    nameEn: 'Savory Cheese Pancakes',
    userQuantities: {
      flour: { he: '150 גרם קמח', en: '150 g flour' },
      cheese: { he: '200 גרם גבינה', en: '200 g cheese' },
      milk: { he: '120 מ"ל חלב', en: '120 ml milk' },
    },
    pantryStaples: [
      { canon: 'egg', he: '2 ביצים', en: '2 eggs' },
      { canon: 'butter', he: '2 כפות חמאה', en: '2 tbsp butter' },
      { canon: 'baking powder', he: '1 כפית אבקת אפייה', en: '1 tsp baking powder' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
      { canon: 'black pepper', he: '1/4 כפית פלפל שחור', en: '1/4 tsp black pepper' },
    ],
    stepsHe: (cook) => [
      'מגרדים גבינה לקערה גדולה.',
      'מערבבים קמח, אבקת אפייה, מלח ופלפל.',
      'מוסיפים חלב וביצים לגבינה ומערבבים עד לבלילה אחידה.',
      'מחברים תערובות יבשות ורטובות עד לבלילה סמיכה.',
      `מחממים מחבת עם חמאה על אש בינונית ומטגנים לביבות ${Math.max(10, Math.round(cook / 2))} דקות מכל צד עד הזהבה והיציבות.`,
      'מגישים חם.',
    ],
    stepsEn: (cook) => [
      'Grate cheese into a large bowl.',
      'Whisk flour, baking powder, salt, and pepper.',
      'Add milk and eggs to the cheese and mix until smooth.',
      'Combine wet and dry mixtures into a thick batter.',
      `Warm a pan with butter over medium heat and fry pancakes about ${Math.max(10, Math.round(cook / 2))} minutes per side until golden and set.`,
      'Serve hot.',
    ],
  },
  {
    id: 'dairy_cheese_fritters',
    required: new Set(['flour', 'cheese', 'milk']),
    category: 'dairy',
    preferred: ['cheese'],
    selectionPriority: 20,
    nameHe: 'קציצות גבינה מטוגנות',
    nameEn: 'Fried Cheese Fritters',
    userQuantities: {
      flour: { he: '120 גרם קמח', en: '120 g flour' },
      cheese: { he: '250 גרם גבינה', en: '250 g cheese' },
      milk: { he: '80 מ"ל חלב', en: '80 ml milk' },
    },
    pantryStaples: [
      { canon: 'egg', he: '2 ביצים', en: '2 eggs' },
      { canon: 'butter', he: '3 כפות חמאה', en: '3 tbsp butter' },
      { canon: 'baking powder', he: '1 כפית אבקת אפייה', en: '1 tsp baking powder' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
      { canon: 'black pepper', he: '1/4 כפית פלפל שחור', en: '1/4 tsp black pepper' },
    ],
    stepsHe: (cook) => [
      'מגרדים גבינה ומערבבים עם קמח, אבקת אפייה, מלח ופלפל.',
      'מוסיפים חלב וביצים ומערבבים עד לתערובת סמיכה.',
      'מחממים שמן וחמאה במחבת על אש בינונית-גבוהה.',
      `יוצרים קציצות, מטגנים ${Math.max(8, Math.round(cook / 2))} דקות מכל צד עד פריך וזהוב.`,
      'מניחים על נייר ספיגה לרגע, מגישים חם.',
    ],
    stepsEn: (cook) => [
      'Grate cheese and mix with flour, baking powder, salt, and pepper.',
      'Add milk and eggs; stir until a thick batter forms.',
      'Heat oil and butter in a pan over medium-high heat.',
      `Shape fritters and fry about ${Math.max(8, Math.round(cook / 2))} minutes per side until crisp and golden.`,
      'Drain briefly on paper towels and serve hot.',
    ],
  },
  {
    id: 'dairy_cheese_skillet_crepes',
    required: new Set(['flour', 'cheese', 'milk']),
    category: 'dairy',
    preferred: ['milk'],
    selectionPriority: 16,
    nameHe: 'חביתת גבינה במחבת',
    nameEn: 'Cheese Skillet Crepes',
    userQuantities: {
      flour: { he: '180 גרם קמח', en: '180 g flour' },
      cheese: { he: '180 גרם גבינה', en: '180 g cheese' },
      milk: { he: '250 מ"ל חלב', en: '250 ml milk' },
    },
    pantryStaples: [
      { canon: 'egg', he: '3 ביצים', en: '3 eggs' },
      { canon: 'butter', he: '2 כפות חמאה', en: '2 tbsp butter' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
      { canon: 'black pepper', he: '1/4 כפית פלפל שחור', en: '1/4 tsp black pepper' },
    ],
    stepsHe: (cook) => [
      'מערבבים קמח, מלח ופלפל בקערה.',
      'מוסיפים חלב וביצים ומקציפים עד לבלילה חלקה.',
      'מחממים מחבת עם חמאה על אש בינונית.',
      `יוצקים בלילה דקה, מפזרים גבינה מגורדת ומטגנים ${Math.max(10, Math.round(cook / 2))} דקות עד שהחביתה יציבה וזהובה.`,
      'קופפים בזהירות, מגישים חם.',
    ],
    stepsEn: (cook) => [
      'Whisk flour, salt, and pepper in a bowl.',
      'Add milk and eggs; whisk until smooth.',
      'Warm a pan with butter over medium heat.',
      `Pour a thin layer of batter, scatter grated cheese, and cook about ${Math.max(10, Math.round(cook / 2))} minutes until set and golden.`,
      'Fold carefully and serve hot.',
    ],
  },
]

export function buildMealIngredientList(
  pattern,
  filteredUserIngredients,
  displayNames,
  { language = 'he', pantryLabel = getBasicPantryLabel(language) } = {},
) {
  if (!pattern) return []

  const userCanons = canonizeList(filteredUserIngredients)
  const lines = []
  const addedCanons = new Set()

  const userOrder = [...(pattern.required ?? new Set())]
  for (const extra of filteredUserIngredients) {
    const canon = canonicalIngredient(extra)
    if (canon && !userOrder.includes(canon)) userOrder.push(canon)
  }

  for (const canon of userOrder) {
    if (!userCanons.has(canon) && !(canon === 'egg' && userCanons.has('eggs'))) continue
    const preset = pattern.userQuantities?.[canon]
    if (preset) {
      lines.push(language === 'en' ? preset.en : preset.he)
    } else {
      const label = labelForCanon(canon, displayNames, filteredUserIngredients, language)
      lines.push(language === 'he' ? `1 ${label}` : `1 ${label}`)
    }
    addedCanons.add(canon)
    if (canon === 'egg') addedCanons.add('eggs')
    if (canon === 'eggs') addedCanons.add('egg')
  }

  for (const staple of pattern.pantryStaples ?? []) {
    if (userHasCanon(userCanons, staple.canon)) continue
    const line = language === 'en' ? staple.en : staple.he
    lines.push(`${line} ${pantryLabel}`.trim())
  }

  return lines
}

export function rankMealPatterns(
  userCanons,
  { category = 'dairy', language = 'he', excludeTitles = [], excludeTemplateKeys = [] } = {},
) {
  const ranked = []
  for (const pattern of REALISTIC_MEAL_PATTERNS) {
    if (pattern.category && pattern.category !== category) continue
    if (excludeTemplateKeys.includes(pattern.id)) continue
    if (isExcludedMealTitle(pattern, language, excludeTitles)) continue
    const score = scoreMealPattern(pattern, userCanons)
    if (score == null) continue
    ranked.push({ pattern, score })
  }
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return (b.pattern.selectionPriority ?? 0) - (a.pattern.selectionPriority ?? 0)
  })
  return ranked
}

export function getBestMealPattern(
  userIngredientsRaw,
  { category = 'dairy', language = 'he', excludeTitles = [], excludeTemplateKeys = [] } = {},
) {
  const userIngredients = Array.isArray(userIngredientsRaw)
    ? userIngredientsRaw
    : parseUserIngredients(userIngredientsRaw)
  if (!userIngredients.length) return null

  const canons = canonizeList(userIngredients)
  const ranked = rankMealPatterns(canons, { category, language, excludeTitles, excludeTemplateKeys })
  return ranked[0]?.pattern ?? null
}

export function buildRealisticMealFromPattern(
  pattern,
  {
    filteredUserIngredients = [],
    displayNames = [],
    language = 'he',
    cookingTime = 30,
    pantryLabel = getBasicPantryLabel(language),
    servings = 4,
  } = {},
) {
  const cook = Math.min(cookingTime, Math.max(12, Math.round(cookingTime / 2)))
  const name = language === 'en' ? pattern.nameEn : pattern.nameHe
  const ingredients = buildMealIngredientList(pattern, filteredUserIngredients, displayNames, {
    language,
    pantryLabel,
  })
  const steps = language === 'en' ? pattern.stepsEn(cook) : pattern.stepsHe(cook)

  const base = {
    name,
    description: '',
    ingredients,
    steps,
    matchPercentage: 90,
    spiceLevel: 0,
    nutrition: { servings },
    tags: ['comfortFood'],
  }

  const quantified = applyRecipeQuantities(base, {
    language,
    recipeType: 'meal',
    servings,
    preserveOriginalSteps: true,
  })

  return {
    name: quantified.name ?? name,
    ingredients: quantified.ingredients ?? ingredients,
    steps: quantified.steps ?? steps,
    nutrition: quantified.nutrition,
    healthScore: quantified.healthScore,
  }
}
