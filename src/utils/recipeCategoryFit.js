/**
 * Category fit for user ingredients — delegates to recipeGenerationPolicy.js
 *
 * Input: any normal ingredients allowed for any category (adapt at generation time).
 * Output: final recipe must match category (recipeCategoryGuard.js).
 */

export {
  assessCategoryFit,
  assessGenerationFeasibility,
  assessInputCategoryConstraints,
  buildUserIngredientProfile,
  suggestCategoryFromIngredients,
  buildVeganConflictMessage,
} from './recipeGenerationPolicy'

export const CATEGORY_MISMATCH_MESSAGE = {
  he: 'המרכיבים שהוזנו אינם תואמים לקטגוריה שנבחרה',
  en: 'The ingredients you entered do not match the category you selected',
}

const CATEGORY_LABELS = {
  he: { dairy: 'חלבי', meat: 'בשרי', parve: 'פרווה', vegan: 'טבעוני' },
  en: { dairy: 'dairy', meat: 'meat', parve: 'parve', vegan: 'vegan' },
}

export function buildCategoryMismatchMessage(category, language = 'he') {
  const labels = CATEGORY_LABELS[language === 'he' ? 'he' : 'en']
  const label = labels[category]
  if (label) {
    return language === 'he'
      ? `המרכיבים שהוזנו אינם תואמים לקטגוריה ${label}`
      : `The ingredients you entered do not match the ${label} category`
  }
  return language === 'he' ? CATEGORY_MISMATCH_MESSAGE.he : CATEGORY_MISMATCH_MESSAGE.en
}
