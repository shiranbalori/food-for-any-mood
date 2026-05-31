import { canonicalIngredient, normalizeIngredient } from '../data/ingredientKnowledge'

const VEG_FRUIT_CANONICAL = new Set([
  'tomato',
  'potato',
  'carrot',
  'pepper',
  'spinach',
  'broccoli',
  'mushroom',
  'zucchini',
  'cucumber',
  'avocado',
  'kale',
  'blueberry',
  'blueberries',
  'strawberry',
  'strawberries',
  'corn',
  'lemon',
  'lime',
  'onion',
  'garlic',
])

const ULTRA_PROCESSED_HIGH = [
  'marshmallow',
  'marshmallows',
  'candy',
  'cookies',
  'cookie',
  'chips',
  'nutella',
  'snack',
  'מרשמלו',
  'סוכריות',
  'חטיף',
  'עוגיות',
]

const ULTRA_PROCESSED_MODERATE = ['sugar', 'flour', 'butter', 'cream', 'סוכר', 'קמח', 'חמאה', 'ממרח']

const SUGAR_GRAMS_BY_CANON = {
  sugar: 12,
  honey: 17,
  marshmallow: 18,
  marshmallows: 18,
  chocolate: 12,
  cookies: 10,
  cookie: 10,
  candy: 15,
}

const FIBER_GRAMS_BY_CANON = {
  broccoli: 2.5,
  lentils: 8,
  lentil: 8,
  chickpeas: 6,
  chickpea: 6,
  quinoa: 3,
  beans: 5,
  bean: 5,
  spinach: 2,
  kale: 2.5,
  carrot: 2,
  blueberry: 2,
  blueberries: 2,
  strawberry: 2,
  strawberries: 2,
  avocado: 3,
}

function textHits(text, keywords) {
  const normalized = normalizeIngredient(text)
  return keywords.some((keyword) => {
    const key = normalizeIngredient(keyword)
    return key && (normalized.includes(key) || key.includes(normalized))
  })
}

export function estimateSugarPerServing(ingredients, servings, carbsPerServing = 0) {
  const safeServings = Math.max(1, servings)
  let total = 0

  for (const item of ingredients ?? []) {
    const text = String(item)
    const canon = canonicalIngredient(text) || ''
    if (SUGAR_GRAMS_BY_CANON[canon]) {
      total += SUGAR_GRAMS_BY_CANON[canon]
    } else if (textHits(text, ['sugar', 'סוכר'])) total += 12
    else if (textHits(text, ['honey', 'דבש'])) total += 14
    else if (textHits(text, ['marshmallow', 'מרשמלו'])) total += 18
    else if (textHits(text, ['chocolate', 'שוקולד'])) total += 10
  }

  let estimated = total / safeServings
  if (estimated <= 0 && carbsPerServing >= 40) {
    estimated = carbsPerServing * 0.35
  }
  return Math.round(estimated * 10) / 10
}

export function estimateFiberPerServing(ingredients, servings) {
  const safeServings = Math.max(1, servings)
  let total = 0

  for (const item of ingredients ?? []) {
    const canon = canonicalIngredient(String(item)) || ''
    if (FIBER_GRAMS_BY_CANON[canon]) {
      total += FIBER_GRAMS_BY_CANON[canon]
    } else if (textHits(String(item), ['broccoli', 'lentil', 'chickpea', 'quinoa', 'spinach', 'bean', 'ברוקולי', 'עדש', 'חומוס', 'קינוא', 'תרד', 'שעועית'])) {
      total += 2
    } else if (textHits(String(item), ['carrot', 'tomato', 'pepper', 'cucumber', 'zucchini', 'גזר', 'עגבנ', 'פלפל', 'מלפפון', 'קישוא'])) {
      total += 1.5
    }
  }

  return Math.round((total / safeServings) * 10) / 10
}

export function isRichInVegetablesOrFruit(ingredients) {
  let hits = 0
  for (const item of ingredients ?? []) {
    const canon = canonicalIngredient(String(item)) || normalizeIngredient(String(item))
    if (
      VEG_FRUIT_CANONICAL.has(canon) ||
      /tomato|carrot|pepper|berry|apple|banana|onion|עגבנ|גזר|פלפל|תות|תפוח|בצל|ירק/.test(canon)
    ) {
      hits += 1
    }
  }
  return hits >= 2
}

