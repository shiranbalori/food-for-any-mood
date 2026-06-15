/**
 * Recipe coherence checks: user ingredients, title quality, home-cooking language.
 */

import { ingredientsMatch } from '../data/ingredientKnowledge'
import { parseUserIngredients } from './ingredientRelevance'
import { validateTitleGrounding } from './recipeGrounding'
import { isLiteralIngredientTitle } from './recipeTitle'
import { hasUnnaturalStepPhrasing } from './recipeStepWording'
import { validateRecipeRelevance } from './ingredientRelevance'

const GENERIC_TITLE_PATTERNS = [
  /מנה ביתית|קסם במחבת|מהמטבח|ביתית מהמטבח|מתכון ביתי(?!$)/i,
  /חביתה מהירה עם וניל|עם וניל/i,
  /homestyle|kitchen magic|house special/i,
  /quick\s+.*\s+vanilla/i,
]

const FORBIDDEN_TITLE_TERMS = [/וניל/i, /\bvanilla\b/i]

export function isGenericRecipeTitle(title, userIngredients = []) {
  const text = String(title ?? '').trim()
  if (!text) return true
  if (GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(text))) return true
  if (
    userIngredients.length > 0 &&
    FORBIDDEN_TITLE_TERMS.some((pattern) => pattern.test(text)) &&
    !userIngredients.some((item) => /וניל|vanilla/i.test(item))
  ) {
    return true
  }
  if (
    userIngredients.length > 0 &&
    !/אפויים|מקורמל|בשמנת|סלט|שקשוק|חבית|עוגת|מאפינס|מרק|פסטה|קרמ|כיכר|פנקייק|לביבות|קרפ/i.test(
      text,
    ) &&
    isLiteralIngredientTitle(text, userIngredients, 'he')
  ) {
    return true
  }
  return false
}

export function findMissingUserIngredientsInRecipe(userIngredients, recipe) {
  const ingredients = recipe?.ingredients ?? []
  return userIngredients.filter(
    (userIng) => !ingredients.some((line) => ingredientsMatch(line, userIng)),
  )
}

export function validateRecipeCoherence(userIngredients, recipe, language = 'he') {
  const title = recipe?.name ?? ''
  const grounding = validateTitleGrounding(title, recipe?.ingredients ?? [], userIngredients, language)
  const relevance = validateRecipeRelevance(userIngredients, recipe)
  const missingInList = findMissingUserIngredientsInRecipe(userIngredients, recipe)
  const genericTitle = userIngredients.length > 0 && isGenericRecipeTitle(title, userIngredients)
  const unnaturalSteps = hasUnnaturalStepPhrasing(recipe?.steps ?? [], language)

  const failures = []
  if (userIngredients.length && missingInList.length) failures.push('missing_user_ingredients')
  if (userIngredients.length && !relevance.titleHasIngredient) failures.push('title_missing_ingredient')
  if (userIngredients.length && !grounding.ok) failures.push('title_grounding')
  if (genericTitle) failures.push('generic_title')
  if (unnaturalSteps.length) failures.push('unnatural_steps')

  return {
    ok: failures.length === 0,
    failures,
    missingInList,
    grounding,
    relevance,
    genericTitle,
    unnaturalSteps,
  }
}
