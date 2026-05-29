import { NUTRITION_ANALYSIS_URL } from '../config/api'
import { buildLocalNutritionAnalysis, recipeToNutritionPayload } from '../utils/nutritionCoach'

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
export async function fetchNutritionAnalysis(recipe) {
  try {
    const response = await fetch(NUTRITION_ANALYSIS_URL, {
      ...FETCH_OPTIONS,
      method: 'POST',
      body: JSON.stringify(recipeToNutritionPayload(recipe)),
    })

    let data
    try {
      data = await response.json()
    } catch {
      return buildLocalNutritionAnalysis(recipe)
    }

    if (!response.ok || !data?.macroLevels) {
      return buildLocalNutritionAnalysis(recipe)
    }

    return {
      macroLevels: data.macroLevels,
      insights: data.insights ?? {},
      nutritionScore: data.nutritionScore ?? buildLocalNutritionAnalysis(recipe).nutritionScore,
      tips: Array.isArray(data.tips) ? data.tips : [],
      source: data.source ?? 'fallback',
    }
  } catch {
    return buildLocalNutritionAnalysis(recipe)
  }
}