export function detectUltraProcessedLevel(ingredients) {
  let highHits = 0
  let moderateHits = 0

  for (const item of ingredients ?? []) {
    const text = String(item)
    if (textHits(text, ULTRA_PROCESSED_HIGH)) highHits += 1
    if (textHits(text, ULTRA_PROCESSED_MODERATE)) moderateHits += 1
    if (/marshmallow|מרשמלו/i.test(text)) highHits += 2
    if (/חטיף|סוכריות|ממתק/.test(text)) highHits += 1
  }

  if (highHits >= 1) return 'high'
  if (moderateHits >= 2) return 'moderate'
  if (moderateHits === 1) return 'moderate'
  return null
}

const INDULGENT_DESSERT_KEYWORDS = [
  'marshmallow', 'marshmallows', 'pudding', 'cookie', 'cookies', 'candy', 'cream', 'sugar', 'honey',
  'chocolate', 'nutella', 'frosting', 'syrup', 'caramel',
  'מרשמלו', 'פuding', 'פודינג', 'עוג', 'סוכר', 'דבש', 'שוקולד', 'שמנת', 'סוכריות', 'ממתק', 'קרם', 'קינוח',
]

const DESSERT_NAME_PATTERN = /pudding|dessert|cookie|cake|mousse|parfait|panna|cotta|treat|sweet|fudge|קינוח|פuding|פודינג|עוג|מוס|קרם|מרשמלו|מתוק/i

function countSweetDessertSignals(text) {
  return INDULGENT_DESSERT_KEYWORDS.filter((keyword) => text.includes(keyword)).length
}

/**
 * Dessert-aware nutrition profile — indulgent sweets should not score as diet-friendly.
 */
export function analyzeDessertNutritionProfile({
  ingredients = [],
  name = '',
  recipeType,
  caloriesPerServing = 0,
  proteinPerServing = 0,
  sugarPerServing = 0,
  carbsPerServing = 0,
  ultraProcessedLevel = null,
}) {
  const text = `${name ?? ''} ${(ingredients ?? []).join(' ')}`.toLowerCase()
  const ultraLevel = ultraProcessedLevel ?? detectUltraProcessedLevel(ingredients)
  const sweetSignals = countSweetDessertSignals(text)

  const isDessert =
    recipeType === 'dessert' ||
    DESSERT_NAME_PATTERN.test(text) ||
    sweetSignals >= 2

  const hasIndulgentIngredient = sweetSignals >= 1 || ultraLevel === 'high'

  const isIndulgent =
    isDessert &&
    (hasIndulgentIngredient ||
      caloriesPerServing > 400 ||
      sugarPerServing > 20 ||
      carbsPerServing >= 50 ||
      ultraLevel === 'high')

  const isLightBalanced =
    isDessert &&
    caloriesPerServing <= 300 &&
    sugarPerServing <= 15 &&
    proteinPerServing >= 4 &&
    carbsPerServing < 45 &&
    ultraLevel !== 'high'

  return { isDessert, isIndulgent, isLightBalanced }
}

export function applyDessertNutritionCap(score, profile) {
  if (!profile?.isDessert) {
    return Math.min(100, Math.max(0, Math.round(score)))
  }

  let capped = score
  if (profile.isIndulgent && !profile.isLightBalanced) {
    capped = Math.min(capped, 70)
  } else if (!profile.isLightBalanced) {
    capped = Math.min(capped, 80)
  } else {
    capped = Math.min(capped, 85)
  }

  return Math.min(100, Math.max(0, Math.round(capped)))
}

export function calculateNutritionScore({
  caloriesPerServing,
  proteinPerServing,
  sugarPerServing,
  fiberPerServing,
  richInVegFruit = false,
  ultraProcessedLevel = null,
}) {
  let score = 100

  if (caloriesPerServing < 250) score += 10
  else if (caloriesPerServing <= 450) {
    // no change
  } else if (caloriesPerServing <= 650) score -= 10
  else score -= 20

  if (proteinPerServing > 20) score += 15
  else if (proteinPerServing >= 10) score += 5
  else score -= 10

  if (sugarPerServing < 10) score += 10
  else if (sugarPerServing <= 20) {
    // no change
  } else if (sugarPerServing <= 35) score -= 10
  else score -= 20

  if (fiberPerServing > 8) score += 10
  else if (fiberPerServing >= 4) score += 5

  if (richInVegFruit) score += 10

  if (ultraProcessedLevel === 'moderate') score -= 10
  else if (ultraProcessedLevel === 'high') score -= 20

  return Math.min(100, Math.max(0, Math.round(score)))
}

/** @typedef {'dietFriendly' | 'balancedHealthy' | 'moderatelyBalanced' | 'moderateTreat' | 'indulgent'} NutritionScoreClassId */

