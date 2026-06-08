/**
 * Local nutrition analysis (mirrors backend/nutrition_coach.py fallback rules).
 */

import {
  analyzeDessertNutritionProfile,
  calculateHealthScoreFromRecipe,
  detectUltraProcessedLevel,
  estimateSugarPerServing,
  resolveRecipeNutritionScore,
} from './nutritionScore'
import { buildRecipeSpecificTips } from './recipeHealthTips'

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
  const sugarPer = estimateSugarPerServing(
    recipe.ingredients ?? [],
    recipe.servings ?? recipe.nutrition?.servings ?? 2,
    carbsPer,
  )
  const dessertProfile = analyzeDessertNutritionProfile({
    ingredients: recipe.ingredients ?? [],
    name: recipe.name ?? '',
    recipeType: recipe.recipeType,
    caloriesPerServing: caloriesPer,
    proteinPerServing: proteinPer,
    sugarPerServing: sugarPer,
    carbsPerServing: carbsPer,
    ultraProcessedLevel: detectUltraProcessedLevel(recipe.ingredients ?? []),
  })

  return {
    suitableForDiet:
      caloriesPer <= 500 &&
      fatPer <= 28 &&
      !heavy &&
      !dessertProfile.isIndulgent,
    suitableForKids: spiceLevel <= 1 && fatPer <= 32,
    suitableForDinner: caloriesPer <= 700 && fatPer <= 38,
    suitableForPostWorkout: proteinPer >= 18 && carbsPer >= 25,
  }
}

export function calculateNutritionScore(recipe, fiberLevel, { proteinPer, fatPer, caloriesPer }) {
  void fiberLevel
  void fatPer
  void proteinPer
  void caloriesPer
  return calculateHealthScoreFromRecipe({
    ingredients: recipe.ingredients ?? [],
    calories: recipe.calories ?? recipe.nutrition?.calories ?? 0,
    protein: recipe.protein ?? recipe.nutrition?.protein ?? 0,
    carbs: recipe.carbs ?? recipe.nutrition?.carbs ?? 0,
    fat: recipe.fat ?? recipe.nutrition?.fat ?? 0,
    servings: recipe.servings ?? recipe.nutrition?.servings ?? 2,
    recipeType: recipe.recipeType,
    name: recipe.name,
  })
}

function buildFallbackTips(recipe, macroLevels, _insights, language = 'he') {
  return buildRecipeSpecificTips({
    name: recipe.name ?? '',
    ingredients: recipe.ingredients ?? [],
    proteinLevel: macroLevels.protein,
    fatLevel: macroLevels.fat,
    fiberLevel: macroLevels.fiber,
    language,
  })
}

export function buildLocalNutritionAnalysis(recipe, language = 'he') {
  const servings = Math.max(1, recipe.servings ?? recipe.nutrition?.servings ?? 2)
  const proteinPer = perServing(recipe.protein ?? recipe.nutrition?.protein ?? 0, servings)
  const carbsPer = perServing(recipe.carbs ?? recipe.nutrition?.carbs ?? 0, servings)
  const fatPer = perServing(recipe.fat ?? recipe.nutrition?.fat ?? 0, servings)
  const caloriesPer = perServing(recipe.calories ?? recipe.nutrition?.calories ?? 0, servings)

  const macroLevels = {
    protein: macroLevel(proteinPer, 25, 12),
    carbs: macroLevel(carbsPer, 50, 25),
    fat: macroLevel(fatPer, 25, 12),
    fiber: estimateFiberLevel(recipe.ingredients ?? [], carbsPer),
  }

  const insights = buildInsights(recipe, { proteinPer, carbsPer, fatPer, caloriesPer })
  // Shared source of truth: the same score/classification/explanation the recipe
  // card shows, so Health Score and Nutrition Score never contradict each other.
  const {
    score: nutritionScore,
    classification: nutritionClassificationBand,
    explanation: nutritionScoreExplanation,
  } = resolveRecipeNutritionScore(recipe, language)

  let tips = buildFallbackTips(recipe, macroLevels, insights, language)
  if (caloriesPer > 500) {
    const highCalorieTip =
      language === 'he'
        ? `מנה זו עשירה מאוד (כ-${Math.round(caloriesPer)} קלוריות למנה) — מומלץ ליהנות ממנה במתינות, בפורציה קטנה.`
        : `This serving is very calorie-dense (~${Math.round(caloriesPer)} kcal) — enjoy a small portion in moderation.`
    tips = [highCalorieTip, ...tips.filter((tip) => tip !== highCalorieTip)].slice(0, 3)
  }

  return {
    macroLevels,
    insights,
    nutritionScore,
    nutritionClassification: nutritionClassificationBand.id,
    nutritionScoreExplanation,
    tips,
    source: 'fallback',
  }
}

export function recipeToNutritionPayload(recipe, language = 'he') {
  return {
    name: recipe.name ?? '',
    ingredients: recipe.ingredients ?? [],
    calories: recipe.calories ?? recipe.nutrition?.calories ?? 0,
    protein: recipe.protein ?? recipe.nutrition?.protein ?? 0,
    carbs: recipe.carbs ?? recipe.nutrition?.carbs ?? 0,
    fat: recipe.fat ?? recipe.nutrition?.fat ?? 0,
    servings: recipe.servings ?? recipe.nutrition?.servings ?? 2,
    cookTime: recipe.cookTime ?? recipe.time ?? 30,
    spiceLevel: recipe.spiceLevel ?? 0,
    healthScore: recipe.healthScore ?? 70,
    recipeType: recipe.recipeType ?? 'meal',
    language,
  }
}
