import { UPGRADE_RECIPE_URL } from '../config/api'
import { buildLocalRecipeUpgrade, isValidRecipeUpgrade, sanitizeRecipeUpgrade } from '../utils/recipeUpgradeFallback'

/**
 * @param {{
 *   name: string
 *   description?: string
 *   ingredients?: string[]
 *   steps?: string[]
 *   category?: string
 *   recipeType?: string
 *   mood?: string
 *   cookingTime?: number
 *   isGlutenFree?: boolean
 *   language?: string
 * }} params
 */
export async function upgradeRecipe(params) {
  const payload = {
    name: params.name,
    description: params.description ?? '',
    ingredients: params.ingredients ?? [],
    steps: params.steps ?? [],
    category: params.category ?? 'parve',
    recipeType: params.recipeType ?? 'meal',
    mood: params.mood ?? 'cozy',
    cookingTime: params.cookingTime ?? 30,
    isGlutenFree: params.isGlutenFree ?? false,
    language: params.language ?? 'he',
  }

  console.log('upgrade request', payload)

  try {
    const response = await fetch(UPGRADE_RECIPE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    })

    const bodyText = await response.text()
    let data = null
    try {
      data = bodyText ? JSON.parse(bodyText) : null
    } catch (parseError) {
      console.warn('[recipeUpgradeService] JSON parse failed', parseError, bodyText?.slice(0, 200))
    }

    console.log('upgrade response', {
      status: response.status,
      ok: response.ok,
      dataOk: data?.ok,
      source: data?.source,
      error: data?.error,
      upgrade: data?.upgrade,
    })

    if (response.ok && data?.upgrade) {
      const upgrade = sanitizeRecipeUpgrade(data.upgrade, payload)
      if (isValidRecipeUpgrade(upgrade)) {
        return { upgrade, source: data.source ?? 'api' }
      }
    }

    console.warn('[recipeUpgradeService] API response unusable', {
      status: response.status,
      dataOk: data?.ok,
      error: data?.error,
    })
  } catch (error) {
    console.warn('[recipeUpgradeService] API request failed, using local fallback', error)
  }

  const upgrade = buildLocalRecipeUpgrade(payload)

  if (!isValidRecipeUpgrade(upgrade)) {
    throw new Error('Recipe upgrade failed')
  }

  console.log('upgrade response', { source: 'local', upgrade })
  return { upgrade, source: 'local' }
}
