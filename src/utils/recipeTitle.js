import { getIngredientLabel } from '../data/ingredientLabels'
import { canonicalIngredient } from '../data/ingredientKnowledge'
import { ingredientAppearsInText } from './ingredientRelevance'

const STAPLE_CANONICAL = new Set([
  'salt',
  'pepper',
  'black pepper',
  'oil',
  'olive',
  'olive oil',
  'water',
  'sugar',
])

/** Cooking-style words allowed in titles (not mood). */
const COOKING_STYLE_WORDS = new Set(['מהיר', 'מהירה', 'מוקפץ', 'בתנור', 'בסיר', 'ברוטב'])

/**
 * Titles based on mood, atmosphere, occasion, or feelings — never allowed.
 */
const MOOD_TITLE_PATTERNS = [
  /^ארוח(?:ת|ה)\s+/,
  /ארוח(?:ת|ה)?\s+(?:נרות|נוחות|רגוע(?:ה|ים)?|שמ(?:ה|ים)|חמ(?:ה|ים)|מנח(?:ם|מת)|רומנטית?)/,
  /(?:ערב|בוקר|צהריים)\s+(?:רגוע|רומנטי|שמח|נעים|חמים|מיוחד)/,
  /(?:וייב|vibe)\s*(?:חם|חמים|נעים|רגוע)?/i,
  /\bוייב\b|\bvibe\b/i,
  /^מנה\s+(?:נעימ(?:ה|ים)?|אנרגטית|רגועה|שמחה|מנחמת|מרגיעה|מיוחדת|מושלמת|חמ(?:ה|ימה))/,
  /^(?:cozy|comfort|energetic|adventurous|relaxed|happy|romantic|mood)\b/i,
  /(?:נוחות|רומנטי|נעים(?:ה|ים)?|אנרג(?:יה|ט(?:י|ית))|מצב\s+רוח|good\s+vibes|atmosphere)/i,
  /^מנה\s+ע(?:ם|ל)\s+(?:מרכיבים|הכל)$/,
  /^(?:ערב|בוקר)\s+/,
]

const FORBIDDEN_TITLE_WORDS = [
  'נרות',
  'נוחות',
  'רומנטי',
  'נעים',
  'נעימה',
  'וייב',
  'vibe',
  'cozy',
  'comfort',
  'energetic',
  'adventurous',
  'relaxed',
  'happy',
  'mood',
  'atmosphere',
  'ארוחה',
  'ארוחת',
]

const KNOWN_DISH_PREFIXES = [
  'שקשוקה',
  'חבית',
  'פסטה',
  'סלט',
  'מרק',
  'קארי',
  'אורז',
  'טאקו',
  'קציצ',
  'ריזוטו',
  'מוקפץ',
  'תבשיל',
  'עוף',
  'בשר',
  'טונה',
  'פנקייק',
  'קוביות',
]

function filterMainIngredients(ingredients = []) {
  return ingredients.filter((item) => {
    const canon = canonicalIngredient(item)
    return !canon || !STAPLE_CANONICAL.has(canon)
  })
}

