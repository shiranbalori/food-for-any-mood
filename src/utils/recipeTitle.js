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

const MOOD_TITLE_PATTERNS = [
  /^ארוח(?:ת|ה)\s+/,
  /ארוח(?:ת|ה)?\s+(?:נרות|נוחות|רגוע(?:ה|ים)?|שמ(?:ה|ים)|חמ(?:ה|ים)|מנח(?:ם|מת)|רומנטית?)/,
  /(?:ערב|בוקר|צהריים)\s+(?:רגוע|רומנטי|שמח|נעים|חמים|מיוחד)/,
  /(?:ווייב|וייב|וייב|vibe)/i,
  /^מנה\s+(?:נעימ(?:ה|ים)?|אנרגטית|רגועה|שמחה|מנחמת|מרגיעה|מיוחדת|מושלמת|חמ(?:ה|ימה))/,
  /^(?:cozy|comfort|energetic|adventurous|relaxed|happy|romantic|mood)\b/i,
  /(?:נוחות|רומנטי|מצב\s+רוח|good\s+vibes|atmosphere)/i,
  /^מנה\s+ע(?:ם|ל)\s+(?:מרכיבים|הכל)$/,
  /^(?:ערב|בוקר)\s+/,
]

const FORBIDDEN_TITLE_WORDS = [
  'נרות',
  'נוחות',
  'רומנטי',
  'ווייב',
  'וייב',
  'וייב',
  'vibe',
  'vibes',
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
  'מקושקש',
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
  'עוף',
  'בשר',
  'טונה',
  'פנקייק',
  'קוביות',
]

const GENERIC_DISH_TITLES = new Set([
  'תבשיל ביתי',
  'סלט ירקות טרי',
  'סלט טרי',
  'מנה מהירה',
  'מנה מהתנור',
  'מוקפץ ירקות',
  'עוף בתנור',
  'תבשיל בשר',
  'קארי ביתי',
  'פסטה ביתית',
  'פסטה מהירה',
  'אורז מוקפץ',
])

