/** Map dotted namespaces to existing translation groups when a direct key is missing. */
const NAMESPACE_ALIASES = {
  challengeCategory: 'categories',
  mealType: 'recipeTypes',
}

/** Last-resort labels — never show raw translation keys in the UI. */
const SLUG_FALLBACKS = {
  he: {
    parve: 'פרווה',
    dairy: 'חלבי',
    meat: 'בשרי',
    vegan: 'טבעוני',
    any: 'ללא העדפה',
    none: 'ללא העדפה',
    dessert: 'קינוח',
    meal: 'ארוחה',
    soup_stew: 'מרק/תבשיל',
    breakfast: 'בוקר',
    lunch: 'צהריים',
    dinner: 'ערב',
  },
  en: {
    parve: 'Parve',
    dairy: 'Dairy',
    meat: 'Meat',
    vegan: 'Vegan',
    any: 'No Preference',
    none: 'No Preference',
    dessert: 'Dessert',
    meal: 'Meal',
    soup_stew: 'Soup & Stew',
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
  },
}

/**
 * @param {Record<string, unknown>} dict
 * @param {string} key
 * @returns {string | null}
 */
export function resolveTranslation(dict, key) {
  if (!dict || !key) return null

  if (typeof dict[key] === 'string') return dict[key]

  const parts = key.split('.')
  let value = dict
  for (const part of parts) {
    if (value == null || typeof value !== 'object') {
      value = undefined
      break
    }
    value = value[part]
  }
  if (typeof value === 'string') return value

  if (parts.length >= 2) {
    const [namespace, ...rest] = parts
    const alias = NAMESPACE_ALIASES[namespace]
    if (alias) {
      const aliased = resolveTranslation(dict, `${alias}.${rest.join('.')}`)
      if (aliased) return aliased
    }
  }

  return null
}

/**
 * @param {string} key
 * @param {'he' | 'en'} [language]
 */
export function humanReadableFallback(key, language = 'he') {
  const slug = key.split('.').pop() ?? key
  const lang = language === 'en' ? 'en' : 'he'
  if (SLUG_FALLBACKS[lang][slug]) return SLUG_FALLBACKS[lang][slug]

  return slug
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
