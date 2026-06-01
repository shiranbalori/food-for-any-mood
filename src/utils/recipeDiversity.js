/**
 * Detect and enforce genuinely different recipes on regeneration.
 */

import {
  buildDessertDishTitle,
  isDuplicateDessertTitle,
  pickPrimaryFlavorLabel,
} from './dessertDishTitle'
import {
  formatEnglishStepIngredientList,
  formatHebrewStepIngredientList,
  toStepIngredientReference,
} from './recipeStepWording'
import { canonicalIngredient } from '../data/ingredientKnowledge'

function normalizeTitle(title) {
  return String(title ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

const COOKING_METHOD_RULES = [
  { id: 'baked', patterns: [/קרם אפוי/i, /\bbaked\b/i, /בתנור/i, /אופ(?:ים|ה|י(?:ה|ים))/i, /\boven\b/i] },
  { id: 'chilled', patterns: [/מוס/i, /\bmousse\b/i, /קר(?:ה|ים)/i, /ללא אפייה/i, /\bno[- ]?bake\b/i, /\bchill/i] },
  { id: 'pancake', patterns: [/פנקייק/i, /חבית(?:י)?(?:ת|ות)?/i, /\bpancake/i] },
  { id: 'pudding', patterns: [/פודינג/i, /\bpudding/i] },
  { id: 'fried', patterns: [/מטוג(?:ן|נ)/i, /\bfry|\bfried/i, /במחבת/i] },
  { id: 'boiled', patterns: [/מרתיח/i, /מבשל/i, /\bboil|\bsimmer/i] },
  { id: 'cream', patterns: [/קרם(?! אפוי)/i, /\bcream\b/i] },
]

const DESSERT_CATEGORY_RULES = [
  { id: 'baked_custard', patterns: [/קרם אפוי/i, /flan/i, /crème brûlée/i] },
  { id: 'mousse', patterns: [/מוס/i, /\bmousse/i] },
  { id: 'pancake', patterns: [/פנקייק/i, /חבית/i, /\bpancake/i] },
  { id: 'pudding', patterns: [/פודינג/i, /\bpudding/i] },
  { id: 'cake', patterns: [/עוג(?:ה|יות)/i, /\bcake/i] },
  { id: 'cookies', patterns: [/עוגיות/i, /ביסקוויט/i, /\bcookie/i] },
  { id: 'cream', patterns: [/קרם/i, /\bcream/i] },
  { id: 'brownie', patterns: [/בראוניז/i, /\bbrownie/i] },
  { id: 'ice_cream', patterns: [/גלידה/i, /\bice cream/i] },
]

function matchRule(text, rules) {
  const haystack = String(text ?? '')
  for (const rule of rules) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) {
      return rule.id
    }
  }
  return null
}

export function detectCookingMethod(recipe) {
  const title = recipe?.name ?? ''
  const stepsText = (recipe?.steps ?? []).join('\n')
  return matchRule(`${title}\n${stepsText}`, COOKING_METHOD_RULES) ?? 'general'
}

export function detectDessertCategory(recipe) {
  const title = recipe?.name ?? ''
  const stepsText = (recipe?.steps ?? []).join('\n')
  return matchRule(`${title}\n${stepsText}`, DESSERT_CATEGORY_RULES) ?? 'general'
}

export function isDuplicateTitle(title, excludeTitles = []) {
  const normalized = normalizeTitle(title)
  return excludeTitles.some((item) => normalizeTitle(item) === normalized)
}

