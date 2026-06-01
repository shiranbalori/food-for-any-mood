import { parseUserIngredients } from './ingredientRelevance'

/**
 * Structured quality snapshot for debugging recipe generation issues.
 */
export function logRecipeQualitySnapshot({
  userIngredientsRaw = '',
  recipe = null,
  validation = null,
  tags = [],
  source = 'unknown',
} = {}) {
  const normalized = parseUserIngredients(userIngredientsRaw)

  console.group('[recipeQuality] snapshot')
  console.log('source:', source)
  console.log('userIngredientsRaw:', userIngredientsRaw)
  console.log('normalizedIngredients:', normalized)
  console.log('generatedTitle:', recipe?.name ?? null)
  console.log('finalRecipeIngredients:', recipe?.ingredients ?? [])
  console.log('dietaryLabels:', tags.length ? tags : recipe?.tags ?? [])
  console.log('validationPassed:', validation?.ok ?? null)
  console.log('validationResult:', validation?.checks ?? null)
  if (validation?.grounding) {
    console.log('groundingResult:', validation.grounding)
  }
  if (validation?.checks) {
    const failed = Object.entries(validation.checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name)
    console.log('failedChecks:', failed.length ? failed : '(none)')
  }
  if (validation?.unmatched?.length) {
    console.log('unmatchedUserIngredients:', validation.unmatched)
  }
  if (validation?.unnaturalSteps?.length) {
    console.log('unnaturalSteps:', validation.unnaturalSteps)
  }
  console.groupEnd()
}
