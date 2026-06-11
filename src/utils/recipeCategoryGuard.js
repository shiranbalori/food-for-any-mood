/**
 * Kosher category validation — mirrors backend/recipe_quality.py
 *
 * Dairy: milk, cheese, yogurt, cream, butter.
 * Meat: meat, chicken, turkey, fish.
 * Parve: neither dairy nor meat.
 * Vegan: no meat, dairy, eggs, honey, or animal products.
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

const EGG_PATTERNS = [/ביצ/, /\begg\b/i, /\beggs\b/i]

const HONEY_PATTERNS = [/דבש/, /\bhoney\b/i]

const ANIMAL_PRODUCT_PATTERNS = [
  /ג'לatin/i,
  /gelatin/i,
  /whey/i,
  /casein/i,
]

const SOUP_STEW_TITLE_SIGNALS = [
  'מרק',
  'תבשיל',
  'נזיד',
  'מרקון',
  "צ'ולנט",
  'cholent',
  'stew',
  'soup',
  'casserole',
  'chili',
  'curry',
  'one-pot',
  'pot',
  'broth',
  'bisque',
  'chowder',
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

export function isVeganCategory(category) {
  return category === 'vegan'
}

export function isInvalidRecipeSelection(recipeType, category) {
  return recipeType === 'dessert' && category === 'meat'
}

export function inferRecipeCategory(recipe) {
  const hasMeat = recipeHasMeat(recipe)
  const hasDairy = recipeHasDairy(recipe)
  if (hasMeat && !hasDairy) return 'meat'
  if (hasDairy && !hasMeat) return 'dairy'
  return 'parve'
}

export function resolveKosherCategory(selectedCategory, recipe) {
  if (isAnyCategory(selectedCategory)) return inferRecipeCategory(recipe)
  if (isVeganCategory(selectedCategory)) {
    return isVeganValid(recipe) ? 'parve' : inferRecipeCategory(recipe)
  }

  const inferred = inferRecipeCategory(recipe)
  if (selectedCategory === 'dairy' && recipeHasDairy(recipe) && !recipeHasMeat(recipe)) {
    return 'dairy'
  }
  if (selectedCategory === 'meat' && recipeHasMeat(recipe) && !recipeHasDairy(recipe)) {
    return 'meat'
  }
  if (selectedCategory === 'parve' && !recipeHasMeat(recipe) && !recipeHasDairy(recipe)) {
    return 'parve'
  }
  return inferred
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

export function recipeHasEggs(recipe) {
  const text = recipeTextBlob(recipe)
  return EGG_PATTERNS.some((pattern) => pattern.test(text))
}

export function recipeHasHoney(recipe) {
  const text = recipeTextBlob(recipe)
  return HONEY_PATTERNS.some((pattern) => pattern.test(text))
}

export function recipeHasAnimalProducts(recipe) {
  const text = recipeTextBlob(recipe)
  return ANIMAL_PRODUCT_PATTERNS.some((pattern) => pattern.test(text))
}

export function isVeganValid(recipe) {
  return (
    !recipeHasMeat(recipe) &&
    !recipeHasDairy(recipe) &&
    !recipeHasEggs(recipe) &&
    !recipeHasHoney(recipe) &&
    !recipeHasAnimalProducts(recipe)
  )
}

function titleHasDessertKeyword(title) {
  const text = String(title ?? '').toLowerCase()
  return DESSERT_TITLE_KEYWORDS.some((keyword) => text.includes(keyword))
}

function titleHasSoupStewKeyword(title) {
  const text = String(title ?? '').toLowerCase()
  return SOUP_STEW_TITLE_SIGNALS.some((keyword) => text.includes(keyword.toLowerCase()))
}

function textHasSoupStewSignal(recipe) {
  const text = recipeTextBlob(recipe)
  return SOUP_STEW_TITLE_SIGNALS.some((keyword) => text.includes(keyword.toLowerCase()))
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

function isVeganDessertValid(recipe) {
  if (!isVeganValid(recipe)) return false
  return isParveDessertValid(recipe)
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

function isVeganMealValid(recipe) {
  if (!isVeganValid(recipe)) return false
  return !titleHasDessertKeyword(recipe?.name)
}

function isSoupStewValid(recipe) {
  if (titleHasDessertKeyword(recipe?.name)) return false
  if (recipeHasMeat(recipe) && recipeHasDairy(recipe)) return false
  return titleHasSoupStewKeyword(recipe?.name) || textHasSoupStewSignal(recipe)
}

function validateCategoryRules(recipeType, effectiveCategory, selectedCategory, recipe) {
  if (selectedCategory === 'vegan' && !isVeganValid(recipe)) return false

  const tags = (recipe?.tags ?? []).map((tag) => String(tag).toLowerCase())
  if (tags.includes('vegetarian') && recipeHasMeat(recipe)) return false
  if (tags.includes('vegan') && !isVeganValid(recipe)) return false

  if (effectiveCategory === 'meat' && recipeHasDairy(recipe)) return false
  if (effectiveCategory === 'dairy' && recipeHasMeat(recipe)) return false
  if (effectiveCategory === 'parve' && (recipeHasMeat(recipe) || recipeHasDairy(recipe))) {
    if (selectedCategory !== 'vegan') return false
  }

  if (recipeType === 'dessert') {
    if (selectedCategory === 'vegan') return isVeganDessertValid(recipe)
    if (effectiveCategory === 'dairy') return isDairyDessertValid(recipe)
    if (effectiveCategory === 'parve') return isParveDessertValid(recipe)
    return false
  }

  if (recipeType === 'soup_stew') {
    if (!isSoupStewValid(recipe)) return false
    if (selectedCategory === 'vegan') return isVeganMealValid(recipe)
    if (effectiveCategory === 'meat') return isMeatMealValid(recipe)
    if (effectiveCategory === 'dairy') return isDairyMealValid(recipe)
    if (effectiveCategory === 'parve') return isParveMealValid(recipe)
    return false
  }

  if (recipeType === 'meal') {
    if (selectedCategory === 'vegan') return isVeganMealValid(recipe)
    if (effectiveCategory === 'meat') return isMeatMealValid(recipe)
    if (effectiveCategory === 'dairy') return isDairyMealValid(recipe)
    if (effectiveCategory === 'parve') return isParveMealValid(recipe)
  }

  return true
}

export function validateRecipeCategory(recipeType, category, recipe) {
  if (isInvalidRecipeSelection(recipeType, category)) return false
  const effectiveCategory = resolveKosherCategory(category, recipe)
  return validateCategoryRules(recipeType, effectiveCategory, category, recipe)
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