export function validateRecipeDiversity(recipe, {
  recipeType = 'meal',
  excludeTitles = [],
  excludeCookingMethods = [],
  excludeDessertCategories = [],
} = {}) {
  const failures = []
  const cookingMethod = detectCookingMethod(recipe)
  const dessertCategory = recipeType === 'dessert' ? detectDessertCategory(recipe) : null

  if (excludeTitles.length && isDuplicateTitle(recipe?.name, excludeTitles)) {
    failures.push('duplicate_title')
  }
  if (
    excludeCookingMethods.length &&
    excludeCookingMethods.includes(cookingMethod) &&
    cookingMethod !== 'general'
  ) {
    failures.push('duplicate_cooking_method')
  }
  if (
    recipeType === 'dessert' &&
    excludeDessertCategories.length &&
    dessertCategory &&
    excludeDessertCategories.includes(dessertCategory) &&
    dessertCategory !== 'general'
  ) {
    failures.push('duplicate_dessert_category')
  }

  return {
    ok: failures.length === 0,
    failures,
    cookingMethod,
    dessertCategory,
  }
}

const DESSERT_STEP_VARIANTS = [
  {
    id: 'mousse',
    category: 'mousse',
    method: 'chilled',
    stepsHe: (main, mins) => [
      `מכניסים את ${main} לקערה ומקציפים בעזרת מערבל ידני עד לתערובת קלילה.`,
      'מוסיפים את שאר המרכיבים ומערבבים בעדינות עד לקבלת מרקם אחיד.',
      `מעבירים לקערות הגשה ומקררים במקרר כ-${mins} דקות עד שהמוס מתייצב.`,
      'מגישים קר.',
    ],
    stepsEn: (main, mins) => [
      `Whip ${main} in a bowl until light and airy.`,
      'Fold in the remaining ingredients gently until smooth.',
      `Chill in serving cups for about ${mins} minutes until set.`,
      'Serve cold.',
    ],
  },
  {
    id: 'pancake',
    category: 'pancake',
    method: 'fried',
    stepsHe: (main, mins) => [
      `מערבבים את ${main} עם שאר המרכיבים בקערה עד לבלילה חלקה.`,
      'מחממים מחבת על אש בינונית ומשמנים קלות.',
      `מוזגים כף גדולה לכל פנקייק ומטגנים כ-${Math.max(2, Math.round(mins / 4))} דקות מכל צד עד להזהבה.`,
      'מגישים חם.',
    ],
    stepsEn: (main, mins) => [
      `Mix ${main} with the remaining ingredients until smooth.`,
      'Warm a lightly oiled pan over medium heat.',
      `Cook each pancake for about ${Math.max(2, Math.round(mins / 4))} minutes per side until golden.`,
      'Serve warm.',
    ],
  },
  {
    id: 'pudding',
    category: 'pudding',
    method: 'boiled',
    stepsHe: (main, mins) => [
      `מערבבים את ${main} עם שאר המרכיבים בסיר על אש נמוכה.`,
      `מבשלים תוך ערבוב רציף כ-${mins} דקות עד שהתערובת מסמיכה.`,
      'מעבירים לקערות הגשה ומצננים מעט לפני ההגשה.',
      'מגישים בטמפרטורת החדר או מעט פושר.',
    ],
    stepsEn: (main, mins) => [
      `Combine ${main} with the remaining ingredients in a saucepan over low heat.`,
      `Cook, stirring constantly, for about ${mins} minutes until thickened.`,
      'Pour into serving bowls and cool slightly before serving.',
      'Serve at room temperature or slightly warm.',
    ],
  },
  {
    id: 'baked_custard',
    category: 'baked_custard',
    method: 'baked',
    stepsHe: (main, mins) => [
      `מערבבים את ${main} עם שאר המרכיבים עד לתערובת חלקה.`,
      'יוצקים לתבניות קטנות ומניחים בתוך תבנית עם מים (אמבט מים).',
      `אופים בתנור ב-170°C כ-${mins} דקות עד שהקרם מוצק אך רך.`,
      'מצננים מעט ומגישים.',
    ],
    stepsEn: (main, mins) => [
      `Whisk ${main} with the remaining ingredients until smooth.`,
      'Pour into ramekins and place in a water bath.',
      `Bake at 340°F for about ${mins} minutes until set but tender.`,
      'Cool slightly and serve.',
    ],
  },
  {
    id: 'cream',
    category: 'cream',
    method: 'chilled',
    stepsHe: (main, mins) => [
      `מערבבים את ${main} עם שאר המרכיבים עד לקרם אחיד.`,
      'מעבירים לקערת הגשה ומיישרים את הפני השטח.',
      `מקררים כ-${mins} דקות עד שהקרם מתייצב.`,
      'מגישים קר.',
    ],
    stepsEn: (main, mins) => [
      `Mix ${main} with the remaining ingredients until creamy and smooth.`,
      'Transfer to a serving dish and level the top.',
      `Refrigerate for about ${mins} minutes until set.`,
      'Serve chilled.',
    ],
  },
  {
    id: 'cups',
    category: 'cream',
    method: 'chilled',
    stepsHe: (main, mins) => [
      `מערבבים את ${main} עם שאר המרכיבים עד לקרם אחיד.`,
      'ממלאים כוסות הגשה קטנות בשכבות או בקרם אחיד.',
      `מקררים כ-${mins} דקות עד שהקינוח מתייצב.`,
      'מגישים קר.',
    ],
    stepsEn: (main, mins) => [
      `Mix ${main} with the remaining ingredients until smooth.`,
      'Fill small serving cups with the mixture.',
      `Chill for about ${mins} minutes until set.`,
      'Serve cold.',
    ],
  },
]

