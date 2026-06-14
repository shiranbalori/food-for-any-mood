import { canonicalIngredient, ingredientsMatch, normalizeIngredient } from '../data/ingredientKnowledge'
import { parseUserIngredients } from './ingredientRelevance'
import { stripQuantityPrefix } from './measurementUnits'
import {
  DESSERT_BASIC_PANTRY_CANONICAL,
  isBasicPantryMarkedLine,
  stripBasicPantryLabel,
} from './dessertRecipeBuilder'

/** System pantry items always allowed when the user listed ingredients. */
export const SYSTEM_PANTRY_CANONICAL = new Set([
  'water',
  'salt',
  'black pepper',
  'pepper',
  'oil',
  'olive',
  'olive oil',
  'garlic',
  'onion',
  'baking powder',
  'paprika',
  'cumin',
  'oregano',
  'basil',
  'thyme',
  'cinnamon',
  'nutmeg',
  'ginger',
  'carrot',
  'lentils',
  'lentil',
])

/** Highlights for prompts — not allowed unless the user provided them. */
export const FORBIDDEN_UNLESS_USER_HINTS = [
  'berries',
  'cookies',
  'chocolate',
  'fruits',
  'nuts',
  'cream cheese',
  'yogurt',
  'milk',
  'butter',
]

function userProvidedVanilla(userIngredients) {
  return userIngredients.some((item) => {
    const text = normalizeIngredient(item)
    const canon = canonicalIngredient(item)
    return canon === 'vanilla' || text.includes('vanilla') || text.includes('וניל')
  })
}

export function getSystemPantryItems(userIngredients = []) {
  const items = [
    'water',
    'salt',
    'מלח',
    'black pepper',
    'פלפל שחור',
    'oil',
    'olive oil',
    'שמן זית',
    'שמן',
    'garlic',
    'שום',
    'onion',
    'בצל',
    'baking powder',
  ]
  if (userProvidedVanilla(userIngredients)) {
    items.push('vanilla', 'vanilla extract')
  }
  return items
}

export function isSystemPantryIngredient(name) {
  const canon = canonicalIngredient(stripQuantityPrefix(String(name ?? '')))
  if (!canon) return false
  if (SYSTEM_PANTRY_CANONICAL.has(canon)) return true
  return ['water', 'salt', 'black pepper', 'oil', 'olive oil', 'baking powder'].some((item) =>
    ingredientsMatch(name, item),
  )
}

/**
 * True when a recipe ingredient is allowed for the user's available set.
 * Preference mode (no user ingredients) allows any ingredient.
 */
export function isRecipeIngredientAllowed(recipeLine, userIngredients) {
  if (!userIngredients?.length) return true

  if (userIngredients.some((userIng) => ingredientsMatch(userIng, recipeLine))) {
    return true
  }

  if (isBasicPantryMarkedLine(recipeLine)) {
    const base = stripBasicPantryLabel(stripQuantityPrefix(String(recipeLine ?? '')))
    const canon = canonicalIngredient(base)
    if (canon && DESSERT_BASIC_PANTRY_CANONICAL.has(canon)) return true
    return [...DESSERT_BASIC_PANTRY_CANONICAL].some((item) => ingredientsMatch(base, item))
  }

  return getSystemPantryItems(userIngredients).some((pantryItem) =>
    ingredientsMatch(pantryItem, recipeLine),
  )
}

export function findUnauthorizedRecipeIngredients(recipe, userIngredientsRaw) {
  const userIngredients = parseUserIngredients(userIngredientsRaw)
  if (!userIngredients.length) return []

  const unauthorized = []
  for (const item of recipe.ingredients ?? []) {
    if (!isRecipeIngredientAllowed(item, userIngredients)) {
      unauthorized.push(item)
    }
  }
  return unauthorized
}

export function filterRecipeToAllowedIngredients(recipe, userIngredientsRaw) {
  const userIngredients = parseUserIngredients(userIngredientsRaw)
  if (!userIngredients.length) return recipe

  return {
    ...recipe,
    ingredients: (recipe.ingredients ?? []).filter((item) =>
      isRecipeIngredientAllowed(item, userIngredients),
    ),
    optionalUpgrades: (recipe.optionalUpgrades ?? []).filter((upgrade) =>
      isRecipeIngredientAllowed(upgrade?.ingredient ?? upgrade, userIngredients),
    ),
  }
}
