/** Kosher category validation — mirrors backend/recipe_quality.py */

const MEAT_PATTERNS = [
  /עוף/,
  /חזה\s*עוף/,
  /כרע(?:יים)?/,
  /בשר/,
  /בקר/,
  /כבש/,
  /הודו/,
  /טורק/,
  /נקניק/,
  /קבב/,
  /סטייק/,
  /כבד/,
  /מרג(?:ז|ע)/,
  /צלי(?:ה|ת)?/,
]

const DAIRY_PATTERNS = [
  /חלב/,
  /גבינ/,
  /שמנת/,
  /חמאה/,
  /יוגורט/,
  /קוטג/,
  /מוצרל/,
  /פרמז/,
  /ריקוט/,
  /מסקרפונ/,
]

const DESSERT_TITLE_KEYWORDS = ['עוג', 'קינוח', 'מוס', 'בראונ', 'מאפין', 'גלידה', 'סורבה', 'שוקולד', 'קרם', 'מתוק']

export function isInvalidRecipeSelection(recipeType, category) {
  return recipeType === 'dessert' && category === 'meat'
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
  const signals = ['עוג', 'קינוח', 'עוגיות', 'בראונ', 'מאפין', 'גבינ', 'שוקולד', 'קרם']
  return signals.some((signal) => text.includes(signal))
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

  const tags = (recipe?.tags ?? []).map((tag) => String(tag).toLowerCase())
  if (tags.includes('vegetarian') && recipeHasMeat(recipe)) return false

  if (category === 'meat' && recipeHasDairy(recipe)) return false
  if (category === 'dairy' && recipeHasMeat(recipe)) return false
  if (category === 'parve' && (recipeHasMeat(recipe) || recipeHasDairy(recipe))) return false

  if (recipeType === 'dessert') {
    if (category === 'dairy') return isDairyDessertValid(recipe)
    if (category === 'parve') return isParveDessertValid(recipe)
    return false
  }

  if (recipeType === 'meal') {
    if (category === 'meat') return isMeatMealValid(recipe)
    if (category === 'dairy') return isDairyMealValid(recipe)
    if (category === 'parve') return isParveMealValid(recipe)
  }

  return true
}

export function logRecipeValidation({
  selectedRecipeType,
  selectedCategory,
  generatedTitle,
  validationPassed,
  fallbackUsed,
}) {
  console.log('[aiRecipeService] selectedRecipeType:', selectedRecipeType)
  console.log('[aiRecipeService] selectedCategory:', selectedCategory)
  console.log('[aiRecipeService] generatedTitle:', generatedTitle)
  console.log('[aiRecipeService] validationPassed:', validationPassed)
  console.log('[aiRecipeService] fallbackUsed:', fallbackUsed)
}

export function getEffectiveRecipeType(recipeType, category) {
  if (isInvalidRecipeSelection(recipeType, category)) return 'meal'
  return recipeType
}
