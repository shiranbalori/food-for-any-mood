/**
 * Local nutrition analysis (mirrors backend/nutrition_coach.py fallback rules).
 */

const FIBER_KEYWORDS = [
  'ברוקולי', 'עדש', 'חומוס', 'קינוא', 'תרד', 'שיבולת', 'כוסמת', 'אפונה', 'שעועית',
  'ירק', 'סלט', 'כרוב', 'גזר', 'broccoli', 'lentil', 'chickpea', 'quinoa', 'spinach', 'oats', 'bean', 'vegetable',
]

const HEAVY_KEYWORDS = ['שמנת', 'חמאה', 'שמן', 'fried', 'cream', 'butter']

function perServing(value, servings) {
  return value / Math.max(1, servings)
}

function macroLevel(value, high, medium) {
  if (value >= high) return 'high'
  if (value >= medium) return 'medium'
  return 'low'
}

function estimateFiberLevel(ingredients, carbsPerServing) {
  const text = ingredients.join(' ').toLowerCase()
  const fiberHits = FIBER_KEYWORDS.filter((keyword) => text.includes(keyword)).length

  if (fiberHits >= 3 || (fiberHits >= 1 && carbsPerServing >= 40)) return 'high'
  if (fiberHits >= 1 || carbsPerServing >= 28) return 'medium'
  return 'low'
}

function buildInsights(recipe, { proteinPer, carbsPer, fatPer, caloriesPer }) {
  const ingredientText = (recipe.ingredients ?? []).join(' ').toLowerCase()
  const heavy = HEAVY_KEYWORDS.some((keyword) => ingredientText.includes(keyword))
  const spiceLevel = recipe.spiceLevel ?? 0

  return {
    suitableForDiet: caloriesPer <= 550 && fatPer <= 28 && !heavy,
    suitableForKids: spiceLevel <= 1 && fatPer <= 32,
    suitableForDinner: caloriesPer <= 700 && fatPer <= 38,
    suitableForPostWorkout: proteinPer >= 18 && carbsPer >= 25,
  }
}

export function calculateNutritionScore(recipe, fiberLevel, { proteinPer, fatPer, caloriesPer }) {
  let score = Number(recipe.healthScore ?? 70)

  if (proteinPer >= 20) score += 5
  else if (proteinPer < 10) score -= 4

  if (fiberLevel === 'high') score += 8
  else if (fiberLevel === 'medium') score += 4
  else score -= 2

  if (fatPer > 35) score -= 8
  else if (fatPer <= 18) score += 3

  if (caloriesPer > 650) score -= 10
  else if (caloriesPer <= 450) score += 4

  if ((recipe.spiceLevel ?? 0) >= 3) score -= 2

  return Math.min(100, Math.max(0, Math.round(score)))
}

function buildFallbackTips(recipe, macroLevels, insights) {
  const tips = []

  if (macroLevels.protein === 'low') {
    tips.push('כדאי להוסיף מקור חלבון — ביצה, טופו, עוף או קטנייה — לאיזון המנה.')
  } else if (insights.suitableForPostWorkout) {
    tips.push('שילוב חלבון ופחמימות במנה הזו מתאים לשיקום אחרי אימון.')
  }

  if (macroLevels.fiber === 'low') {
    tips.push('הוסיפו ירק עלה ירוק או קטנייה לצד המנה כדי להעלות סיבים תזונתיים.')
  } else if (macroLevels.fiber === 'high') {
    tips.push('המנה עשירה בירקות/קטניות — מצוין לשובע ולעיכול.')
  }

  if (macroLevels.fat === 'high') {
    tips.push('שימו לב לכמות השומן — אפשר להקטין שמן/חמאה בחצי לגרסה קלה יותר.')
  } else if (insights.suitableForDiet) {
    tips.push('המנה מאוזנת יחסית — מתאימה לשמירה על דיאטה עם מנות בינוניות.')
  }

  if (insights.suitableForKids && (recipe.spiceLevel ?? 0) <= 1) {
    tips.push('רמת התיבול עדינה — מתאימה גם לילדים.')
  }

  if (insights.suitableForDinner && tips.length < 3) {
    tips.push('מנה נוחה לערב — לא כבדה מדי וקלה לעיכול.')
  }

  if (tips.length === 0) {
    tips.push('הקפידו על מנות מגוונות עם ירקות, חלבון ומעט שומן איכותי.')
  }

  return tips.slice(0, 3)
}

export function buildLocalNutritionAnalysis(recipe) {
  const servings = Math.max(1, recipe.servings ?? 2)
  const proteinPer = perServing(recipe.protein ?? 0, servings)
  const carbsPer = perServing(recipe.carbs ?? 0, servings)
  const fatPer = perServing(recipe.fat ?? 0, servings)
  const caloriesPer = perServing(recipe.calories ?? 0, servings)

  const macroLevels = {
    protein: macroLevel(proteinPer, 25, 12),
    carbs: macroLevel(carbsPer, 50, 25),
    fat: macroLevel(fatPer, 25, 12),
    fiber: estimateFiberLevel(recipe.ingredients ?? [], carbsPer),
  }

  const insights = buildInsights(recipe, { proteinPer, carbsPer, fatPer, caloriesPer })
  const nutritionScore = calculateNutritionScore(recipe, macroLevels.fiber, {
    proteinPer,
    fatPer,
    caloriesPer,
  })

  return {
    macroLevels,
    insights,
    nutritionScore,
    tips: buildFallbackTips(recipe, macroLevels, insights),
    source: 'fallback',
  }
}

export function recipeToNutritionPayload(recipe) {
  return {
    name: recipe.name ?? '',
    ingredients: recipe.ingredients ?? [],
    calories: recipe.calories ?? 0,
    protein: recipe.protein ?? 0,
    carbs: recipe.carbs ?? 0,
    fat: recipe.fat ?? 0,
    servings: recipe.servings ?? 2,
    cookTime: recipe.cookTime ?? recipe.time ?? 30,
    spiceLevel: recipe.spiceLevel ?? 0,
    healthScore: recipe.healthScore ?? 70,
  }
}