/** @type {{ id: NutritionScoreClassId, min: number, max: number, color: string }[]} */
export const NUTRITION_SCORE_CLASSIFICATIONS = [
  { id: 'dietFriendly', min: 90, max: 100, color: '#059669' },
  { id: 'balancedHealthy', min: 75, max: 89, color: '#10b981' },
  { id: 'moderatelyBalanced', min: 60, max: 74, color: '#d97706' },
  { id: 'moderateTreat', min: 40, max: 59, color: '#ea580c' },
  { id: 'indulgent', min: 0, max: 39, color: '#dc2626' },
]

/**
 * @param {number} score
 * @returns {{ id: NutritionScoreClassId, min: number, max: number, color: string }}
 */
export function getNutritionScoreClassification(score) {
  const safe = Math.min(100, Math.max(0, Math.round(Number(score) || 0)))
  return (
    NUTRITION_SCORE_CLASSIFICATIONS.find((band) => safe >= band.min && safe <= band.max) ??
    NUTRITION_SCORE_CLASSIFICATIONS[NUTRITION_SCORE_CLASSIFICATIONS.length - 1]
  )
}

export function getNutritionScoreColor(score) {
  return getNutritionScoreClassification(score).color
}

export function calculateHealthScoreFromRecipe({
  ingredients,
  calories,
  protein,
  carbs,
  servings,
  recipeType,
  name,
}) {
  const safeServings = Math.max(1, servings ?? 1)
  const caloriesPer = (calories ?? 0) / safeServings
  const proteinPer = (protein ?? 0) / safeServings
  const carbsPer = (carbs ?? 0) / safeServings
  const sugarPer = estimateSugarPerServing(ingredients, safeServings, carbsPer)
  const fiberPer = estimateFiberPerServing(ingredients, safeServings)
  const ultraProcessedLevel = detectUltraProcessedLevel(ingredients)

  const baseScore = calculateNutritionScore({
    caloriesPerServing: caloriesPer,
    proteinPerServing: proteinPer,
    sugarPerServing: sugarPer,
    fiberPerServing: fiberPer,
    richInVegFruit: isRichInVegetablesOrFruit(ingredients),
    ultraProcessedLevel,
  })

  const dessertProfile = analyzeDessertNutritionProfile({
    ingredients,
    name,
    recipeType,
    caloriesPerServing: caloriesPer,
    proteinPerServing: proteinPer,
    sugarPerServing: sugarPer,
    carbsPerServing: carbsPer,
    ultraProcessedLevel,
  })

  return applyDessertNutritionCap(baseScore, dessertProfile)
}

/** @deprecated Use calculateHealthScoreFromRecipe */
export function calculateNutritionScoreFromRecipe(recipe) {
  return calculateHealthScoreFromRecipe({
    ingredients: recipe.ingredients ?? [],
    calories: recipe.calories ?? recipe.nutrition?.calories ?? 0,
    protein: recipe.protein ?? recipe.nutrition?.protein ?? 0,
    carbs: recipe.carbs ?? recipe.nutrition?.carbs ?? 0,
    servings: recipe.servings ?? recipe.nutrition?.servings ?? 2,
  })
}

const NOTABLE_INGREDIENT_PATTERNS = [
  { pattern: /סוכר|sugar/i, he: 'סוכר', en: 'sugar' },
  { pattern: /מרשמלו|marshmallow/i, he: 'מרשמלו', en: 'marshmallows' },
  { pattern: /שוקולד|chocolate/i, he: 'שוקולד', en: 'chocolate' },
  { pattern: /דבש|honey/i, he: 'דבש', en: 'honey' },
  { pattern: /חמאה|butter/i, he: 'חמאה', en: 'butter' },
  { pattern: /קמח|flour/i, he: 'קמח', en: 'flour' },
  { pattern: /עוגיות|cookies?/i, he: 'עוגיות', en: 'cookies' },
  { pattern: /חטיף|snack|chips/i, he: 'חטיף', en: 'snack food' },
  { pattern: /קוקוס|coconut/i, he: 'קוקוס', en: 'coconut' },
  { pattern: /שמנת|cream/i, he: 'שמנת', en: 'cream' },
]

function extractNotableIngredientNames(ingredients, language = 'he') {
  const names = []
  for (const item of ingredients ?? []) {
    const text = String(item)
    for (const entry of NOTABLE_INGREDIENT_PATTERNS) {
      if (!entry.pattern.test(text)) continue
      const label = language === 'he' ? entry.he : entry.en
      if (!names.includes(label)) names.push(label)
    }
  }
  return names
}