const QTY_PREFIX = /^[\d./]+\s*(?:כפית|כפיות|כף|כפות|גרם|מ"ל|כוס|כוסות|tsp|tbsp|gram|grams|g|ml|cup|cups)?\s*/i

function stripQtyPrefix(raw) {
  return String(raw ?? '')
    .replace(QTY_PREFIX, '')
    .trim()
}

function filterMainIngredients(ingredients = []) {
  return ingredients.filter((item) => {
    const canon = canonicalIngredient(stripQtyPrefix(item))
    return !canon || !STAPLE_CANONICAL.has(canon)
  })
}

function toDisplayLabels(ingredients, language = 'he') {
  return filterMainIngredients(ingredients).map((item) => {
    const bare = stripQtyPrefix(item)
    if (/[\u0590-\u05FF]/.test(bare) && !/[a-z]/i.test(bare)) return bare
    return getIngredientLabel(bare, language)
  })
}

function toMainCanon(ingredients) {
  return filterMainIngredients(ingredients)
    .map((item) => canonicalIngredient(stripQtyPrefix(item)))
    .filter(Boolean)
}

function hasDishNamePrefix(text) {
  return KNOWN_DISH_PREFIXES.some((prefix) => text.includes(prefix))
}

function inferCookingStyle({ cookingTime, steps = [], tags = [] } = {}) {
  const stepsText = steps.join(' ')

  if (/תנור|אפ(?:י|ה)/i.test(stepsText)) return 'baked'
  if (/מוקפץ|ווק/i.test(stepsText)) return 'stirFry'
  if (/מרק|ציר|בישול איטי|תבשיל/i.test(stepsText)) return 'stew'
  if (/סלט/i.test(stepsText)) return 'salad'
  if (/שקשוק|שקשק/i.test(stepsText)) return 'shakshuka'
  if (tags.includes('quick') || (cookingTime && cookingTime <= 25)) return 'quick'

  return null
}

function detectDishPattern(mainCanon) {
  const set = new Set(mainCanon)

  if (set.has('tomato') && (set.has('egg') || set.has('eggs'))) {
    return { type: 'tomatoEgg' }
  }
  if (set.has('pasta')) return { type: 'pasta' }
  if (set.has('egg') || set.has('eggs')) return { type: 'omelette' }
  if (set.has('rice')) return { type: 'rice' }
  if (set.has('tuna') && (set.has('egg') || set.has('eggs'))) return { type: 'tunaSalad' }
  if (set.has('tofu') || set.has('broccoli') || set.has('pepper')) return { type: 'stirFry' }
  if (set.has('lentils') || set.has('curry') || set.has('coconut milk')) return { type: 'curry' }
  if (set.has('chicken')) return { type: 'chicken' }
  if (set.has('beef') || set.has('steak') || set.has('lamb')) return { type: 'meat' }
  if (ingredientsSupportSaladTitle(mainCanon)) {
    return { type: 'salad' }
  }

  return { type: 'generic' }
}

function ingredientsSupportCurryTitle(mainCanon) {
  return mainCanon.some((item) => ['curry', 'lentils', 'coconut milk', 'coconut'].includes(item))
}

function ingredientsSupportSaladTitle(mainCanon) {
  const set = new Set(mainCanon)
  if (set.has('egg') || set.has('eggs')) return false
  if (set.has('cucumber') || set.has('avocado') || set.has('chickpeas')) return true
  return set.has('tomato') && set.has('cucumber')
}

function ingredientsSupportShakshukaTitle(mainCanon) {
  const set = new Set(mainCanon)
  return (
    set.has('tomato') &&
    (set.has('egg') || set.has('eggs')) &&
    set.has('onion')
  )
}

function buildTomatoEggTitle(mainCanon, cookingStyle, steps = []) {
  const stepsText = steps.join(' ')
  if (
    ingredientsSupportShakshukaTitle(mainCanon) ||
    /שקשוק|שקשק/i.test(stepsText) ||
    cookingStyle === 'shakshuka'
  ) {
    return 'שקשוקה מהירה'
  }
  return 'חביתת עגבניות'
}

function buildPastaTitle(mainCanon, cookingStyle) {
  const hasCream = mainCanon.includes('cream')
  const hasMushroom = mainCanon.includes('mushroom')

  if (hasCream && hasMushroom) return 'פסטה ברוטב שמנת ופטריות'
  if (hasCream) return 'פסטה ברוטב שמנת'
  return cookingStyle === 'quick' ? 'פסטה מהירה' : 'פסטה ביתית'
}

function buildOmeletteTitle(mainCanon) {
  if (mainCanon.includes('tomato')) return 'חביתת עגבניות'
  if (mainCanon.includes('spinach')) return 'חביתת תרד'
  if (mainCanon.includes('mushroom')) return 'חביתת פטריות'
  if (mainCanon.includes('cheese')) return 'חביתת גבינה'
  return 'חביתה'
}

function buildGenericDishTitle(mainCanon, cookingStyle, steps = []) {
  if (mainCanon.includes('tomato') && (mainCanon.includes('egg') || mainCanon.includes('eggs'))) {
    return buildTomatoEggTitle(mainCanon, cookingStyle, steps)
  }
  if (mainCanon.includes('pasta')) return buildPastaTitle(mainCanon, cookingStyle)
  if (mainCanon.includes('egg') || mainCanon.includes('eggs')) {
    return buildOmeletteTitle(mainCanon)
  }
  if (mainCanon.includes('chicken')) return 'עוף בתנור'
  if (mainCanon.includes('beef') || mainCanon.includes('steak') || mainCanon.includes('lamb')) {
    return 'תבשיל בשר'
  }
  if (cookingStyle === 'stirFry') return 'מוקפץ ירקות'
  if (cookingStyle === 'salad' && ingredientsSupportSaladTitle(mainCanon)) return 'סלט טרי'
  return 'תבשיל ביתי'
}

function isGenericDishTitle(title, ingredients = []) {
  const text = String(title ?? '').trim()
  if (!GENERIC_DISH_TITLES.has(text)) return false
  return toMainCanon(ingredients).length >= 1
}

function titleMatchesIngredients(title, ingredients = []) {
  const text = String(title ?? '').trim()
  const mainCanon = toMainCanon(ingredients)

  if (/סלט/i.test(text) && !ingredientsSupportSaladTitle(mainCanon)) return false
  if (/קארי|curry/i.test(text) && !ingredientsSupportCurryTitle(mainCanon)) return false
  if (/שקשוק/i.test(text) && !ingredientsSupportShakshukaTitle(mainCanon)) return false
  if (isGenericDishTitle(text, ingredients)) return false

  return true
}

/**
 * Detect titles that simply list ingredients instead of naming a dish.
 */
export function isLiteralIngredientTitle(title, ingredients = [], language = 'he') {
  const text = String(title ?? '').trim()
  if (!text || hasDishNamePrefix(text)) return false

  const labels = [...new Set(toDisplayLabels(ingredients, language))].filter(Boolean)
  if (labels.length === 0) return false

  if (labels.length >= 2) {
    const matched = labels.filter((label) => ingredientAppearsInText(label, text))
    if (matched.length >= 2) return true

    const [first, second] = labels
    if (text === `${first} עם ${second}` || text === `${first} ו${second}`) return true
  }

  if (labels.length === 1 && text === labels[0]) return true

  return false
}

/**
 * Build a natural Hebrew dish name from the actual ingredients.
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
  const mainNames = [...new Set(toDisplayLabels(ingredients, language))].slice(0, 4)
  const mainCanon = mainNames
    .map((name) => canonicalIngredient(stripQtyPrefix(name)))
    .filter(Boolean)
  const cookingStyle = inferCookingStyle({ cookingTime, steps, style, tags })
  const pattern = detectDishPattern(mainCanon)

  switch (pattern.type) {
    case 'tomatoEgg':
      return buildTomatoEggTitle(mainCanon, cookingStyle, steps)
    case 'pasta':
      return buildPastaTitle(mainCanon, cookingStyle)
    case 'rice':
      return mainCanon.includes('chicken') ? 'אורז עם עוף' : 'אורז מוקפץ'
    case 'omelette':
      return buildOmeletteTitle(mainCanon)
    case 'tunaSalad':
      return 'סלט טונה וביצים'
    case 'curry':
      if (!ingredientsSupportCurryTitle(mainCanon)) break
      if (mainCanon.includes('lentils')) return 'קארי עדשים'
      return 'קארי ביתי'
    case 'stirFry':
      return 'מוקפץ ירקות'
    case 'chicken':
      return 'עוף בתנור'
    case 'meat':
      return 'תבשיל בשר'
    case 'salad':
      return 'סלט ירקות טרי'
    default:
      break
  }

  return buildGenericDishTitle(mainCanon, cookingStyle, steps)
}

export function isMoodBasedTitle(title) {
  const text = String(title ?? '').trim()
  if (!text) return true

  if (MOOD_TITLE_PATTERNS.some((pattern) => pattern.test(text))) return true

  const lower = text.toLowerCase()
  return FORBIDDEN_TITLE_WORDS.some((word) => lower.includes(word.toLowerCase()))
}

export function titleDescribesDish(title, ingredients = [], language = 'he') {
  const text = String(title ?? '').trim()
  if (!text || isMoodBasedTitle(text) || isLiteralIngredientTitle(text, ingredients, language)) {
    return false
  }

  const mains = filterMainIngredients(ingredients)
  const mainCanon = mains.map((item) => canonicalIngredient(item)).filter(Boolean)

  if (/קארי|curry/i.test(text) && !ingredientsSupportCurryTitle(mainCanon)) {
    return false
  }

  if (isGenericDishTitle(text, ingredients)) {
    return false
  }

  if (hasDishNamePrefix(text)) return true

  if (mains.some((item) => ingredientAppearsInText(item, text))) {
    return true
  }

  return false
}

export function ensureDescriptiveDishTitle(title, ingredients = [], options = {}) {
  const language = options.language ?? 'he'

  if (
    isMoodBasedTitle(title) ||
    isLiteralIngredientTitle(title, ingredients, language) ||
    isGenericDishTitle(title, ingredients) ||
    !titleMatchesIngredients(title, ingredients) ||
    !titleDescribesDish(title, ingredients, language)
  ) {
    return buildDescriptiveDishTitle(ingredients, options)
  }

  return String(title).trim()
}

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

export function validateDishTitle(title, ingredients = [], language = 'he') {
  const descriptive = titleDescribesDish(title, ingredients, language)
  return {
    ok: descriptive,
    isMoodBased: isMoodBasedTitle(title),
    isLiteral: isLiteralIngredientTitle(title, ingredients, language),
    describesDish: descriptive,
  }
}
