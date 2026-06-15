/**
 * Validates that generated recipes name real dishes with coherent ingredients and steps.
 */

import { canonicalIngredient, ingredientsMatch } from '../data/ingredientKnowledge'
import { ingredientAppearsInText } from './ingredientRelevance'
import { findUnauthorizedRecipeIngredients } from './ingredientAllowlist'
import { isGenericRecipeTitle } from './recipeCoherenceValidation'
import { validateRecipeCookingEssentials } from './recipeCookingEssentials'
import { parseAnyLeadingMeasurement } from './measurementUnits'
import { isLiteralIngredientTitle } from './recipeTitle'

const QTY_PREFIX =
  /^\s*(?:\d+(?:\s+\d+\/\d+)?|1\/2|1\/4|1\/3)\s*(?:כפית|כפיות|כף|כפות|גרם|מ"ל|ml|g|cup|cups|tbsp|tsp|כוס|כוסות|יחידה|יחידות|קופס(?:אות|ת)?)/i

const GENERIC_TEMPLATE_TITLES = [
  /^תפוח(?:י)?\s+אדמה\s+עם\s+בצל/i,
  /^טונה\s+עם\s+תירס/i,
  /^פטריות\s+עם\s+שמנת/i,
  /^potato\s+with\s+onion/i,
  /^tuna\s+with\s+corn/i,
  /^mushroom\s+with\s+cream/i,
]

const STAPLE_CANONS = new Set([
  'salt',
  'black pepper',
  'pepper',
  'oil',
  'olive',
  'olive oil',
  'water',
  'garlic',
  'onion',
  'butter',
  'sugar',
  'paprika',
  'cumin',
  'thyme',
  'basil',
  'oregano',
  'parsley',
])

export const REALISM_MOCK_TRIGGER_FAILURES = new Set([
  'literal_title',
  'template_title',
  'generic_title',
  'weak_dish_title',
])

function ingredientLineHasQuantity(line) {
  const text = String(line ?? '').trim()
  if (!text) return false
  if (QTY_PREFIX.test(text)) return true
  if (/^\d+\s/.test(text)) return true
  return Boolean(parseAnyLeadingMeasurement(text)?.amount)
}

function isForbiddenTemplateTitle(title) {
  const text = String(title ?? '').trim()
  if (!text) return true
  return GENERIC_TEMPLATE_TITLES.some((pattern) => pattern.test(text))
}

function isSimpleIngredientTemplateTitle(title, userIngredients, language) {
  if (isForbiddenTemplateTitle(title)) return true
  if (!userIngredients.length) return false
  const text = String(title ?? '').trim()
  if (
    /אפויים|מקורמל|בשמנת|סלט|שקשוק|חבית|עוגת|מאפינס|מרק|פסטה|קרמ|כיכר|פנקייק|לביבות|קרפ/i.test(
      text,
    )
  ) {
    return false
  }
  return isLiteralIngredientTitle(text, userIngredients, language)
}

function isWeakGenericDishTitle(title, userIngredients) {
  if (!userIngredients.length) return false
  const text = String(title ?? '').trim()
  if (!/^(תבשיל|מנה|skillet|stew)\s+/i.test(text)) return false

  const mains = userIngredients
    .map((item) => canonicalIngredient(item))
    .filter((canon) => canon && !STAPLE_CANONS.has(canon))

  if (mains.length < 2) return false
  const mentioned = mains.filter((canon) =>
    userIngredients.some((item) => ingredientAppearsInText(item, text)),
  )
  return mentioned.length <= 1
}

/**
 * @returns {{ ok: boolean, failures: string[] }}
 */
export function validateGeneratedRecipeRealism(
  recipe,
  userIngredients = [],
  { language = 'he', forPatternSelection = false, recipeType = 'meal', dishIdeaDriven = false } = {},
) {
  const failures = []
  const title = recipe?.name ?? ''
  const ingredients = recipe?.ingredients ?? []
  const steps = recipe?.steps ?? []

  if (!title.trim()) failures.push('missing_title')
  if (steps.length < 3) failures.push('too_few_steps')
  if (!ingredients.length) failures.push('missing_ingredients')

  if (isForbiddenTemplateTitle(title)) failures.push('template_title')
  if (isSimpleIngredientTemplateTitle(title, userIngredients, language)) {
    failures.push('literal_title')
  }
  if (!forPatternSelection && isGenericRecipeTitle(title, userIngredients)) {
    failures.push('generic_title')
  }
  if (isWeakGenericDishTitle(title, userIngredients)) failures.push('weak_dish_title')

  if (userIngredients.length && !dishIdeaDriven) {
    const userLinesMissingQty = userIngredients.filter((userIng) => {
      const line = ingredients.find((entry) => ingredientsMatch(entry, userIng))
      return line && !ingredientLineHasQuantity(line)
    })
    if (userLinesMissingQty.length) failures.push('missing_quantity')
  }

  if (userIngredients.length && !dishIdeaDriven) {
    const unmatched = userIngredients.filter(
      (userIng) => !ingredients.some((line) => ingredientsMatch(line, userIng)),
    )
    if (unmatched.length) failures.push('missing_user_ingredients')
  }

  const essentials = validateRecipeCookingEssentials(recipe, { recipeType })
  if (!essentials.ok) {
    failures.push(...essentials.failures)
  }

  return {
    ok: failures.length === 0,
    failures,
  }
}

export function shouldReplaceWithDishPatternRecipe(
  recipe,
  userIngredients = [],
  { language = 'he', selectedCategory = 'any' } = {},
) {
  if (!userIngredients.length) return false
  const realism = validateGeneratedRecipeRealism(recipe, userIngredients, { language })
  if (realism.failures.some((failure) => REALISM_MOCK_TRIGGER_FAILURES.has(failure))) {
    return true
  }
  const unauthorized = findUnauthorizedRecipeIngredients(recipe, userIngredients.join(', '))
  if (unauthorized.length) return true
  if (selectedCategory !== 'dairy' && unauthorized.some((item) => /גבינ|חלב|שמנת|חמאה|cheese|milk|cream|butter/i.test(item))) {
    return true
  }
  return false
}
