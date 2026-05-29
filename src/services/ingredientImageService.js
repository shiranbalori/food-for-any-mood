import { ANALYZE_INGREDIENTS_IMAGE_URL } from '../config/api'

const FETCH_OPTIONS = {
  mode: 'cors',
  credentials: 'omit',
}

/**
 * @param {File} file
 * @returns {Promise<{ ingredients: string[], error: string | null }>}
 */
export async function analyzeIngredientsImage(file) {
  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch(ANALYZE_INGREDIENTS_IMAGE_URL, {
    ...FETCH_OPTIONS,
    method: 'POST',
    body: formData,
  })

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('INVALID_JSON')
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.detail || 'REQUEST_FAILED')
  }

  return {
    ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
    error: typeof data.error === 'string' ? data.error : null,
  }
}