export function pickAlternateDessertVariant({
  ingredients = [],
  language = 'he',
  cookingTime = 30,
  excludeTitles = [],
  excludeCookingMethods = [],
  excludeDessertCategories = [],
} = {}) {
  const mins = Math.min(cookingTime, Math.max(15, Math.round(cookingTime * 0.6)))
  const main = pickPrimaryFlavorLabel(ingredients, language)

  const available = DESSERT_STEP_VARIANTS.filter((variant) => {
    const built = buildDessertDishTitle(ingredients, {
      language,
      styleId: variant.id,
      excludeTitles,
      excludeCookingMethods,
      excludeDessertCategories,
    })
    if (isDuplicateDessertTitle(built.name, excludeTitles)) return false
    if (excludeCookingMethods.includes(variant.method)) return false
    if (excludeDessertCategories.includes(variant.category)) return false
    return true
  })

  const variant = available[0] ?? DESSERT_STEP_VARIANTS[0]
  const built = buildDessertDishTitle(ingredients, {
    language,
    styleId: variant.id,
    excludeTitles,
    excludeCookingMethods,
    excludeDessertCategories,
  })
  const steps = language === 'he' ? variant.stepsHe(main, mins) : variant.stepsEn(main, mins)

  return {
    name: built.name,
    steps,
    cookingMethod: variant.method,
    dessertCategory: variant.category,
    styleId: variant.id,
  }
}

function buildIngredientListPhrase(ingredients, language = 'he') {
  const names = (ingredients ?? []).map((item) => String(item ?? '').trim()).filter(Boolean)
  const refs = names.map((name) => toStepIngredientReference(name, language))
  return language === 'he'
    ? formatHebrewStepIngredientList(refs)
    : formatEnglishStepIngredientList(refs)
}

