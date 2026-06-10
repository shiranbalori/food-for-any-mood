import {
  GENERATE_THEMED_MEAL_URL,
  UPGRADE_THEMED_MEAL_URL,
} from '../config/api'
import {
  buildLocalThemedMeal,
  buildLocalThemedMealUpgrade,
  isValidThemedMeal,
  sanitizeThemedMealUpgrade,
} from '../utils/themedMealFallback'
import { normalizeThemedMealContent } from '../utils/hebrewDisplayText'

async function parseJsonResponse(response) {
  const bodyText = await response.text()
  try {
    return bodyText ? JSON.parse(bodyText) : null
  } catch {
    throw new Error('Invalid themed meal response')
  }
}

/**
 * @param {{
 *   theme: string
 *   customTheme?: string
 *   category?: string
 *   isGlutenFree?: boolean
 *   language?: string
 * }} params
 */
export async function generateThemedMeal({
  theme,
  customTheme = '',
  category = 'parve',
  isGlutenFree = false,
  language = 'he',
}) {
  const requestBody = {
    theme,
    customTheme,
    category,
    isGlutenFree,
    language,
  }

  try {
    const response = await fetch(GENERATE_THEMED_MEAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(requestBody),
    })

    const data = await parseJsonResponse(response)

    if (response.ok && data?.ok !== false && isValidThemedMeal(data?.meal)) {
      return {
        meal: normalizeThemedMealContent(data.meal, language),
        source: data.source ?? 'api',
      }
    }

    console.warn('[themedMealService] API response unusable', {
      status: response.status,
      ok: data?.ok,
      error: data?.error,
    })
  } catch (error) {
    console.warn('[themedMealService] API request failed, using local fallback', error)
  }

  const meal = buildLocalThemedMeal({
    theme,
    customTheme,
    category,
    isGlutenFree,
  })

  if (!isValidThemedMeal(meal)) {
    throw new Error('Themed meal generation failed')
  }

  return { meal: normalizeThemedMealContent(meal, language), source: 'local' }
}

/**
 * @param {{
 *   theme: string
 *   customTheme?: string
 *   category?: string
 *   isGlutenFree?: boolean
 *   language?: string
 *   meal: object
 * }} params
 */
export async function upgradeThemedMeal({
  theme,
  customTheme = '',
  category = 'parve',
  isGlutenFree = false,
  language = 'he',
  meal,
}) {
  if (!isValidThemedMeal(meal)) {
    throw new Error('Invalid themed meal to upgrade')
  }

  const requestBody = {
    theme,
    customTheme,
    category,
    isGlutenFree,
    language,
    meal,
  }

  try {
    const response = await fetch(UPGRADE_THEMED_MEAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(requestBody),
    })

    const data = await parseJsonResponse(response)

    if (response.ok && data?.upgrade) {
      const upgrade = sanitizeThemedMealUpgrade(data.upgrade, meal, category, isGlutenFree, language)
      if (upgrade?.dishUpgrades?.length) {
        return { upgrade, source: data.source ?? 'api' }
      }
    }

    console.warn('[themedMealService] Upgrade API response unusable', {
      status: response.status,
      ok: data?.ok,
      error: data?.error,
    })
  } catch (error) {
    console.warn('[themedMealService] Upgrade API failed, using local fallback', error)
  }

  return {
    upgrade: buildLocalThemedMealUpgrade(meal, category, isGlutenFree, language),
    source: 'local',
  }
}
