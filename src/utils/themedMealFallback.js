/** Local Hebrew fallback for themed meals when the API is unavailable. */

import { buildLocalThemedMealUpgrade, sanitizeThemedMealUpgrade } from './upgradeContentQuality'
import { normalizeThemedMealContent } from './hebrewDisplayText'

export { buildLocalThemedMealUpgrade, sanitizeThemedMealUpgrade }

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

const CATEGORY_LABELS = {
  dairy: 'חלבי',
  meat: 'בשרי',
  parve: 'פרווה',
}

function resolveThemeLabel(theme, customTheme = '') {
  if (theme === 'other') {
    const custom = String(customTheme ?? '').trim()
    return custom || THEME_LABELS.other
  }
  return THEME_LABELS[theme] ?? theme
}

export function isValidThemedMeal(meal) {
  if (!meal || typeof meal !== 'object') return false
  return Boolean(
    String(meal.mealTitle ?? '').trim() &&
      String(meal.description ?? '').trim() &&
      String(meal.starter ?? '').trim() &&
      String(meal.main ?? '').trim() &&
      String(meal.dessert ?? '').trim() &&
      Array.isArray(meal.sides) &&
      meal.sides.some((item) => String(item ?? '').trim()) &&
      Array.isArray(meal.drinks) &&
      meal.drinks.some((item) => String(item ?? '').trim()) &&
      Array.isArray(meal.servingIdeas) &&
      meal.servingIdeas.some((item) => String(item ?? '').trim()) &&
      Array.isArray(meal.hostingTips) &&
      meal.hostingTips.some((item) => String(item ?? '').trim()),
  )
}

export function buildLocalThemedMeal({
  theme = 'friday_dinner',
  customTheme = '',
  category = 'parve',
  isGlutenFree = false,
}) {
  const themeLabel = resolveThemeLabel(theme, customTheme)
  const gf = isGlutenFree ? ' ללא גלוטן' : ''
  const cat = CATEGORY_LABELS[category] ?? CATEGORY_LABELS.parve

  let starter
  let main
  let dessert

  if (category === 'meat') {
    starter = `סלט עגבניות ומלפפון עם 1 כף שמן זית${gf}`
    main = `מנה בשרית (עוף/בקר) עם 1 כפית פפריקה ו-2 שיני שום — ${themeLabel}${gf}`
    dessert = `2 תפוחים חתוכים + 1 כף דבש לכל 4 מנות${gf}`
  } else if (category === 'dairy') {
    starter = `סלט ירקות עם 100 גרם פטה ו-2 כפות אגוזי מלך${gf}`
    main = `פסטה / מנה חלבית עם 100 מ"ל שמנת — ${themeLabel}${gf}`
    dessert = `150 גרם גבינה לבנה + 2 כפות סוכר — 4 מנות${gf}`
  } else {
    starter = `סלט ירקות צבעוני עם 120 גרם חומוס ו-1 כף שמן${gf}`
    main = `קוסקוס או אורז עם ירקות — ${themeLabel}${gf}`
    dessert = `פירות חתוכים + 2 כפות סילאן + 1 כף קוקוס${gf}`
  }

  return normalizeThemedMealContent(
    {
      mealTitle: `ארוחת ${themeLabel}`,
      description: `תפריט ${cat}${gf} ל-${themeLabel}: מנה ראשונה, עיקרית, תוספות, קינוח ומשקאות.`,
      starter,
      main,
      sides: [
        `1 כוס קוסקוס או אורז יבש + 2 כפות שמן${gf}`,
        `4 פיתות + 50 גרם טחינה או חמאה${gf}`,
      ],
      dessert,
      drinks: [
        'מים מינרליים — 1.5 ליטר ל-4 סועדים',
        'שתייה: 1 ליטר מים + מיץ 3 לימונים + 3 כפות סוכר',
      ],
      servingIdeas: [
        'הגישו מנה ראשונה ב-4 קעריות — 150 מ"ל בכל קערית.',
        'העיקרית ב-4 צלחות — 1 כף שמן מעל כל מנה לפני הגשה.',
      ],
      hostingTips: [
        'הכינו תוספות 30 דקות לפני האורחים — חימום 5 דקות בלבד.',
        'הציבו קערית 200 מ"ל עם 150 גרם חמאה ו-100 גרם מלח גס ליד הלחם.',
      ],
    },
    'he',
  )
}