function buildGenericMealSteps(listPhrase, cookingTime, language, style = 'skillet') {
  const mins = Math.min(cookingTime, Math.max(10, Math.round(cookingTime / 2)))
  if (style === 'pot') {
    return language === 'he'
      ? [
          'מחממים סיר על אש בינונית.',
          `מוסיפים את ${listPhrase} ומבשלים יחד תוך ערבוב מדי פעם.`,
          `ממשיכים כ-${mins} דקות עד שהמרכיבים רכים ומשתלבים.`,
          'טועמים, מתבלים לפי הצורך ומגישים חם.',
        ]
      : [
          'Warm a pot over medium heat.',
          `Add ${listPhrase} and cook together, stirring occasionally.`,
          `Continue for about ${mins} minutes until tender and combined.`,
          'Taste, adjust seasoning, and serve hot.',
        ]
  }
  return language === 'he'
    ? [
        'מחממים מחבת על אש בינונית עם מעט שמן.',
        `מוסיפים את ${listPhrase} ומבשלים תוך ערבוב.`,
        `ממשיכים כ-${mins} דקות עד שהמרכיבים משתלבים ומקבלים צבע.`,
        'מגישים חם.',
      ]
    : [
        'Heat a lightly oiled pan over medium heat.',
        `Add ${listPhrase} and cook, stirring often.`,
        `Continue for about ${mins} minutes until combined and fragrant.`,
        'Serve hot.',
      ]
}

function buildPastaEggSteps(listPhrase, cookingTime, language, style = 'homestyle') {
  const pastaMins = Math.min(cookingTime, Math.max(8, Math.round(cookingTime * 0.35)))
  const finishMins = Math.min(cookingTime, Math.max(4, Math.round(cookingTime * 0.2)))
  if (style === 'skillet') {
    return language === 'he'
      ? [
          `מבשלים את הפסטה במים רותחים עם מלח כ-${pastaMins} דקות עד al dente, מסננים ושומרים בצד.`,
          'מחממים מחבת על אש בינונית עם מעט שמן.',
          `מוסיפים את ${listPhrase} למחבת ומבשלים יחד כ-${finishMins} דקות.`,
          'מגישים מיד.',
        ]
      : [
          `Boil the pasta in salted water for about ${pastaMins} minutes until al dente, then drain.`,
          'Warm a pan with a little oil over medium heat.',
          `Add ${listPhrase} to the pan and cook together for about ${finishMins} minutes.`,
          'Serve right away.',
        ]
  }
  if (style === 'rustic') {
    return language === 'he'
      ? [
          `מבשלים את הפסטה במים רותחים עם מלח כ-${pastaMins} דקות עד al dente, מסננים ושומרים מעט ממי הבישול.`,
          `מחזירים את הפסטה לסיר, מוסיפים את ${listPhrase} ומערבבים בעדינות.`,
          `מחממים על אש נמוכה כ-${finishMins} דקות עד שהמנה אחידה.`,
          'מגישים חם.',
        ]
      : [
          `Cook the pasta in salted boiling water for about ${pastaMins} minutes until al dente; drain, reserving a little water.`,
          `Return the pasta to the pot, add ${listPhrase}, and toss gently.`,
          `Warm over low heat for about ${finishMins} minutes until combined.`,
          'Serve hot.',
        ]
  }
  return language === 'he'
    ? [
        `מבשלים את הפסטה במים רותחים עם מלח כ-${pastaMins} דקות עד al dente, מסננים ושומרים בצד.`,
        `מחממים מחבת, מוסיפים את ${listPhrase} ומערבבים.`,
        `מחזירים את הפסטה למחבת ומבשלים יחד כ-${finishMins} דקות.`,
        'מגישים חם.',
      ]
    : [
        `Boil the pasta in salted water for about ${pastaMins} minutes until al dente, then drain.`,
        `Warm a pan, add ${listPhrase}, and stir.`,
        `Return the pasta to the pan and cook together for about ${finishMins} minutes.`,
        'Serve hot.',
      ]
}

