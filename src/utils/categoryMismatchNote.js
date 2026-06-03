/**
 * Note when selected kosher category does not match user ingredients.
 */

export function buildCategoryMismatchNote(selectedCategory, suggestedCategory, language = 'he') {
  if (!selectedCategory || selectedCategory === 'any' || selectedCategory === suggestedCategory) {
    return ''
  }

  const isHe = language === 'he'
  if (isHe) {
    if (selectedCategory === 'dairy' && suggestedCategory === 'parve') {
      return 'המרכיבים שהוזנו לא כוללים מוצרי חלב, לכן נוצר מתכון קרוב יותר מסוג פרווה.'
    }
    if (selectedCategory === 'meat' && suggestedCategory === 'parve') {
      return 'המרכיבים שהוזנו לא כוללים בשר, עוף או דג, לכן נוצר מתכון קרוב יותר מסוג פרווה.'
    }
    if (selectedCategory === 'parve' && suggestedCategory === 'dairy') {
      return 'המרכיבים כוללים מוצרי חלב, לכן המתכון מסווג כחלבי ולא כפרווה.'
    }
    if (selectedCategory === 'parve' && suggestedCategory === 'meat') {
      return 'המרכיבים כוללים בשר, עוף או דג, לכן המתכון מסווג כבשרי ולא כפרווה.'
    }
    return ''
  }

  if (selectedCategory === 'dairy' && suggestedCategory === 'parve') {
    return 'Your ingredients do not include dairy, so we created a parve-style recipe instead.'
  }
  if (selectedCategory === 'meat' && suggestedCategory === 'parve') {
    return 'Your ingredients do not include meat or fish, so we created a parve-style recipe instead.'
  }
  return ''
}
