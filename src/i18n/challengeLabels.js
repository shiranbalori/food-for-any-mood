/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} hint
 */
export function translateChallengeCategoryHint(t, hint) {
  if (!hint || hint === 'none') {
    return t('challengeCategoryNone')
  }
  return t(`challengeCategory.${hint}`)
}

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} recipeType
 */
export function translateRecipeTypeLabel(t, recipeType) {
  const type = recipeType || 'meal'
  return t(`recipeTypes.${type}`)
}