export function pickAlternateMealVariant({
  ingredients = [],
  language = 'he',
  cookingTime = 30,
  excludeTitles = [],
  excludeCookingMethods = [],
} = {}) {
  const listPhrase = buildIngredientListPhrase(ingredients, language)
  const set = new Set(
    (ingredients ?? []).map((item) => canonicalIngredient(String(item))).filter(Boolean),
  )
  const hasPasta = set.has('pasta')
  const hasEgg = set.has('egg') || set.has('eggs')
  const variants =
    hasPasta && hasEgg
      ? [
          {
            id: 'pasta-egg-homestyle',
            method: 'general',
            name: language === 'he' ? 'פסטה קרמית בסגנון ביתי' : 'Creamy Homestyle Pasta',
            steps: buildPastaEggSteps(listPhrase, cookingTime, language, 'homestyle'),
          },
          {
            id: 'pasta-egg-skillet',
            method: 'fried',
            name: language === 'he' ? 'פסטה מהירה בשמן זית' : 'Quick Olive Oil Pasta',
            steps: buildPastaEggSteps(listPhrase, cookingTime, language, 'skillet'),
          },
          {
            id: 'pasta-egg-rustic',
            method: 'boiled',
            name: language === 'he' ? 'פסטה עם ביצה מקושקשת' : 'Pasta with Scrambled Egg',
            steps: buildPastaEggSteps(listPhrase, cookingTime, language, 'rustic'),
          },
        ]
      : [
          {
            id: 'meal-skillet',
            method: 'fried',
            name: language === 'he' ? 'מוקפץ ירק מהיר' : 'Quick Vegetable Sauté',
            steps: buildGenericMealSteps(listPhrase, cookingTime, language, 'skillet'),
          },
          {
            id: 'meal-pot',
            method: 'boiled',
            name: language === 'he' ? 'תבשיל ביתי בסיר' : 'Homestyle Pot Stew',
            steps: buildGenericMealSteps(listPhrase, cookingTime, language, 'pot'),
          },
          {
            id: 'meal-pan',
            method: 'general',
            name: language === 'he' ? 'מנה חמה מהמטבח' : 'Warm Kitchen-Style Dish',
            steps: buildGenericMealSteps(listPhrase, cookingTime, language, 'skillet'),
          },
        ]
  const available = variants.filter(
    (variant) =>
      !isDuplicateTitle(variant.name, excludeTitles) &&
      !excludeCookingMethods.includes(variant.method),
  )
  return (
    available[0] ??
    variants.find((variant) => !isDuplicateTitle(variant.name, excludeTitles)) ??
    variants[0]
  )
}

export function buildRegenerationPromptSection({
  language = 'he',
  excludeTitles = [],
  excludeCookingMethods = [],
  excludeDessertCategories = [],
} = {}) {
  if (!excludeTitles.length && !excludeCookingMethods.length && !excludeDessertCategories.length) {
    return ''
  }

  const titles = excludeTitles.filter(Boolean).join(', ')
  const methods = excludeCookingMethods.filter(Boolean).join(', ')
  const categories = excludeDessertCategories.filter(Boolean).join(', ')

  if (language === 'he') {
    return `
כללי יצירת מתכון חדש (חובה — לא לחזור על מתכון קודם):
- צור מנה שונה לגמרי — לא אותו מתכון עם שם אחר.
- אל תחזור על שמות: ${titles || '(אין)'}.
- אל תחזור על שיטת הכנה: ${methods || '(אין)'}.
- אל תחזור על סוג קינוח: ${categories || '(אין)'}.
- השתמש באותם מרכיבים זמינים בלבד, אך בנה מנה אחרת (למשל: אם היה "קרם וניל אפוי" — אפשר "מוס וניל קר", "פנקייק וניל" או "פודינג וניל", אך לא אותה מנה).
- החזר מתכון אחד חדש בלבד.
`
  }

  return `
NEW RECIPE RULES (mandatory — do not repeat a previous dish):
- Create a genuinely different dish — not the same recipe with a new title.
- Do NOT repeat titles: ${titles || '(none)'}.
- Do NOT repeat cooking methods: ${methods || '(none)'}.
- Do NOT repeat dessert categories: ${categories || '(none)'}.
- Use the same available ingredients only, but build a different dish (e.g. if the first was baked vanilla custard, try vanilla mousse, vanilla pancakes, or vanilla pudding — never the same dish).
- Return one new recipe only.
`
}
