import { NUTRITION_ANALYSIS_URL } from '../config/api'
import { buildLocalNutritionAnalysis, recipeToNutritionPayload } from '../utils/nutritionCoach'
import { resolveRecipeNutritionScore } from '../utils/nutritionScore'

const FETCH_OPTIONS = {
  mode: 'cors',
  credentials: 'omit',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
}

/**
 * @param {object} recipe
 * @returns {Promise<{ macroLevels: object, insights: object, nutritionScore: number, tips: string[], source: string }>}
 */
export async function fetchNutritionAnalysis(recipe, language = 'he') {
  try {
    const response = await fetch(NUTRITION_ANALYSIS_URL, {
      ...FETCH_OPTIONS,
      method: 'POST',
      body: JSON.stringify(recipeToNutritionPayload(recipe, language)),
    })

    let data
    try {
      data = await response.json()
    } catch {
      return buildLocalNutritionAnalysis(recipe, language)
    }

    if (!response.ok || !data?.macroLevels) {
      return buildLocalNutritionAnalysis(recipe, language)
    }

    // Keep the backend's macro levels / insights / tips, but force the score,
    // classification, and explanation to the shared source of truth so the
    // Nutrition Score always matches the recipe card's Health Score.
    const { score, explanation } = resolveRecipeNutritionScore(recipe, language)
    return {
      macroLevels: data.macroLevels,
      insights: data.insights ?? {},
      nutritionScore: score,
      nutritionScoreExplanation: explanation,
      tips: Array.isArray(data.tips) ? data.tips : [],
      source: data.source ?? 'fallback',
    }
  } catch {
    return buildLocalNutritionAnalysis(recipe, language)
  }
}
