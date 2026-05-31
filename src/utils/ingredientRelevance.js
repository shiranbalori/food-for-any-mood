import { ingredientsMatch, normalizeIngredient } from '../data/ingredientKnowledge'

/** Minimum share of user ingredients that must appear in the recipe. */
export const MIN_INGREDIENT_MATCH_RATIO = 0.7

export function parseUserIngredients(raw) {
  if (!raw || !String(raw).trim()) return []
  return String(raw)
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function ingredientAppearsInText(userIng, text) {
  if (!userIng || !text) return false
  if (ingredientsMatch(userIng, text)) return true

  const normalizedText = normalizeIngredient(text)
  const normalizedUser = normalizeIngredient(userIng)
  if (!normalizedUser || !normalizedText) return false

  if (normalizedText.includes(normalizedUser) || normalizedUser.includes(normalizedText)) {
    return true
  }

  const userWords = normalizedUser.split(/\s+/).filter((word) => word.length > 2)
  return userWords.some((word) => normalizedText.includes(word))
}

/**
 * Compare user ingredients against recipe name, description, ingredients, and steps.
 */
export function countRecipeMatches(userIngredients, recipe) {
  if (!userIngredients.length) {
    return { matched: [], unmatched: [], matchRatio: 1, matchedCount: 0, total: 0 }
  }

  const recipeTexts = [
    recipe.name ?? '',
    recipe.description ?? '',
    ...(recipe.ingredients ?? []),
    ...(recipe.steps ?? []),
  ]

  const matched = []
  const unmatched = []

  for (const userIng of userIngredients) {
    const found = recipeTexts.some((text) => ingredientAppearsInText(userIng, text))
    if (found) matched.push(userIng)
    else unmatched.push(userIng)
  }

  return {
    matched,
    unmatched,
    matchRatio: matched.length / userIngredients.length,
    matchedCount: matched.length,
    total: userIngredients.length,
  }
}

export function titleContainsUserIngredient(userIngredients, recipeName) {
  if (!userIngredients.length) return true
  if (!recipeName) return false
  return userIngredients.some((ui) => ingredientAppearsInText(ui, recipeName))
}

/**
 * @returns {{ ok: boolean, matchRatio: number, titleHasIngredient: boolean, matched: string[], unmatched: string[] }}
 */
/**
 * Authoritative match score: share of user ingredients used anywhere in the recipe.
 */
export function computeUserIngredientMatchPercent(userIngredients, recipe) {
  if (!userIngredients.length) return 0
  const { matchRatio } = countRecipeMatches(userIngredients, recipe)
  return Math.round(matchRatio * 100)
}

export function validateRecipeRelevance(userIngredients, recipe) {
  if (!userIngredients.length) {
    return { ok: true, matchRatio: 1, titleHasIngredient: true, matched: [], unmatched: [] }
  }

  const { matched, unmatched, matchRatio } = countRecipeMatches(userIngredients, recipe)
  const titleHasIngredient = titleContainsUserIngredient(userIngredients, recipe.name)
  const ok = matchRatio >= MIN_INGREDIENT_MATCH_RATIO && titleHasIngredient

  return { ok, matchRatio, titleHasIngredient, matched, unmatched }
}
