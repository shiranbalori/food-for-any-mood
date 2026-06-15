import { API_BASE_URL } from '../config/api'
import { buildAlternateStepsFromUserIngredients } from '../utils/alternateUserIngredientSteps'
import { lightSanitizeRecipeSteps } from '../utils/ingredientFormatting'
import { normalizeHebrewDisplayText } from '../utils/hebrewDisplayText'
import { naturalizeRecipeSteps } from '../utils/recipeStepWording'

const REGENERATE_STEPS_URL = `${API_BASE_URL}/regenerate-steps`

function stepsAreDifferent(previous, next) {
  if (!previous?.length || !next?.length) return true
  const a = previous.map((s) => String(s).trim()).join('|')
  const b = next.map((s) => String(s).trim()).join('|')
  return a !== b
}

/**
 * @param {{
 *   name: string
 *   ingredients: string[]
 *   currentSteps?: string[]
 *   language?: string
 *   cookingTime?: number
 *   recipeType?: string
 *   variationIndex?: number
 * }} params
 * @returns {Promise<{ steps: string[], source: 'gemini' | 'local' }>}
 */
export async function regenerateRecipeSteps({
  name,
  ingredients,
  currentSteps = [],
  language = 'he',
  cookingTime = 30,
  recipeType = 'meal',
  variationIndex = 0,
}) {
  const list = (ingredients ?? []).map((item) => String(item).trim()).filter(Boolean)
  if (!list.length) {
    console.error('[regenerateSteps] aborted: no ingredients')
    throw new Error('No ingredients to build steps from')
  }

  console.log('[regenerateSteps] request', {
    url: REGENERATE_STEPS_URL,
    name,
    ingredientCount: list.length,
    currentStepCount: currentSteps?.length ?? 0,
    variationIndex,
    recipeType,
    language,
    cookingTime,
  })

  try {
    const response = await fetch(REGENERATE_STEPS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name,
        ingredients: list,
        currentSteps: currentSteps ?? [],
        language,
        cookingTime,
        recipeType,
        variationIndex,
      }),
    })

    const bodyText = await response.text()
    let data = null
    try {
      data = bodyText ? JSON.parse(bodyText) : null
    } catch (parseErr) {
      console.warn('[regenerateSteps] JSON parse failed', parseErr, bodyText?.slice(0, 200))
    }

    console.log('[regenerateSteps] response', {
      status: response.status,
      ok: response.ok,
      stepsCount: data?.steps?.length,
      apiOk: data?.ok,
      error: data?.error,
    })

    if (response.ok && data?.ok !== false && Array.isArray(data?.steps) && data.steps.length >= 4) {
      const steps = data.steps
        .map((s) => normalizeHebrewDisplayText(String(s).trim(), language))
        .filter(Boolean)
      if (stepsAreDifferent(currentSteps, steps)) {
        console.log('[regenerateSteps] using API steps', { count: steps.length })
        return { steps, source: 'gemini' }
      }
      console.warn('[regenerateSteps] API returned same steps as current — trying local alternate')
    }
  } catch (error) {
    console.warn('[regenerateSteps] fetch failed', error)
  }

  let local = buildAlternateStepsFromUserIngredients(list, {
    recipeType,
    language,
    cookingTime,
    variationIndex,
  })
  local = lightSanitizeRecipeSteps(local)
  local = naturalizeRecipeSteps(local, list, language)
  local = local.map((step) => normalizeHebrewDisplayText(step, language))

  if (!stepsAreDifferent(currentSteps, local)) {
    local = buildAlternateStepsFromUserIngredients(list, {
      recipeType,
      language,
      cookingTime,
      variationIndex: variationIndex + 1,
    })
    local = naturalizeRecipeSteps(lightSanitizeRecipeSteps(local), list, language)
    local = local.map((step) => normalizeHebrewDisplayText(step, language))
  }

  if (local.length < 4) {
    console.error('[regenerateSteps] local alternate too short', local)
    throw new Error('Could not build alternate steps')
  }

  console.log('[regenerateSteps] using local alternate', {
    count: local.length,
    variationIndex,
    preview: local[0]?.slice(0, 60),
  })
  return { steps: local, source: 'local' }
}