function joinHebrewList(items) {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} ו${items[1]}`
  return `${items.slice(0, -1).join(', ')} ו${items[items.length - 1]}`
}

function inferCookingStyle({ cookingTime, steps = [], tags = [] } = {}) {
  const stepsText = steps.join(' ')

  if (/תנור|אפ(?:י|ה)/i.test(stepsText)) return 'baked'
  if (/מוקפץ|ווק/i.test(stepsText)) return 'stirFry'
  if (/מרק|ציר|בישול איטי|תבשיל/i.test(stepsText)) return 'stew'
  if (/סלט/i.test(stepsText)) return 'salad'
  if (tags.includes('quick') || (cookingTime && cookingTime <= 25)) return 'quick'

  return null
}

function detectDishPattern(mainCanon) {
  const set = new Set(mainCanon)

  if (set.has('tomato') && (set.has('egg') || set.has('eggs'))) {
    if (set.has('onion') || set.has('pepper') || set.has('garlic')) {
      return { type: 'shakshuka' }
    }
    return { type: 'tomatoOmelette' }
  }
  if (set.has('pasta')) return { type: 'pasta' }
  if (set.has('rice')) return { type: 'rice' }
  if ((set.has('egg') || set.has('eggs')) && mainCanon.length >= 2) return { type: 'omelette' }
  if (set.has('tuna') && (set.has('egg') || set.has('eggs'))) return { type: 'tunaSalad' }
  if (set.has('tofu') || set.has('broccoli') || set.has('pepper')) return { type: 'stirFry' }
  if (set.has('lentils') || set.has('curry') || set.has('coconut milk')) return { type: 'curry' }
  if (set.has('chicken')) return { type: 'chicken' }
  if (set.has('beef') || set.has('steak') || set.has('lamb')) return { type: 'meat' }
  if (mainCanon.some((item) => ['cucumber', 'tomato', 'avocado', 'chickpeas'].includes(item))) {
    return { type: 'salad' }
  }

  return { type: 'generic' }
}

function buildPastaTitle(mainNames, mainCanon, cookingStyle) {
  const hasCream = mainCanon.includes('cream')
  const hasMushroom = mainCanon.includes('mushroom')
  const extras = mainNames.filter((name) => !/פסטה|שמנת|פטריות/.test(name))

  if (hasCream && hasMushroom) return 'פסטה ברוטב שמנת ופטריות'
  if (hasCream) return extras.length ? `פסטה ברוטב שמנת ו${joinHebrewList(extras)}` : 'פסטה ברוטב שמנת'
  if (mainNames.length > 1) return `פסטה עם ${joinHebrewList(mainNames.slice(1))}`
  return cookingStyle === 'quick' ? 'פסטה מהירה' : `פסטה עם ${mainNames[0]}`
}

function buildOmeletteTitle(mainNames, mainCanon) {
  const extras = mainNames.filter((name) => !/ביצ/.test(name))
  if (mainCanon.includes('tomato')) return 'חביתת עגבניות'
  if (extras.length === 1) return `חביתת ${extras[0]}`
  if (extras.length > 1) return `חביתה עם ${joinHebrewList(extras)}`
  return 'חביתה'
}

/**
 * Build a Hebrew dish title from main ingredients and cooking style — never mood.
 */
export function buildDescriptiveDishTitle(
  ingredients = [],
  {
    cookingTime,
    steps = [],
    style = null,
    tags = [],
    language = 'he',
  } = {},
) {
  const mains = filterMainIngredients(ingredients).map((item) => {
    if (/[\u0590-\u05FF]/.test(item) && !/[a-z]/i.test(item)) return item.trim()
    return getIngredientLabel(item, language)
  })
  const mainNames = [...new Set(mains)].filter(Boolean).slice(0, 3)
  const mainCanon = mainNames.map((name) => canonicalIngredient(name)).filter(Boolean)
  const cookingStyle = inferCookingStyle({ cookingTime, steps, style, tags })
  const pattern = detectDishPattern(mainCanon)

  if (mainNames.length === 0) {
    return cookingStyle === 'quick' ? 'תבשיל מהיר' : 'תבשיל ביתי'
  }

  const [first, second] = mainNames

  switch (pattern.type) {
    case 'shakshuka':
      return cookingStyle === 'quick' ? 'שקשוקה מהירה' : 'שקשוקה'
    case 'tomatoOmelette':
      return 'חביתת עגבניות'
    case 'pasta':
      return buildPastaTitle(mainNames, mainCanon, cookingStyle)
    case 'rice':
      return second ? `אורז עם ${joinHebrewList(mainNames.slice(1))}` : `אורז עם ${first}`
    case 'omelette':
      return buildOmeletteTitle(mainNames, mainCanon)
    case 'tunaSalad':
      return 'סלט טונה וביצים'
    case 'curry':
      return second ? `קארי ${joinHebrewList(mainNames)}` : `קארי ${first}`
    case 'stirFry':
      return second ? `מוקפץ ${joinHebrewList(mainNames)}` : `מוקפץ ${first}`
    case 'chicken':
      return second ? `עוף עם ${joinHebrewList(mainNames.slice(1))}` : 'עוף בגריל'
    case 'meat':
      return second ? `${first} עם ${joinHebrewList(mainNames.slice(1))}` : `${first} בגריל`
    case 'salad':
      return `סלט ${joinHebrewList(mainNames)}`
    default:
      break
  }

  if (mainNames.length === 1) {
    return cookingStyle === 'quick' ? `${first} מהיר` : first
  }

  if (cookingStyle === 'stew') {
    return `תבשיל ${joinHebrewList(mainNames)}`
  }

  if (cookingStyle === 'quick') {
    return `${joinHebrewList(mainNames)} — מהיר`
  }

  return `${first} עם ${second}`
}

export function isMoodBasedTitle(title) {
  const text = String(title ?? '').trim()
  if (!text) return true

  if (MOOD_TITLE_PATTERNS.some((pattern) => pattern.test(text))) return true

  const lower = text.toLowerCase()
  return FORBIDDEN_TITLE_WORDS.some((word) => {
    if (COOKING_STYLE_WORDS.has(word)) return false
    return lower.includes(word.toLowerCase())
  })
}

export function titleDescribesDish(title, ingredients = []) {
  const text = String(title ?? '').trim()
  if (!text || isMoodBasedTitle(text)) return false

  if (KNOWN_DISH_PREFIXES.some((prefix) => text.includes(prefix))) {
    return true
  }

  const mains = filterMainIngredients(ingredients)
  return mains.some((item) => ingredientAppearsInText(item, text))
}

/**
 * Replace mood/generic titles with an ingredient-based dish name.
 */
export function ensureDescriptiveDishTitle(title, ingredients = [], options = {}) {
  if (titleDescribesDish(title, ingredients)) {
    return String(title).trim()
  }

  return buildDescriptiveDishTitle(ingredients, options)
}

/**
 * @param {object} recipe
 * @param {object} [options]
 */
export function applyDescriptiveDishTitle(recipe, options = {}) {
  const name = ensureDescriptiveDishTitle(recipe.name, recipe.ingredients ?? [], {
    cookingTime: options.cookingTime,
    steps: recipe.steps ?? [],
    style: options.style,
    tags: recipe.tags ?? [],
    language: options.language ?? 'he',
  })

  return { ...recipe, name }
}

export function validateDishTitle(title, ingredients = []) {
  const descriptive = titleDescribesDish(title, ingredients)
  return {
    ok: descriptive,
    isMoodBased: isMoodBasedTitle(title),
    describesDish: descriptive,
  }
}
