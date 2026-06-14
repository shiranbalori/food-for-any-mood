/**
 * Real-world soup/stew recipe construction for ingredient-based fallback.
 */

import { canonicalIngredient, ingredientsMatch } from '../data/ingredientKnowledge'
import { getIngredientLabel } from '../data/ingredientLabels'
import { applyRecipeQuantities } from './recipeQuantities'
import { parseUserIngredients } from './ingredientRelevance'
import {
  getBasicPantryLabel,
  scoreDessertPattern as scoreSoupPattern,
} from './dessertRecipeBuilder'
import { getBestRankedPattern, rankRealisticPatterns } from './recipePatternEngine'

function userHasCanon(userCanons, canon) {
  if (userCanons.has(canon)) return true
  if (canon === 'egg' && userCanons.has('eggs')) return true
  if (canon === 'eggs' && userCanons.has('egg')) return true
  if (canon === 'lentil' && userCanons.has('lentils')) return true
  if (canon === 'lentils' && userCanons.has('lentil')) return true
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

function isExcludedSoupTitle(pattern, language, excludeTitles = []) {
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
export const REALISTIC_SOUP_PATTERNS = [
  {
    id: 'vegan_lentil_tomato_soup',
    required: new Set(['tomato']),
    requiredAny: ['lentil', 'lentils'],
    category: 'parve',
    selectionPriority: 26,
    nameHe: 'מרק עדשים ועגבניות',
    nameEn: 'Lentil and Tomato Soup',
    userQuantities: {
      tomato: { he: '3 עגבניות', en: '3 tomatoes' },
      lentils: { he: '1 כוס עדשים', en: '1 cup lentils' },
      lentil: { he: '1 כוס עדשים', en: '1 cup lentils' },
    },
    pantryStaples: [
      { canon: 'onion', he: '1 בצל', en: '1 onion' },
      { canon: 'carrot', he: '1 גזר', en: '1 carrot' },
      { canon: 'oil', he: '2 כפות שמן', en: '2 tbsp oil' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
    ],
    stepsHe: (cook) => [
      'קוצצים בצל, גזר ועגבניות.',
      'מחממים שמן בסיר ומטגנים בצל וגזר 3–4 דקות.',
      'מוסיפים עגבניות, עדשים ומים, מרתיחים.',
      `מבשלים על אש נמוכה ${Math.max(20, Math.round(cook * 0.8))} דקות עד שהעדשים רכות.`,
      'מתבלים במלח, מערבבים ומגישים חם.',
    ],
    stepsEn: (cook) => [
      'Chop the onion, carrot, and tomatoes.',
      'Sauté onion and carrot in oil for 3–4 minutes.',
      'Add tomatoes, lentils, and water; bring to a boil.',
      `Simmer about ${Math.max(20, Math.round(cook * 0.8))} minutes until lentils are tender.`,
      'Season with salt, stir, and serve hot.',
    ],
  },
  {
    id: 'vegan_lentil_stew',
    required: new Set(['tomato']),
    requiredAny: ['lentil', 'lentils'],
    category: 'parve',
    selectionPriority: 22,
    nameHe: 'תבשיל עדשים ועגבניות',
    nameEn: 'Lentil and Tomato Stew',
    userQuantities: {
      tomato: { he: '3 עגבניות', en: '3 tomatoes' },
      lentils: { he: '1 כוס עדשים', en: '1 cup lentils' },
      lentil: { he: '1 כוס עדשים', en: '1 cup lentils' },
    },
    pantryStaples: [
      { canon: 'onion', he: '1 בצל', en: '1 onion' },
      { canon: 'carrot', he: '1 גזר', en: '1 carrot' },
      { canon: 'oil', he: '2 כפות שמן', en: '2 tbsp oil' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
    ],
    stepsHe: (cook) => [
      'קוצצים בצל, גזר ועגבניות.',
      'מחממים שמן בסיר ומטגנים בצל וגזר 3–4 דקות.',
      'מוסיפים עגבניות, עדשים ומים, מרתיחים.',
      `מבשלים על אש נמוכה ${Math.max(20, Math.round(cook * 0.8))} דקות עד שהעדשים רכות.`,
      'מתבלים במלח, מערבבים ומגישים חם.',
    ],
    stepsEn: (cook) => [
      'Chop the onion, carrot, and tomatoes.',
      'Sauté onion and carrot in oil for 3–4 minutes.',
      'Add tomatoes, lentils, and water; bring to a boil.',
      `Simmer about ${Math.max(20, Math.round(cook * 0.8))} minutes until lentils are tender.`,
      'Season with salt, stir, and serve hot.',
    ],
  },
  {
    id: 'parve_tomato_rice_soup',
    category: 'parve',
    selectionPriority: 18,
    nameHe: 'מרק אורז ועגבניות',
    nameEn: 'Tomato Rice Soup',
    userQuantities: {
      tomato: { he: '3 עגבניות', en: '3 tomatoes' },
      rice: { he: '1/2 כוס אורז', en: '1/2 cup rice' },
    },
    pantryStaples: [
      { canon: 'onion', he: '1 בצל', en: '1 onion' },
      { canon: 'oil', he: '2 כפות שמן', en: '2 tbsp oil' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
    ],
    stepsHe: (cook) => [
      'מחממים שמן בסיר ומטגנים בצל עד שקוף.',
      'מוסיפים עגבניות קצוצות, אורז ומים, מרתיחים.',
      `מבשלים ${Math.max(18, Math.round(cook * 0.75))} דקות עד שהאורז רך.`,
      'טועמים ומגישים חם.',
    ],
    stepsEn: (cook) => [
      'Sauté onion in oil until translucent.',
      'Add tomatoes, rice, and water; bring to a boil.',
      `Simmer about ${Math.max(18, Math.round(cook * 0.75))} minutes until rice is tender.`,
      'Season and serve hot.',
    ],
  },
]

export function buildSoupIngredientList(
  pattern,
  filteredUserIngredients,
  displayNames,
  { language = 'he', pantryLabel = getBasicPantryLabel(language) } = {},
) {
  if (!pattern) return []

  const userCanons = canonizeList(filteredUserIngredients)
  const lines = []

  const userOrder = [...(pattern.required ?? new Set())]
  for (const extra of filteredUserIngredients) {
    const canon = canonicalIngredient(extra)
    if (canon && !userOrder.includes(canon)) userOrder.push(canon)
  }

  for (const canon of userOrder) {
    if (!userHasCanon(userCanons, canon)) continue
    const preset = pattern.userQuantities?.[canon]
    if (preset) {
      lines.push(language === 'en' ? preset.en : preset.he)
    } else {
      const label = labelForCanon(canon, displayNames, filteredUserIngredients, language)
      lines.push(language === 'he' ? `1 ${label}` : `1 ${label}`)
    }
  }

  for (const staple of pattern.pantryStaples ?? []) {
    if (userHasCanon(userCanons, staple.canon)) continue
    const line = language === 'en' ? staple.en : staple.he
    lines.push(`${line} ${pantryLabel}`.trim())
  }

  return lines
}

export function rankSoupPatterns(
  userCanons,
  {
    category = 'any',
    language = 'he',
    excludeTitles = [],
    excludeTemplateKeys = [],
    excludeCookingMethods = [],
  } = {},
) {
  return rankRealisticPatterns(REALISTIC_SOUP_PATTERNS, userCanons, scoreSoupPattern, {
    category,
    language,
    excludeTitles,
    excludeTemplateKeys,
    excludeCookingMethods,
    isExcludedTitle: isExcludedSoupTitle,
  })
}

export function getBestSoupPattern(
  userIngredientsRaw,
  {
    category = 'any',
    language = 'he',
    excludeTitles = [],
    excludeTemplateKeys = [],
    excludeCookingMethods = [],
  } = {},
) {
  const userIngredients = Array.isArray(userIngredientsRaw)
    ? userIngredientsRaw
    : parseUserIngredients(userIngredientsRaw)
  if (!userIngredients.length) return null

  const canons = canonizeList(userIngredients)
  const ranked = rankSoupPatterns(canons, {
    category,
    language,
    excludeTitles,
    excludeTemplateKeys,
    excludeCookingMethods,
  })
  return getBestRankedPattern(ranked)
}

export function buildRealisticSoupFromPattern(
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
  const cook = Math.min(cookingTime, Math.max(20, Math.round(cookingTime * 0.85)))
  const name = language === 'en' ? pattern.nameEn : pattern.nameHe
  const ingredients = buildSoupIngredientList(pattern, filteredUserIngredients, displayNames, {
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
    spiceLevel: 1,
    nutrition: { servings },
    tags: ['comfortFood'],
  }

  const quantified = applyRecipeQuantities(base, {
    language,
    recipeType: 'soup_stew',
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
