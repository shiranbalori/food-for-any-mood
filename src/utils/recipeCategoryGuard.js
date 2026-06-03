/**
 * Kosher category validation — mirrors backend/recipe_quality.py
 *
 * Dairy: milk, cheese, yogurt, cream, butter.
 * Meat: meat, chicken, turkey, fish.
 * Parve: neither dairy nor meat.
 * Any: inferred from recipe after generation.
 */

const MEAT_PATTERNS = [
  /עוף/,
  /חזה\s*עוף/,
  /בשר/,
  /בקר/,
  /כבש/,
  /הודו/,
  /דג(?:ים)?/,
  /סלמון/,
  /טונה/,
  /נקניק/,
  /קבב/,
  /סטייק/,
  /chicken/i,
  /beef/i,
  /\bmeat\b/i,
  /steak/i,
  /turkey/i,
  /lamb/i,
  /pork/i,
  /\bfish\b/i,
  /salmon/i,
  /tuna/i,
  /ground beef/i,
]

const DAIRY_PATTERNS = [
  /חלב/,
  /גבינ/,
  /שמנת/,
  /חמאה/,
  /יוגורט/,
  /קוטג/,
  /\bmilk\b/i,
  /cheese/i,
  /cream/i,
  /butter/i,
  /yogurt/i,
  /ricotta/i,
  /parmesan/i,
  /cream cheese/i,
]

const DESSERT_TITLE_KEYWORDS = [
  'עוג',
  'קינוח',
  'מוס',
  'בראונ',
  'מאפין',
  'גלידה',
  'סורבה',
  'שוקולד',
  'קרם',
  'מתוק',
  'cake',
  'cookie',
  'brownie',
  'muffin',
  'dessert',
  'cheesecake',
  'chocolate',
  'pudding',
  'ice cream',
  'sorbet',
]

const DAIRY_DESSERT_SIGNALS = [
  'עוג',
  'קינוח',
  'עוגיות',
  'בראונ',
  'מאפין',
  'גבינ',
  'שוקולד',
  'קרם',
  'cake',
  'cookie',
  'brownie',
  'muffin',
  'cheese',
  'chocolate',
  'cream',
]

export const KOSHER_CATEGORIES = ['dairy', 'meat', 'parve']

export function isAnyCategory(category) {
  return category === 'any'
}

export function isInvalidRecipeSelection(recipeType, category) {
  return recipeType === 'dessert' && category === 'meat'
}

/**
 * Classify generated recipe as dairy / meat / parve from ingredients and steps.
 * Used when the user selected «ללא העדפה» (any).
 */
export function inferRecipeCategory(recipe) {
  const hasMeat = recipeHasMeat(recipe)
  const hasDairy = recipeHasDairy(recipe)
  if (hasMeat && !hasDairy) return 'meat'
  if (hasDairy && !hasMeat) return 'dairy'
  return 'parve'
}

/** Kosher category used for validation, tags, and UI after generation. */
export function resolveKosherCategory(selectedCategory, recipe) {
  if (!isAnyCategory(selectedCategory)) return selectedCategory
  return inferRecipeCategory(recipe)
}

function recipeTextBlob(recipe) {
  const parts = [
    recipe?.name ?? '',
    recipe?.description ?? '',
    ...(recipe?.ingredients ?? []),
    ...(recipe?.steps ?? []),
    ...(recipe?.tags ?? []),
  ]
  return parts.join(' ').toLowerCase()
}

export function recipeHasMeat(recipe) {
  const text = recipeTextBlob(recipe)
  return MEAT_PATTERNS.some((pattern) => pattern.test(text))
}

export function recipeHasDairy(recipe) {
  const text = recipeTextBlob(recipe)
  return DAIRY_PATTERNS.some((pattern) => pattern.test(text))
}

function titleHasDessertKeyword(title) {
  const text = String(title ?? '').toLowerCase()
  return DESSERT_TITLE_KEYWORDS.some((keyword) => text.includes(keyword))
}

