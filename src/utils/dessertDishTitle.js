import { getIngredientLabel } from '../data/ingredientLabels'
import { canonicalIngredient } from '../data/ingredientKnowledge'
import { ingredientAppearsInText } from './ingredientRelevance'

const QTY_PREFIX =
  /^[\d./]+\s*(?:כפ(?:ית|ות)|כ(?:ף|פות)|גרם|מ"ל|כוס(?:ות)?|tsp|tbsp|gram|grams|g|ml|cup|cups)?\s*/i

const DESSERT_STAPLE_CANONICAL = new Set([
  'salt',
  'pepper',
  'black pepper',
  'oil',
  'olive',
  'olive oil',
  'water',
  'sugar',
  'egg',
  'eggs',
  'cream',
  'butter',
  'flour',
  'milk',
  'baking powder',
])

const FLAVOR_PRIORITY = [
  'vanilla',
  'chocolate',
  'honey',
  'cinnamon',
  'lemon',
  'blueberries',
  'apple',
  'cheese',
  'coconut',
  'marshmallow',
  'strawberry',
  'banana',
  'orange',
  'coffee',
  'caramel',
  'peanut butter',
  'peanut',
]

export const DESSERT_STYLE_VARIANTS = [
  {
    id: 'baked_custard',
    category: 'baked_custard',
    method: 'baked',
    titleHe: (main) => `קרם ${main} אפוי`,
    titleEn: (main) => `Baked ${main} custard`,
  },
  {
    id: 'mousse',
    category: 'mousse',
    method: 'chilled',
    titleHe: (main) => `מוס ${main} קטיפתי`,
    titleEn: (main) => `${main} velvet mousse`,
  },
  {
    id: 'pudding',
    category: 'pudding',
    method: 'boiled',
    titleHe: (main) => `פודינג ${main} ביתי`,
    titleEn: (main) => `Homemade ${main} pudding`,
  },
  {
    id: 'cream',
    category: 'cream',
    method: 'chilled',
    titleHe: (main) => `קרם ${main} ביתי`,
    titleEn: (main) => `Homemade ${main} cream`,
  },
  {
    id: 'cups',
    category: 'cream',
    method: 'chilled',
    titleHe: (main) => `קינוח כוסות ${main}`,
    titleEn: (main) => `${main} dessert cups`,
  },
  {
    id: 'pancake',
    category: 'pancake',
    method: 'fried',
    titleHe: (main) => `פנקייק ${main}`,
    titleEn: (main) => `${main} pancakes`,
  },
]

function stripQtyPrefix(raw) {
  return String(raw ?? '')
    .replace(QTY_PREFIX, '')
    .trim()
}

function filterFlavorIngredients(ingredients = []) {
  return ingredients.filter((item) => {
    const canon = canonicalIngredient(stripQtyPrefix(item))
    return !canon || !DESSERT_STAPLE_CANONICAL.has(canon)
  })
}

function toDisplayLabel(item, language) {
  const bare = stripQtyPrefix(item)
  if (/[\u0590-\u05FF]/.test(bare) && !/[a-z]/i.test(bare)) return bare.replace(/\(.*?\)/g, '').trim()
  return getIngredientLabel(bare, language)
}

export function countTitleWords(title) {
  return String(title ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export function pickPrimaryFlavorLabel(ingredients = [], language = 'he') {
  const filtered = filterFlavorIngredients(ingredients)
  const canonList = filtered
    .map((item) => canonicalIngredient(stripQtyPrefix(item)))
    .filter(Boolean)

  for (const flavor of FLAVOR_PRIORITY) {
    if (canonList.includes(flavor)) {
      const source = filtered.find((item) => canonicalIngredient(stripQtyPrefix(item)) === flavor)
      if (source) return toDisplayLabel(source, language)
      return getIngredientLabel(flavor, language)
    }
  }

  const first = filtered[0]
  if (first) return toDisplayLabel(first, language)
  return language === 'he' ? 'וניל' : 'vanilla'
}

export function inferDefaultDessertStyleId(mainCanon = []) {
  const set = new Set(mainCanon)
  if (set.has('flour') && set.has('sugar')) return 'cream'
  if ((set.has('egg') || set.has('eggs')) && (set.has('cream') || set.has('milk'))) {
    return 'baked_custard'
  }
  if (set.has('cream')) return 'mousse'
  if (set.has('egg') || set.has('eggs')) return 'pudding'
  return 'pudding'
}

function normalizeTitle(title) {
  return String(title ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function isDuplicateDessertTitle(title, excludeTitles = []) {
  const normalized = normalizeTitle(title)
  return excludeTitles.some((item) => normalizeTitle(item) === normalized)
}

export function buildDessertDishTitle(
  ingredients = [],
  {
    language = 'he',
    styleId = null,
    excludeTitles = [],
    excludeCookingMethods = [],
    excludeDessertCategories = [],
  } = {},
) {
  const main = pickPrimaryFlavorLabel(ingredients, language)
  const mainCanon = filterFlavorIngredients(ingredients)
    .map((item) => canonicalIngredient(stripQtyPrefix(item)))
    .filter(Boolean)

  const preferredStyle = styleId ?? inferDefaultDessertStyleId(mainCanon)

  const available = DESSERT_STYLE_VARIANTS.filter((variant) => {
    const title = language === 'he' ? variant.titleHe(main) : variant.titleEn(main)
    if (isDuplicateDessertTitle(title, excludeTitles)) return false
    if (excludeCookingMethods.includes(variant.method)) return false
    if (excludeDessertCategories.includes(variant.category)) return false
    return true
  })

  const preferred =
    available.find((variant) => variant.id === preferredStyle) ??
    available[0] ??
    DESSERT_STYLE_VARIANTS.find((variant) => variant.id === preferredStyle) ??
    DESSERT_STYLE_VARIANTS[0]

  const name = language === 'he' ? preferred.titleHe(main) : preferred.titleEn(main)
  return {
    name,
    styleId: preferred.id,
    cookingMethod: preferred.method,
    dessertCategory: preferred.category,
    mainFlavor: main,
  }
}

export function pickAlternateDessertVariant(options = {}) {
  const {
    ingredients = [],
    language = 'he',
    cookingTime = 30,
    excludeTitles = [],
    excludeCookingMethods = [],
    excludeDessertCategories = [],
  } = options

  const mainCanon = filterFlavorIngredients(ingredients)
    .map((item) => canonicalIngredient(stripQtyPrefix(item)))
    .filter(Boolean)
  const defaultStyle = inferDefaultDessertStyleId(mainCanon)

  const stylesInOrder = [
    ...DESSERT_STYLE_VARIANTS.filter((variant) => variant.id !== defaultStyle),
    ...DESSERT_STYLE_VARIANTS.filter((variant) => variant.id === defaultStyle),
  ]

  for (const variant of stylesInOrder) {
    const built = buildDessertDishTitle(ingredients, {
      language,
      styleId: variant.id,
      excludeTitles,
      excludeCookingMethods,
      excludeDessertCategories,
    })
    if (!isDuplicateDessertTitle(built.name, excludeTitles)) {
      const mins = Math.min(cookingTime, Math.max(15, Math.round(cookingTime * 0.6)))
      return {
        ...built,
        mins,
        variant,
      }
    }
  }

  const fallback = buildDessertDishTitle(ingredients, { language })
  return {
    ...fallback,
    mins: Math.min(cookingTime, Math.max(15, Math.round(cookingTime * 0.6))),
    variant: DESSERT_STYLE_VARIANTS[0],
  }
}

export function isIngredientListTitle(title, ingredients = [], language = 'he') {
  const text = String(title ?? '').trim()
  if (!text) return true

  if (/^מתכון\s/i.test(text)) return true
  if (countTitleWords(text) > 4) return true

  const labels = [...new Set(filterFlavorIngredients(ingredients).map((item) => toDisplayLabel(item, language)))].filter(
    Boolean,
  )
  if (labels.length === 0) return false

  const matched = labels.filter((label) => ingredientAppearsInText(label, text))
  if (matched.length >= 2) return true

  if (/^קינוח\s/i.test(text) && !/^קינוח כוסות/i.test(text)) {
    const rest = text.replace(/^קינוח\s+/, '')
    if (countTitleWords(rest) >= 2 && matched.length >= 1) return true
  }

  if (labels.length >= 2) {
    const [first, second] = labels
    if (text === `${first} עם ${second}` || text === `${first} ו${second}`) return true
  }

  if (labels.length === 1 && text === labels[0]) return true

  return false
}
