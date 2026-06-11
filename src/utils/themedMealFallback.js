/** Local Hebrew fallback for themed meals when the API is unavailable. */

import { normalizeThemedMealContent } from './hebrewDisplayText'
import { buildFallbackThemedMeal, isValidThemedMeal } from './themedMealQuality'
import { buildLocalThemedMealUpgrade, sanitizeThemedMealUpgrade } from './upgradeContentQuality'

export { buildLocalThemedMealUpgrade, isValidThemedMeal, sanitizeThemedMealUpgrade }

const THEME_LABELS = {
  friday_dinner: 'ארוחת שישי',
  family_gathering: 'אירוח משפחתי',
  birthday: 'יום הולדת',
  kids_party: 'מסיבת ילדים',
  movie_night: 'ערב סרט',
  picnic: 'פיקניק',
  bbq: 'מנגל',
  romantic_dinner: 'ארוחה רומנטית',
  holiday_meal: 'ארוחת חג',
  rosh_hashanah: 'ראש השנה',
  passover: 'פסח',
  shavuot: 'שבועות',
  hanukkah: 'חנוכה',
  sukkot: 'סוכות',
  summer_party: 'מסיבת קיץ',
  brunch: "בראנץ'",
  other: 'אחר',
}

function resolveThemeLabel(theme, customTheme = '') {
  if (theme === 'other') {
    const custom = String(customTheme ?? '').trim()
    return custom || THEME_LABELS.other
  }
  return THEME_LABELS[theme] ?? theme
}

export function buildLocalThemedMeal({
  theme = 'friday_dinner',
  customTheme = '',
  category = 'parve',
  isGlutenFree = false,
}) {
  const themeLabel = resolveThemeLabel(theme, customTheme)
  return normalizeThemedMealContent(
    buildFallbackThemedMeal(themeLabel, category, isGlutenFree),
    'he',
  )
}