function isDairyDessertValid(recipe) {
  if (recipeHasMeat(recipe)) return false
  if (!recipeHasDairy(recipe)) return false
  if (!titleHasDessertKeyword(recipe?.name)) return false
  const text = recipeTextBlob(recipe)
  return DAIRY_DESSERT_SIGNALS.some((signal) => text.includes(signal))
}

function isParveDessertValid(recipe) {
  if (recipeHasMeat(recipe) || recipeHasDairy(recipe)) return false
  return titleHasDessertKeyword(recipe?.name)
}

function isMeatMealValid(recipe) {
  if (recipeHasDairy(recipe)) return false
  if (!recipeHasMeat(recipe)) return false
  return !titleHasDessertKeyword(recipe?.name)
}

function isDairyMealValid(recipe) {
  if (recipeHasMeat(recipe)) return false
  if (!recipeHasDairy(recipe)) return false
  return !titleHasDessertKeyword(recipe?.name)
}

function isParveMealValid(recipe) {
  if (recipeHasMeat(recipe) || recipeHasDairy(recipe)) return false
  return !titleHasDessertKeyword(recipe?.name)
}

export function validateRecipeCategory(recipeType, category, recipe) {
  if (isInvalidRecipeSelection(recipeType, category)) return false

  const effectiveCategory = isAnyCategory(category) ? inferRecipeCategory(recipe) : category

  const tags = (recipe?.tags ?? []).map((tag) => String(tag).toLowerCase())
  if (tags.includes('vegetarian') && recipeHasMeat(recipe)) return false

  if (effectiveCategory === 'meat' && recipeHasDairy(recipe)) return false
  if (effectiveCategory === 'dairy' && recipeHasMeat(recipe)) return false
  if (effectiveCategory === 'parve' && (recipeHasMeat(recipe) || recipeHasDairy(recipe))) return false

  if (recipeType === 'dessert') {
    if (effectiveCategory === 'dairy') return isDairyDessertValid(recipe)
    if (effectiveCategory === 'parve') return isParveDessertValid(recipe)
    return false
  }

  if (recipeType === 'meal') {
    if (effectiveCategory === 'meat') return isMeatMealValid(recipe)
    if (effectiveCategory === 'dairy') return isDairyMealValid(recipe)
    if (effectiveCategory === 'parve') return isParveMealValid(recipe)
  }

  return true
}

export function logRecipeValidation({
  selectedRecipeType,
  selectedCategory,
  generatedTitle,
  validationPassed,
  fallbackUsed,
  recipeSource,
  skipReparse,
  selectedLanguage,
  recipeLanguageUsed,
}) {
  console.log('[aiRecipeService] selectedRecipeType:', selectedRecipeType)
  console.log('[aiRecipeService] selectedCategory:', selectedCategory)
  console.log('[aiRecipeService] generatedTitle:', generatedTitle)
  console.log('[aiRecipeService] validationPassed:', validationPassed)
  console.log('[aiRecipeService] fallbackUsed:', fallbackUsed)
  console.log('[aiRecipeService] recipeSource:', recipeSource ?? 'unknown')
  console.log('[aiRecipeService] skipReparse:', Boolean(skipReparse))
  if (fallbackUsed && validationPassed) {
    console.warn(
      '[aiRecipeService] fallbackUsed=true with validationPassed=true — this is a mock fallback recipe, not Gemini',
    )
  }
  if (selectedLanguage) {
    console.log('[aiRecipeService] selectedLanguage:', selectedLanguage)
  }
  if (recipeLanguageUsed) {
    console.log('[aiRecipeService] recipeLanguageUsed:', recipeLanguageUsed)
  }
}

export function getEffectiveRecipeType(recipeType, category) {
  if (isInvalidRecipeSelection(recipeType, category)) return 'meal'
  return recipeType
}
