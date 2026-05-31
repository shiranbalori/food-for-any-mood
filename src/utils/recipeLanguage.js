import { containsLatinText } from './recipeIngredientParser'

function recipeTextParts(recipe) {
  return [
    recipe?.name ?? '',
    recipe?.description ?? '',
    ...(recipe?.ingredients ?? []),
    ...(recipe?.steps ?? []),
    recipe?.playlist?.name ?? '',
    recipe?.playlist?.description ?? '',
  ]
}

function countHebrewChars(text) {
  const matches = String(text ?? '').match(/[\u0590-\u05FF]/g)
  return matches?.length ?? 0
}

function countLatinWords(text) {
  const matches = String(text ?? '').match(/\b[a-z]{3,}\b/gi)
  return matches?.length ?? 0
}

/**
 * Detect whether recipe content is primarily Hebrew or English.
 * @param {object} recipe
 * @returns {'he' | 'en'}
 */
export function detectRecipeLanguage(recipe) {
  const blob = recipeTextParts(recipe).join(' ')
  const hebrewChars = countHebrewChars(blob)
  const latinWords = countLatinWords(blob)

  const hebrewIngredients = (recipe?.ingredients ?? []).filter(
    (item) => /[\u0590-\u05FF]/.test(item) && !containsLatinText(item),
  ).length
  const englishIngredients = (recipe?.ingredients ?? []).filter((item) =>
    containsLatinText(item),
  ).length

  if (hebrewChars >= 8 || hebrewIngredients > englishIngredients) return 'he'
  if (latinWords >= 3 || englishIngredients > hebrewIngredients) return 'en'
  if (containsLatinText(recipe?.name) && hebrewChars === 0) return 'en'
  return 'he'
}

/**
 * @param {'he' | 'en'} expectedLanguage
 * @param {object} recipe
 */
export function validateRecipeLanguage(expectedLanguage, recipe) {
  return detectRecipeLanguage(recipe) === expectedLanguage
}
