/**
 * Local nutrition analysis (mirrors backend/nutrition_coach.py fallback rules).
 */

import { calculateHealthScoreFromRecipe, buildNutritionScoreExplanation, getNutritionScoreClassification } from './nutritionScore'
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

  return {
    suitableForDiet: caloriesPer <= 550 && fatPer <= 28 && !heavy,
    suitableForKids: spiceLevel <= 1 && fatPer <= 32,
    suitableForDinner: caloriesPer <= 700 && fatPer <= 38,
    suitableForPostWorkout: proteinPer >= 18 && carbsPer >= 25,
  }
}

export function calculateNutritionScore(recipe, fiberLevel, { proteinPer, fatPer, caloriesPer }) {
  void fiberLevel
  void fatPer
  return calculateHealthScoreFromRecipe({
    ingredients: recipe.ingredients ?? [],
    calories: recipe.calories ?? 0,
    protein: recipe.protein ?? 0,
    carbs: recipe.carbs ?? 0,
    servings: recipe.servings ?? 2,
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
  const nutritionScoreExplanation = buildNutritionScoreExplanation({
    score: nutritionScore,
    ingredients: recipe.ingredients ?? [],
    calories: recipe.calories ?? 0,
    protein: recipe.protein ?? 0,
    carbs: recipe.carbs ?? 0,
    servings,
    language,
  })

  return {
    macroLevels,
    insights,
    nutritionScore,
    nutritionClassification: getNutritionScoreClassification(nutritionScore).id,
    nutritionScoreExplanation,
    tips: buildFallbackTips(recipe, macroLevels, insights, language),
    source: 'fallback',
  }
}

export function recipeToNutritionPayload(recipe, language = 'he') {
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
    language,
  }
}