function joinHebrewClauses(items) {
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} ו${items[1]}`
  return `${items.slice(0, -1).join(', ')} ו${items[items.length - 1]}`
}

function joinEnglishClauses(items) {
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function selectExplanationFactors(factors, score) {
  const sorted = [...factors].sort((a, b) => b.weight - a.weight)
  const neg = sorted.filter((f) => f.type === 'neg')
  const neu = sorted.filter((f) => f.type === 'neutral')
  const pos = sorted.filter((f) => f.type === 'pos')

  let picked = []
  if (score >= 85) picked = [...pos.slice(0, 2), ...neu.slice(0, 1)]
  else if (score >= 70) picked = [...neu.slice(0, 1), ...pos.slice(0, 1), ...neg.slice(0, 1)]
  else if (score >= 55) picked = [...neu.slice(0, 1), ...neg.slice(0, 2)]
  else picked = [...neg.slice(0, 3)]

  if (picked.length < 2) {
    const seen = new Set(picked)
    for (const factor of sorted) {
      if (picked.length >= 3) break
      if (!seen.has(factor)) {
        picked.push(factor)
        seen.add(factor)
      }
    }
  }

  return picked.slice(0, 3)
}

function composeScoreExplanation(score, items, language = 'he') {
  if (items.length === 0) {
    return language === 'he'
      ? `המתכון קיבל ציון ${score}.`
      : `This recipe scored ${score}/100.`
  }

  const texts = items.map((item) => item.text)

  if (language === 'he') {
    if (texts.length === 1) {
      return `המתכון קיבל ציון ${score} משום שהוא מכיל ${texts[0]}.`
    }
    const firstType = items[0].type
    const hasContrast = items.slice(1).some(
      (item) => (firstType === 'pos' || firstType === 'neutral') && item.type === 'neg',
    )
    const rest = joinHebrewClauses(texts.slice(1))
    if (hasContrast) {
      return `המתכון קיבל ציון ${score} משום שהוא מכיל ${texts[0]} אך גם ${rest}.`
    }
    return `המתכון קיבל ציון ${score} משום שהוא מכיל ${texts[0]} ו${rest}.`
  }

  if (texts.length === 1) {
    return `This recipe scored ${score}/100 because it contains ${texts[0]}.`
  }
  const firstType = items[0].type
  const hasContrast = items.slice(1).some(
    (item) => (firstType === 'pos' || firstType === 'neutral') && item.type === 'neg',
  )
  const rest = joinEnglishClauses(texts.slice(1))
  if (hasContrast) {
    return `This recipe scored ${score}/100 because it has ${texts[0]}, but also ${rest}.`
  }
  return `This recipe scored ${score}/100 because it has ${texts[0]} and ${rest}.`
}

/**
 * Recipe-specific nutrition score explanation citing actual macros and ingredients.
 */
export function buildNutritionScoreExplanation({
  score,
  ingredients = [],
  calories = 0,
  protein = 0,
  carbs = 0,
  servings = 2,
  language = 'he',
}) {
  const safeScore = Math.min(100, Math.max(0, Math.round(Number(score) || 0)))
  const safeServings = Math.max(1, servings ?? 1)
  const caloriesPer = (calories ?? 0) / safeServings
  const proteinPer = (protein ?? 0) / safeServings
  const carbsPer = (carbs ?? 0) / safeServings
  const sugarPer = estimateSugarPerServing(ingredients, safeServings, carbsPer)
  const fiberPer = estimateFiberPerServing(ingredients, safeServings)
  const richInVegFruit = isRichInVegetablesOrFruit(ingredients)
  const ultraLevel = detectUltraProcessedLevel(ingredients)
  const isHe = language === 'he'
  const factors = []

  if (caloriesPer < 250) {
    factors.push({ weight: 3, type: 'pos', text: isHe ? 'כמות נמוכה של קלוריות למנה' : 'a low calorie count per serving' })
  } else if (caloriesPer <= 450) {
    factors.push({ weight: 2, type: 'neutral', text: isHe ? 'כמות בינונית של קלוריות' : 'a moderate calorie count' })
  } else if (caloriesPer <= 650) {
    factors.push({ weight: 3, type: 'neg', text: isHe ? 'כמות גבוהה יחסית של קלוריות למנה' : 'a relatively high calorie count per serving' })
  } else {
    factors.push({ weight: 4, type: 'neg', text: isHe ? 'כמות קלוריות גבוהה למנה' : 'a high calorie count per serving' })
  }

  if (proteinPer > 20) {
    factors.push({ weight: 4, type: 'pos', text: isHe ? 'תוכן חלבון גבוה' : 'high protein content' })
  } else if (proteinPer >= 10) {
    factors.push({ weight: 2, type: 'neutral', text: isHe ? 'תוכן חלבון בינוני' : 'moderate protein content' })
  } else {
    factors.push({ weight: 3, type: 'neg', text: isHe ? 'תוכן חלבון נמוך' : 'low protein content' })
  }

  if (sugarPer < 10) {
    factors.push({ weight: 3, type: 'pos', text: isHe ? 'כמות נמוכה של סוכר' : 'low sugar content' })
  } else if (sugarPer <= 20) {
    factors.push({ weight: 2, type: 'neutral', text: isHe ? 'כמות בינונית של סוכר' : 'moderate sugar content' })
  } else if (sugarPer <= 35) {
    factors.push({ weight: 4, type: 'neg', text: isHe ? 'ריכוז גבוה יחסית של סוכר' : 'a relatively high sugar concentration' })
  } else {
    factors.push({ weight: 5, type: 'neg', text: isHe ? 'ריכוז גבוה מאוד של סוכר' : 'a very high sugar concentration' })
  }

  if (carbsPer >= 50) {
    factors.push({ weight: 4, type: 'neg', text: isHe ? 'ריכוז גבוה של פחמימות' : 'a high carbohydrate concentration' })
  } else if (carbsPer >= 35) {
    factors.push({ weight: 3, type: 'neg', text: isHe ? 'כמות בינונית-גבוהה של פחמימות' : 'moderately high carbohydrates' })
  } else if (carbsPer >= 25) {
    factors.push({ weight: 2, type: 'neutral', text: isHe ? 'כמות בינונית של פחמימות' : 'moderate carbohydrates' })
  } else if (carbsPer < 15) {
    factors.push({ weight: 2, type: 'pos', text: isHe ? 'כמות נמוכה של פחמימות' : 'low carbohydrates' })
  }

  if (fiberPer >= 4 || richInVegFruit) {
    factors.push({ weight: 4, type: 'pos', text: isHe ? 'עשיר בירקות, פירות או קטניות' : 'rich in vegetables, fruit, or legumes' })
  } else if (fiberPer >= 2) {
    factors.push({ weight: 2, type: 'pos', text: isHe ? 'מכיל מקורות לסיבים תזונתיים' : 'sources of dietary fiber' })
  }

  const notableNames = extractNotableIngredientNames(ingredients, language)
  if (ultraLevel === 'high' && notableNames.length) {
    const names = joinHebrewClauses(notableNames.slice(0, 3))
    factors.push({
      weight: 5,
      type: 'neg',
      text: isHe ? `מרכיבים מעובדים כמו ${names}` : `processed ingredients such as ${joinEnglishClauses(notableNames.slice(0, 3))}`,
    })
  } else if (ultraLevel === 'moderate' && notableNames.length) {
    const names = isHe
      ? joinHebrewClauses(notableNames.slice(0, 2))
      : joinEnglishClauses(notableNames.slice(0, 2))
    factors.push({
      weight: 3,
      type: 'neg',
      text: isHe ? `מרכיבים כמו ${names}` : `ingredients such as ${names}`,
    })
  }

  const selected = selectExplanationFactors(factors, safeScore)
  return composeScoreExplanation(safeScore, selected, language)
}

export function buildNutritionScoreExplanationFromRecipe(recipe, language = 'he') {
  const score = recipe.healthScore ?? calculateHealthScoreFromRecipe({
    ingredients: recipe.ingredients ?? [],
    calories: recipe.calories ?? recipe.nutrition?.calories ?? 0,
    protein: recipe.protein ?? recipe.nutrition?.protein ?? 0,
    carbs: recipe.carbs ?? recipe.nutrition?.carbs ?? 0,
    servings: recipe.servings ?? recipe.nutrition?.servings ?? 2,
    recipeType: recipe.recipeType,
    name: recipe.name,
  })

  return buildNutritionScoreExplanation({
    score,
    ingredients: recipe.ingredients ?? [],
    calories: recipe.calories ?? recipe.nutrition?.calories ?? 0,
    protein: recipe.protein ?? recipe.nutrition?.protein ?? 0,
    carbs: recipe.carbs ?? recipe.nutrition?.carbs ?? 0,
    servings: recipe.servings ?? recipe.nutrition?.servings ?? 2,
    language,
  })
}
