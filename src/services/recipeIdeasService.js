import { MORE_RECIPE_IDEAS_URL } from '../config/api'

const FETCH_OPTIONS = {
  mode: 'cors',
  credentials: 'omit',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
}

/**
 * @param {Object} params
 * @param {string} params.category
 * @param {string} params.ingredients
 * @param {number} params.cookingTime
 * @param {string} params.mood
 * @param {boolean} params.isGlutenFree
 * @param {string} [params.excludeTitle]
 * @returns {Promise<{ ideas: Array<{ title: string, description: string, cookingTime: number, matchReason: string }>, source: string }>}
 */
export async function fetchMoreRecipeIdeas(params) {
  const response = await fetch(MORE_RECIPE_IDEAS_URL, {
    ...FETCH_OPTIONS,
    method: 'POST',
    body: JSON.stringify({
      category: params.category,
      ingredients: params.ingredients ?? '',
      cookingTime: params.cookingTime ?? 30,
      mood: params.mood ?? 'cozy',
      isGlutenFree: Boolean(params.isGlutenFree),
      excludeTitle: params.excludeTitle ?? '',
    }),
  })

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('INVALID_JSON')
  }

  if (!response.ok) {
    throw new Error(data?.detail || 'REQUEST_FAILED')
  }

  const ideas = Array.isArray(data.ideas) ? data.ideas : []
  return {
    ideas: ideas.filter(
      (idea) =>
        idea &&
        typeof idea.title === 'string' &&
        typeof idea.description === 'string' &&
        typeof idea.matchReason === 'string',
    ),
    source: data.source ?? 'fallback',
  }
}
